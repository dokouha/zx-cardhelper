// preload.cjs — Electron 预加载脚本
// 在 window 对象上注入标记，让现有代码的 Capacitor.isNativePlatform() 返回 false
// 这样 HTTP 请求走 fetch fallback，文件保存走 blob download fallback，无需改动业务代码
const { contextBridge } = require('electron')

// 目前不需要注入任何 API——现有代码已有完整的 Web fallback：
// - priceService.ts: isNativePlatform() === false → fetch()
// - DeckBuilderPage.tsx: isNativePlatform() === false → blob download

// 如果后续需要在 Electron 环境使用 Node.js 能力（如原生文件保存），
// 可以通过 contextBridge.exposeInMainWorld 暴露 API。

contextBridge.exposeInMainWorld('electronAPi', {
  platform: 'electron',
  isDev: process.env.ZX_ELECTRON_DEV === '1',
})
