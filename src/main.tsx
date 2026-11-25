import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { installImageFallback } from './utils/imageFallback'

// 卡图兜底链：haronomagia 图片失败时自动回退（real→_h→future→main→旧CDN）
installImageFallback()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
