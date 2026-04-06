import { useEffect, useState } from 'react'
import { AnnotationEditor } from '../components/AnnotationEditor'
import { getScreenshots, type StoredScreenshot } from '../lib/screenshots'
import '../style.css'

export default function AnnotationPage() {
  const [screenshot, setScreenshot] = useState<StoredScreenshot | null>(null)
  const [index, setIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idx = parseInt(params.get('index') ?? '', 10)
    if (isNaN(idx)) {
      setError('No screenshot index provided.')
      return
    }
    setIndex(idx)
    getScreenshots().then(screenshots => {
      if (idx < 0 || idx >= screenshots.length) {
        setError('Screenshot not found.')
        return
      }
      setScreenshot(screenshots[idx])
    })
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-sm">{error}</div>
    )
  }

  if (!screenshot || index === null) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  return <AnnotationEditor screenshot={screenshot} screenshotIndex={index} />
}
