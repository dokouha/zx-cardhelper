// GitHub Releases 自动更新检测服务
// 通过 GitHub Releases API 检测最新版本，与本地版本对比
// 配置：在下方 GITHUB_OWNER / GITHUB_REPO 填写你的 GitHub 仓库信息
import { Capacitor } from '@capacitor/core'
import { APP_VERSION } from '@/data/changelog'

/** GitHub 仓库配置 —— 发布时请修改为你的仓库 */
const GITHUB_OWNER = 'dokouha'
const GITHUB_REPO = 'zx-cardhelper'

/** 更新检测结果 */
export interface UpdateInfo {
  hasUpdate: boolean
  latestVersion: string      // 远端最新版本号（如 "1.67"）
  currentVersion: string     // 本地版本号
  notes: string[]            // 更新说明（按行拆分）
  downloadUrl: string        // 当前平台对应的下载链接
  releasePageUrl: string     // GitHub Release 页面地址
  publishedAt: string        // 发布日期
  checking: boolean          // 是否检查中
  error: string | null       // 检查失败的错误信息
}

const CACHE_KEY = 'zx-app-update-check-cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 小时缓存，避免频繁请求 GitHub API

/** 版本号对比：返回 true 表示 remote > local */
export function isNewerVersion(remote: string, local: string): boolean {
  const norm = (v: string) => v.replace(/^v/i, '').trim()
  const r = norm(remote).split('.').map(n => parseInt(n, 10) || 0)
  const l = norm(local).split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(r.length, l.length)
  for (let i = 0; i < len; i++) {
    const rn = r[i] ?? 0
    const ln = l[i] ?? 0
    if (rn > ln) return true
    if (rn < ln) return false
  }
  return false
}

/** 判断当前平台 */
function getPlatform(): 'android' | 'electron' | 'web' {
  if (typeof window !== 'undefined' && (window as any).electronAPi?.platform === 'electron') return 'electron'
  if (Capacitor.isNativePlatform()) return 'android'
  return 'web'
}

/**
 * 检查 GitHub Releases 最新版本
 * 失败时返回 hasUpdate=false + error 信息（静默处理，不阻塞用户）
 */
export async function checkForUpdate(force = false): Promise<UpdateInfo> {
  const base: UpdateInfo = {
    hasUpdate: false,
    latestVersion: APP_VERSION,
    currentVersion: APP_VERSION,
    notes: [],
    downloadUrl: '',
    releasePageUrl: '',
    publishedAt: '',
    checking: true,
    error: null,
  }

  // 未配置仓库时直接跳过
  if (!GITHUB_OWNER || !GITHUB_REPO) {
    return { ...base, checking: false, error: '未配置 GitHub 仓库' }
  }

  // 缓存：非强制检查且缓存未过期时直接使用
  if (!force) {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.ts < CACHE_TTL) {
          return { ...parsed.info, checking: false }
        }
      }
    } catch { /* ignore */ }
  }

  try {
    const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
    const res = await fetch(api, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'zx-cardhelper' },
    })
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`)
    const data = await res.json()
    const tag = (data.tag_name || '').replace(/^v/i, '')
    const hasUpdate = isNewerVersion(tag, APP_VERSION)

    const platform = getPlatform()
    // 平台对应的下载资产：Android 优先 .apk，Electron 优先 .exe/.zip
    const assets: Array<{ name: string; url: string }> = Array.isArray(data.assets)
      ? data.assets.map((a: any) => ({ name: a.name || '', url: a.browser_download_url || '' }))
      : []
    let downloadUrl = ''
    if (platform === 'android') {
      const apk = assets.find(a => a.name.endsWith('.apk'))
      downloadUrl = apk ? apk.url : (data.html_url || '')
    } else if (platform === 'electron') {
      const exe = assets.find(a => /\.exe$/.test(a.name))
      const zip = assets.find(a => /\.zip$/.test(a.name))
      downloadUrl = exe ? exe.url : (zip ? zip.url : (data.html_url || ''))
    } else {
      downloadUrl = data.html_url || ''
    }

    const info: UpdateInfo = {
      hasUpdate,
      latestVersion: tag || APP_VERSION,
      currentVersion: APP_VERSION,
      notes: typeof data.body === 'string' ? data.body.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean) : [],
      downloadUrl,
      releasePageUrl: data.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      publishedAt: data.published_at || '',
      checking: false,
      error: null,
    }

    // 写入缓存
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), info }))
    } catch { /* ignore */ }

    return info
  } catch (e) {
    return { ...base, checking: false, error: e instanceof Error ? e.message : String(e) }
  }
}