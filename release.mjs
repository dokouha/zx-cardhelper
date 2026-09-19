// GitHub Release 自动发布脚本
// 用法：
//   1. 设置环境变量 GITHUB_TOKEN（Personal Access Token，需要 repo 权限）
//   2. 可选：设置 ZX_GH_OWNER / ZX_GH_REPO，或在下方配置仓库
//   3. 运行：node release.mjs
// 功能：
//   - 从 src/data/changelog.ts 读取当前版本号与最新更新记录
//   - 创建（或更新）GitHub Release（tag = v{版本}，如 v1.67）
//   - 自动上传 Android APK
//   - 自动打包并上传 Electron 便携版（release 目录压缩为 zip）
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { setGlobalDispatcher, ProxyAgent } from 'undici'

// 支持 http_proxy / https_proxy 环境变量（Node fetch 默认不走代理，需显式设置）
const PROXY = process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
if (PROXY) {
  setGlobalDispatcher(new ProxyAgent(PROXY))
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const CHANGELOG_TS = path.join(ROOT, 'src', 'data', 'changelog.ts')
// APK 始终从 gradle 构建产物读取（保证上传的是最新版本）
const GRADLE_APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const ROOT_APK = path.join(ROOT, 'zx-cardhelper-debug.apk')
const APK_PATH = fs.existsSync(GRADLE_APK) ? GRADLE_APK : ROOT_APK
const RELEASE_DIR = path.join(ROOT, 'release', 'Z-X-卡牌助手')

// ===== GitHub 配置（可在环境变量 ZX_GH_OWNER / ZX_GH_REPO 覆盖）=====
const OWNER = process.env.ZX_GH_OWNER || 'dokouha'
const REPO = process.env.ZX_GH_REPO || 'zx-cardhelper'
const TOKEN = process.env.GITHUB_TOKEN || process.env.ZX_GH_TOKEN || ''
// ==================================================================

// 从 changelog.ts 提取版本号与最新更新记录
function readVersionInfo() {
  const src = fs.readFileSync(CHANGELOG_TS, 'utf-8')
  const versionMatch = src.match(/APP_VERSION\s*=\s*'([^']+)'/)
  const version = versionMatch ? versionMatch[1] : ''
  // 提取最新一条 changelog 的 changes 数组内容
  const blockMatch = src.match(/CHANGELOG:\s*ChangelogEntry\[\] = \[[\s\S]*?\{[\s\S]*?version:\s*'([^']+)'[\s\S]*?date:\s*'([^']+)'[\s\S]*?changes:\s*\[([\s\S]*?)\]\s*\}/)
  let notes = ''
  if (blockMatch) {
    const [, v, date, changesSrc] = blockMatch
    const items = [...changesSrc.matchAll(/'(?:[^'\\]|\\.)*'/g)].map(m => m[0].slice(1, -1))
    notes = `v${v} (${date})\n\n${items.map(i => `- ${i}`).join('\n')}`
  }
  if (!version) throw new Error('无法从 changelog.ts 读取 APP_VERSION')
  return { version, notes }
}

async function ghFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })
  if (res.status === 404 && options.allow404) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`)
  }
  return await res.json()
}

async function main() {
  if (!OWNER || !REPO) throw new Error('请设置 ZX_GH_OWNER / ZX_GH_REPO（环境变量或脚本内常量）')
  if (!TOKEN) throw new Error('未设置 GITHUB_TOKEN 环境变量（需 repo 权限的 Personal Access Token）')

  const { version, notes } = readVersionInfo()
  const tag = `v${version}`
  const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}`

  console.log(`=== 发布 v${version} ===`)
  console.log(`仓库: ${OWNER}/${REPO}`)

  // 1. 检查/创建 Release
  let release = await ghFetch(`${apiBase}/releases/tags/${tag}`, { allow404: true })
  if (!release) {
    console.log(`创建 Release ${tag} ...`)
    release = await ghFetch(`${apiBase}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tag,
        name: `v${version}`,
        body: notes,
        draft: false,
        prerelease: false,
      }),
    })
    console.log('Release 已创建')
  } else {
    console.log(`Release ${tag} 已存在，继续上传资产`)
  }

  // 2. 上传资产列表
  const assetsToUpload = []

  // Android APK
  if (fs.existsSync(APK_PATH)) {
    assetsToUpload.push({
      file: APK_PATH,
      name: `zx-cardhelper-v${version}.apk`,
      label: `Android APK v${version}`,
    })
  } else {
    console.warn(`⚠️ 未找到 APK: ${APK_PATH}`)
  }

  // Electron 便携版 zip（如果 release 目录存在）
  if (fs.existsSync(RELEASE_DIR)) {
    const zipPath = path.join(ROOT, `.temp`, `Z-X-卡牌助手-v${version}.zip`)
    console.log('打包 Electron 便携版 ...')
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${RELEASE_DIR.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`, { stdio: 'inherit' })
    assetsToUpload.push({
      file: zipPath,
      name: `Z-X-CardHelper-v${version}.zip`,
      label: `Electron Windows 便携版 v${version}`,
    })
  }

  if (assetsToUpload.length === 0) {
    console.log('⚠️ 没有可上传的资产（APK 与 Electron 目录均不存在）')
    return
  }

  // 3. 逐个上传（已存在的资产跳过，避免 422 already_exists）
  const existingAssets = new Set((release.assets || []).map(a => a.name))
  for (const a of assetsToUpload) {
    const name = a.name || path.basename(a.file)
    if (existingAssets.has(name)) {
      console.log(`⏭️ ${name} 已存在，跳过`)
      continue
    }
    const size = fs.statSync(a.file).size
    console.log(`上传 ${name} (${(size / 1024 / 1024).toFixed(1)} MB) ...`)
    const upRes = await fetch(`https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/octet-stream',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: fs.readFileSync(a.file),
    })
    if (!upRes.ok) {
      const text = await upRes.text().catch(() => '')
      throw new Error(`上传 ${name} 失败: ${upRes.status} ${text.slice(0, 200)}`)
    }
    console.log(`✅ ${name} 上传完成`)
  }

  console.log(`\n=== 发布完成 ===`)
  console.log(`Release 页: ${release.html_url}`)

  // 4. 触发 iOS 构建工作流（macOS runner 编译 IPA）
  try {
    const wfRes = await ghFetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/ios-build.yml/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { version } }),
    })
    console.log('✅ iOS 构建工作流已触发（macOS runner 编译 IPA，约 10-15 分钟后完成并自动附加到 Release）')
  } catch (e) {
    console.warn(`⚠️ iOS 构建触发失败（不影响 Android/Electron 发布）: ${e.message}`)
    console.warn('   可手动在 GitHub Actions 页面触发：https://github.com/dokouha/zx-cardhelper/actions/workflows/ios-build.yml')
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })