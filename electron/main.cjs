const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 960,
    minWidth: 360,
    minHeight: 640,
    title: 'Z/X 卡牌助手',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 允许加载 CDN 卡牌图片（HTTP）
    },
  })

  // 开发模式：加载 Vite dev server；生产模式：加载构建产物
  const isDev = process.env.ZX_ELECTRON_DEV === '1'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const htmlPath = path.join(__dirname, '..', 'dist-electron', 'index.html')
    // 用 loadFile 加载，确保相对路径 ./assets/... 在 file:// 协议下正确解析
    mainWindow.loadFile(htmlPath)
  }

  // 将渲染进程的 console 输出转发到终端
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const tag = ['LOG', 'WARN', 'ERROR'][level] || 'LOG'
    console.log(`[Renderer ${tag}] ${message}`)
  })

  // 外部链接（下载/更新）一律用系统默认浏览器打开，不在 App 内新建窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // 捕获加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Failed] ${errorCode}: ${errorDescription} URL: ${validatedURL}`)
  })

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Render Process Gone]', details)
  })

  // 移除默认菜单栏（保持简洁的移动端风格）
  Menu.setApplicationMenu(null)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
