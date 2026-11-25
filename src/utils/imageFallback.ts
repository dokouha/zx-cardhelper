// 卡图加载兜底链：haronomagia 图片 404 时自动逐级回退
// 链：real/{sp}/{s}.jpg → real/{sp}/{s}_h.jpg → future/{s}.png → {sp}/{s}.png → 旧CDN
// 机制：window 捕获阶段监听 error 资源事件（早于组件的 onError），成功换源后 stopPropagation，
//       避免组件自身的 onError 把图片隐藏；链耗尽时放行，由组件原有 onError 处理（占位/隐藏）
const HARONO = 'https://haronomagia.com/zxcard/images/'
const OLD_CDN = 'http://zximg-cdn.yimieji.com/card'

/** 根据当前图片 URL 计算后续兜底候选（不含当前） */
export function getImageFallbacks(src: string): string[] {
  const chain: string[] = []

  // haronomagia real/{sp}/{serial}.jpg 或 _h.jpg
  let m = src.match(/haronomagia\.com\/zxcard\/images\/real\/([^/]+)\/([^/.]+)(_h)?\.jpe?g/i)
  if (m) {
    const [, sp, serial, isH] = m
    if (!isH) chain.push(`${HARONO}real/${sp}/${serial}_h.jpg`)
    chain.push(`${HARONO}future/${serial}.png`)
    chain.push(`${HARONO}${sp}/${serial}.png`)
    chain.push(`${OLD_CDN}/${sp}/${serial}.png`)
    return chain
  }

  // haronomagia future/{serial}.png
  m = src.match(/haronomagia\.com\/zxcard\/images\/future\/([^/.]+)\.png/i)
  if (m) {
    const serial = m[1]
    const sp = serial.split('-')[0]
    chain.push(`${HARONO}${sp}/${serial}.png`)
    chain.push(`${OLD_CDN}/${sp}/${serial}.png`)
    return chain
  }

  // haronomagia {sp}/{serial}.png
  m = src.match(/haronomagia\.com\/zxcard\/images\/([^/]+)\/([^/.]+)\.png/i)
  if (m) {
    const [, sp, serial] = m
    if (serial.split('-')[0] === sp) {
      chain.push(`${OLD_CDN}/${sp}/${serial}.png`)
    }
    return chain
  }

  return chain
}

// 每个 img 元素剩余的兜底队列
const pending = new WeakMap<HTMLImageElement, string[]>()

/** 安装全局图片兜底监听（应用启动时调用一次） */
export function installImageFallback(): void {
  if (typeof window === 'undefined') return
  if ((window as any).__zxImgFallbackInstalled) return
  ;(window as any).__zxImgFallbackInstalled = true

  window.addEventListener(
    'error',
    (e: Event) => {
      const target = e.target as HTMLImageElement | null
      if (!target || target.tagName !== 'IMG') return

      let queue = pending.get(target)
      if (!queue) {
        queue = getImageFallbacks(target.src || target.currentSrc || '')
        pending.set(target, queue)
      }
      const next = queue.shift()
      if (!next) {
        // 兜底链耗尽，放行给组件的 onError 处理
        pending.delete(target)
        return
      }
      // 阻止事件继续（避免组件 onError 隐藏图片）
      e.stopPropagation()
      target.src = next
    },
    true,
  )
}