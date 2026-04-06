import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Canvas,
  IText,
  Rect,
  Line,
  Triangle,
  Group,
  Image as FabricImage,
  type TPointerEventInfo,
  type TPointerEvent,
} from 'fabric'
import {
  MousePointer2,
  Type,
  RectangleHorizontal,
  Blend,
  ArrowRight,
  Undo2,
  Redo2,
  Trash2,
} from 'lucide-react'
import { updateScreenshot, type StoredScreenshot } from '../lib/screenshots'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool = 'select' | 'text' | 'rectFilled' | 'rectOutlined' | 'rectBlur' | 'arrow'

interface Props {
  screenshot: StoredScreenshot
  screenshotIndex: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#64748b',
]

const BLUR_FILL = 'rgba(100,116,139,0.35)'

// Custom property key used to tag blur rects
const BLUR_RECT_KEY = '__blurRect'
const BLUR_AMOUNT_KEY = '__blurAmount'

// ---------------------------------------------------------------------------
// Filled rectangle icon (lucide has no built-in filled rect)
// ---------------------------------------------------------------------------

function FilledRectIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Arrow helper
// ---------------------------------------------------------------------------

function makeArrow(x1: number, y1: number, x2: number, y2: number, color: string): Group {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 16

  const line = new Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth: 3,
    selectable: false,
    evented: false,
  })

  const head = new Triangle({
    width: headLen,
    height: headLen,
    fill: color,
    left: x2,
    top: y2,
    angle: (angle * 180) / Math.PI + 90,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })

  return new Group([line, head], {
    selectable: true,
    evented: true,
    hasBorders: true,
    hasControls: true,
  })
}

// ---------------------------------------------------------------------------
// Flatten utility (applies real blur, returns data URL)
// ---------------------------------------------------------------------------

async function flattenCanvas(
  canvas: Canvas,
  originalDataUrl: string,
): Promise<string> {
  const blurRects = canvas.getObjects().filter(obj => (obj as any)[BLUR_RECT_KEY])

  if (blurRects.length === 0) {
    return canvas.toDataURL({ format: 'png', multiplier: 1 })
  }

  // Load the original image to sample blur regions from
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = originalDataUrl
  })

  // Compute how the image is rendered on the canvas (object-fit: contain)
  const scale = Math.min(canvas.width! / img.width, canvas.height! / img.height)
  const imgX = (canvas.width! - img.width * scale) / 2
  const imgY = (canvas.height! - img.height * scale) / 2

  // Build replacements: blur rect → blurred fabric.Image
  const replacements: Array<{ blurRect: any; blurImg: FabricImage; zIndex: number }> = []

  for (const blurRect of blurRects) {
    const r = blurRect as Rect
    const bAmount: number = (r as any)[BLUR_AMOUNT_KEY] ?? 10
    const left = r.left ?? 0
    const top = r.top ?? 0
    const w = (r.width ?? 0) * (r.scaleX ?? 1)
    const h = (r.height ?? 0) * (r.scaleY ?? 1)

    // Sample original image at this region
    const sc = document.createElement('canvas')
    sc.width = Math.max(1, w)
    sc.height = Math.max(1, h)
    const sctx = sc.getContext('2d')!
    // Source coords in original image space
    const srcX = (left - imgX) / scale
    const srcY = (top - imgY) / scale
    const srcW = w / scale
    const srcH = h / scale
    sctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, w, h)

    // Apply blur on a second canvas (re-drawing with filter)
    const bc = document.createElement('canvas')
    bc.width = sc.width
    bc.height = sc.height
    const bctx = bc.getContext('2d')!
    bctx.filter = `blur(${bAmount}px)`
    bctx.drawImage(sc, 0, 0)

    const blurImg = await FabricImage.fromURL(bc.toDataURL())
    blurImg.set({ left, top, selectable: false, evented: false })

    const zIndex = canvas.getObjects().indexOf(r)
    replacements.push({ blurRect: r, blurImg, zIndex })
  }

  // Swap blur rects for blurred images (in-place, preserving z-order)
  for (const { blurRect, blurImg, zIndex } of replacements) {
    canvas.remove(blurRect)
    canvas.insertAt(zIndex, blurImg)
  }
  canvas.renderAll()

  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 })

  // Restore blur rects
  for (const { blurRect, blurImg, zIndex } of replacements) {
    canvas.remove(blurImg)
    canvas.insertAt(zIndex, blurRect)
  }
  canvas.renderAll()

  return dataUrl
}

// ---------------------------------------------------------------------------
// Reopen reporter popup
// ---------------------------------------------------------------------------

async function reopenReporter() {
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] })
    if (win?.id != null) {
      await chrome.action.openPopup({ windowId: win.id })
    }
  } catch {
    // openPopup may not be available; user can click the extension icon
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnotationEditor({ screenshot, screenshotIndex }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(COLORS[2]) // red default
  const [blurAmount, setBlurAmount] = useState(10)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [saving, setSaving] = useState(false)

  // Track whether we're mid-draw (to suppress history snapshots during drag)
  const isDrawingRef = useRef(false)
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const drawObjectRef = useRef<any | null>(null)

  // Keep tool ref so event handlers (closed over at mount) see current tool
  const toolRef = useRef<Tool>(tool)
  const colorRef = useRef<string>(color)
  const blurAmountRef = useRef<number>(blurAmount)
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { blurAmountRef.current = blurAmount }, [blurAmount])

  // -------------------------------------------------------------------------
  // History helpers
  // -------------------------------------------------------------------------

  const snapshot = useCallback((canvas: Canvas) => {
    const json = canvas.toJSON()
    // Strip the background image from history snapshots (it's large)
    delete json.backgroundImage
    const str = JSON.stringify(json)
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      return [...trimmed, str]
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const restoreSnapshot = useCallback(async (canvas: Canvas, jsonStr: string) => {
    const json = JSON.parse(jsonStr)
    await canvas.loadFromJSON(json)
    // Re-add background image since we stripped it
    await loadBackground(canvas, screenshot.original)
    canvas.renderAll()
  }, [screenshot.original])

  // -------------------------------------------------------------------------
  // Background image loader
  // -------------------------------------------------------------------------

  async function loadBackground(canvas: Canvas, dataUrl: string) {
    const el = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = dataUrl
    })
    const scale = Math.min(canvas.width! / el.width, canvas.height! / el.height)
    const fabricImg = new FabricImage(el, {
      left: (canvas.width! - el.width * scale) / 2,
      top: (canvas.height! - el.height * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
    })
    canvas.backgroundImage = fabricImg
    canvas.renderAll()
  }

  // -------------------------------------------------------------------------
  // Canvas initialisation
  // -------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current
    const el = canvasElRef.current
    if (!el || !container) return

    const w = container.clientWidth
    const h = container.clientHeight

    const canvas = new Canvas(el, {
      width: w,
      height: h,
      selection: true,
      backgroundColor: '#1e1e1e',
    })
    canvasRef.current = canvas

    // Load background + optional saved annotations
    const init = async () => {
      if (screenshot.fabricJson) {
        await canvas.loadFromJSON(screenshot.fabricJson)
      }
      await loadBackground(canvas, screenshot.original)
      canvas.renderAll()

      // Seed history with initial state
      const json = canvas.toJSON()
      delete json.backgroundImage
      const str = JSON.stringify(json)
      setHistory([str])
      setHistoryIndex(0)
    }
    init()

    // ----- Mouse event handlers -----

    canvas.on('mouse:down', (opt: TPointerEventInfo<TPointerEvent>) => {
      const t = toolRef.current
      if (t === 'select') return

      const pointer = canvas.getScenePoint(opt.e)
      isDrawingRef.current = true
      drawStartRef.current = { x: pointer.x, y: pointer.y }

      if (t === 'text') {
        const text = new IText('Text', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: colorRef.current,
          editable: true,
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        isDrawingRef.current = false
        drawStartRef.current = null
        // Switch to select so next click doesn't create another text box
        setTool('select')
        return
      }

      // Start a temporary shape for rect / arrow
      const x = pointer.x
      const y = pointer.y

      if (t === 'rectFilled') {
        const rect = new Rect({ left: x, top: y, width: 0, height: 0, fill: colorRef.current, selectable: false })
        canvas.add(rect)
        drawObjectRef.current = rect
      } else if (t === 'rectOutlined') {
        const rect = new Rect({ left: x, top: y, width: 0, height: 0, fill: 'transparent', stroke: colorRef.current, strokeWidth: 2, selectable: false })
        canvas.add(rect)
        drawObjectRef.current = rect
      } else if (t === 'rectBlur') {
        const rect = new Rect({
          left: x, top: y, width: 0, height: 0,
          fill: BLUR_FILL,
          stroke: 'rgba(255,255,255,0.4)',
          strokeWidth: 1,
          strokeDashArray: [6, 4],
          selectable: false,
        }) as any
        rect[BLUR_RECT_KEY] = true
        rect[BLUR_AMOUNT_KEY] = blurAmountRef.current
        canvas.add(rect)
        drawObjectRef.current = rect
      } else if (t === 'arrow') {
        const arrow = makeArrow(x, y, x, y, colorRef.current)
        canvas.add(arrow)
        drawObjectRef.current = arrow
      }
    })

    canvas.on('mouse:move', (opt: TPointerEventInfo<TPointerEvent>) => {
      if (!isDrawingRef.current || !drawStartRef.current || !drawObjectRef.current) return
      const pointer = canvas.getScenePoint(opt.e)
      const { x: sx, y: sy } = drawStartRef.current
      const obj = drawObjectRef.current

      const t = toolRef.current

      if (t === 'rectFilled' || t === 'rectOutlined' || t === 'rectBlur') {
        const x = Math.min(sx, pointer.x)
        const y = Math.min(sy, pointer.y)
        const w = Math.abs(pointer.x - sx)
        const h = Math.abs(pointer.y - sy)
        obj.set({ left: x, top: y, width: w, height: h })
      } else if (t === 'arrow') {
        const arrow = makeArrow(sx, sy, pointer.x, pointer.y, colorRef.current)
        canvas.remove(obj)
        canvas.add(arrow)
        drawObjectRef.current = arrow
      }

      canvas.renderAll()
    })

    canvas.on('mouse:up', () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false

      const obj = drawObjectRef.current
      drawObjectRef.current = null
      drawStartRef.current = null

      if (obj) {
        // Discard tiny accidental clicks
        const isRect = obj instanceof Rect || obj.type === 'rect'
        const isGroup = obj instanceof Group
        const tooSmall = isRect
          ? ((obj as Rect).width ?? 0) < 4 || ((obj as Rect).height ?? 0) < 4
          : isGroup
            ? false
            : false
        if (tooSmall) { canvas.remove(obj); return }
        obj.set({ selectable: true, evented: true })
        canvas.setActiveObject(obj)
        // Switch to select so the user can immediately manipulate the new shape
        setTool('select')
      }

      canvas.renderAll()
      snapshot(canvas)
    })

    // Snapshot after editing text, moving, resizing
    canvas.on('text:editing:exited', () => snapshot(canvas))
    canvas.on('object:modified', () => snapshot(canvas))
    canvas.on('object:removed', (e) => {
      // Only snapshot for user-initiated removals, not our own flatten swap
      if ((e.target as any)?.__flattening) return
      snapshot(canvas)
    })

    // Delete key
    const handleKey = (e: KeyboardEvent) => {
      const active = canvas.getActiveObject()
      if ((e.key === 'Delete' || e.key === 'Backspace') && active && !(active instanceof IText && (active as IText).isEditing)) {
        canvas.remove(active)
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      canvas.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch Fabric selection mode when tool changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.isDrawingMode = false
    canvas.selection = tool === 'select'
    canvas.getObjects().forEach(o => {
      if (!(o as any)[BLUR_RECT_KEY] || tool !== 'rectBlur') {
        o.selectable = tool === 'select'
        o.evented = tool === 'select'
      }
    })
    canvas.defaultCursor = tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair'
    canvas.renderAll()
  }, [tool])

  // -------------------------------------------------------------------------
  // Undo / redo
  // -------------------------------------------------------------------------

  async function undo() {
    const canvas = canvasRef.current
    if (!canvas || historyIndex <= 0) return
    const next = historyIndex - 1
    await restoreSnapshot(canvas, history[next])
    setHistoryIndex(next)
  }

  async function redo() {
    const canvas = canvasRef.current
    if (!canvas || historyIndex >= history.length - 1) return
    const next = historyIndex + 1
    await restoreSnapshot(canvas, history[next])
    setHistoryIndex(next)
  }

  // Ctrl+Z / Ctrl+Y keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // -------------------------------------------------------------------------
  // Color palette: update selected object's color
  // -------------------------------------------------------------------------

  function applyColor(c: string) {
    setColor(c)
    colorRef.current = c
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()
    if (!active || (active as any)[BLUR_RECT_KEY]) return

    if (active instanceof IText) {
      active.set({ fill: c })
    } else if (active instanceof Rect) {
      // Filled rect has a non-transparent fill; outlined rect uses stroke
      if (active.fill && active.fill !== 'transparent') {
        active.set({ fill: c })
      } else {
        active.set({ stroke: c })
      }
    } else if (active instanceof Group) {
      // Arrow group: update line stroke + triangle fill
      active.getObjects().forEach(o => {
        if (o instanceof Line) o.set({ stroke: c })
        if (o instanceof Triangle) o.set({ fill: c })
      })
    }
    canvas!.renderAll()
    snapshot(canvas!)
  }

  // -------------------------------------------------------------------------
  // Done / Cancel
  // -------------------------------------------------------------------------

  async function handleDone() {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    try {
      const annotated = await flattenCanvas(canvas, screenshot.original)
      const fabricJson = (() => {
        const json = canvas.toJSON()
        delete json.backgroundImage
        return json
      })()
      await updateScreenshot(screenshotIndex, { annotated, fabricJson })
      await reopenReporter()
      window.close()
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    await reopenReporter()
    window.close()
  }

  function deleteSelected() {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active) {
      canvas.remove(active)
      canvas.discardActiveObject()
      canvas.renderAll()
    }
  }

  // -------------------------------------------------------------------------
  // Toolbar config
  // -------------------------------------------------------------------------

  const tools: Array<{ id: Tool; icon: React.ReactNode; label: string }> = [
    { id: 'select',      icon: <MousePointer2 className="w-4 h-4" />, label: 'Select' },
    { id: 'text',        icon: <Type className="w-4 h-4" />,          label: 'Text' },
    { id: 'rectFilled',  icon: <FilledRectIcon />,                    label: 'Filled rectangle' },
    { id: 'rectOutlined',icon: <RectangleHorizontal className="w-4 h-4" />, label: 'Outlined rectangle' },
    { id: 'rectBlur',    icon: <Blend className="w-4 h-4" />,         label: 'Blur rectangle' },
    { id: 'arrow',       icon: <ArrowRight className="w-4 h-4" />,    label: 'Arrow' },
  ]

  // Show color palette for all tools except blur (color doesn't apply to blur rects)
  const showColor = tool !== 'rectBlur'
  const showBlur = tool === 'rectBlur'

  const btnBase = 'flex items-center justify-center w-8 h-8 rounded transition-colors'
  const btnActive = 'bg-white text-gray-900'
  const btnInactive = 'text-gray-400 hover:text-white hover:bg-gray-700'

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-gray-900 select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0 flex-wrap">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
          {tools.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className={`${btnBase} ${tool === id ? btnActive : btnInactive}`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Color palette */}
        {showColor && (
          <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => applyColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'white' : 'transparent',
                }}
              />
            ))}
          </div>
        )}

        {/* Blur slider */}
        {showBlur && (
          <div className="flex items-center gap-2 pr-2 border-r border-gray-700">
            <label htmlFor="blur-slider" className="text-xs text-gray-400 whitespace-nowrap">
              Blur
            </label>
            <input
              id="blur-slider"
              type="range"
              min={2}
              max={30}
              value={blurAmount}
              onChange={e => {
                const v = Number(e.target.value)
                setBlurAmount(v)
                blurAmountRef.current = v
                // Update any selected blur rect live
                const canvas = canvasRef.current
                const active = canvas?.getActiveObject() as any
                if (active?.[BLUR_RECT_KEY]) {
                  active[BLUR_AMOUNT_KEY] = v
                }
              }}
              className="w-24 accent-white"
            />
            <span className="text-xs text-gray-400 w-5">{blurAmount}</span>
          </div>
        )}

        {/* Undo / redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            disabled={historyIndex <= 0}
            onClick={undo}
            className={`${btnBase} ${historyIndex <= 0 ? 'text-gray-600 cursor-not-allowed' : btnInactive}`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            disabled={historyIndex >= history.length - 1}
            onClick={redo}
            className={`${btnBase} ${historyIndex >= history.length - 1 ? 'text-gray-600 cursor-not-allowed' : btnInactive}`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Delete */}
        <div className="pr-2 border-r border-gray-700">
          <button
            type="button"
            title="Delete selected"
            aria-label="Delete selected"
            onClick={deleteSelected}
            className={`${btnBase} ${btnInactive}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cancel / Done */}
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          disabled={saving}
          className="px-3 py-1.5 text-sm rounded bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Saving…' : 'Done'}
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
