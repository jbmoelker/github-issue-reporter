import type { BrowserContext } from '@github-issue-reporter/shared'

function parseBrowserInfo(): { browser: string; version: string } {
  const ua = navigator.userAgent
  if (ua.includes('Edg/')) {
    return { browser: 'Edge', version: ua.match(/Edg\/([\d.]+)/)?.[1] ?? 'unknown' }
  }
  if (ua.includes('Firefox/')) {
    return { browser: 'Firefox', version: ua.match(/Firefox\/([\d.]+)/)?.[1] ?? 'unknown' }
  }
  if (ua.includes('Chrome/')) {
    return { browser: 'Chrome', version: ua.match(/Chrome\/([\d.]+)/)?.[1] ?? 'unknown' }
  }
  if (ua.includes('Safari/')) {
    return { browser: 'Safari', version: ua.match(/Version\/([\d.]+)/)?.[1] ?? 'unknown' }
  }
  return { browser: 'Unknown', version: 'unknown' }
}

function parseOS(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  return 'Unknown'
}

export async function getBrowserContext(): Promise<BrowserContext> {
  const { browser, version } = parseBrowserInfo()

  let currentUrl: string | null = null
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    // Only include http/https — never chrome://, extension://, file://, etc.
    if (tab?.url && /^https?:\/\//.test(tab.url)) {
      currentUrl = tab.url
    }
  } catch {
    // tabs permission unavailable
  }

  return {
    url: currentUrl,
    browser,
    browserVersion: version,
    os: parseOS(),
    viewport: `${window.screen.width}×${window.screen.height}`,
  }
}

export function formatContextMarkdown(ctx: BrowserContext, includeUrl: boolean): string {
  const lines = [
    includeUrl && ctx.url ? `- **URL:** ${ctx.url}` : null,
    `- **Browser:** ${ctx.browser} ${ctx.browserVersion}`,
    `- **OS:** ${ctx.os}`,
    `- **Viewport:** ${ctx.viewport}`,
    `- **Reported via:** GitHub Issue Reporter extension`,
  ].filter((l): l is string => l !== null)

  return `<details>\n<summary>Environment</summary>\n\n${lines.join('\n')}\n</details>`
}
