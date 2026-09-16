import { useState, useEffect, useCallback } from 'react'
import { checkForUpdate, type UpdateInfo } from '@/services/updateService'

const CHECK_DELAY = 3000 // 启动后延迟 3 秒检查，避免与数据库加载/更新记录弹窗抢屏
const SHOWN_KEY = 'zx-app-update-shown'

export default function AutoUpdateNotice() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const result = await checkForUpdate()
      if (cancelled) return
      if (result.hasUpdate) {
        // 同一版本只提示一次（用户点「稍后」后不重复弹；点「立即更新」记录已处理）
        const lastShown = localStorage.getItem(SHOWN_KEY)
        if (lastShown === result.latestVersion) return
        setInfo(result)
        setVisible(true)
      }
    }, CHECK_DELAY)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const handleLater = useCallback(() => {
    if (info) localStorage.setItem(SHOWN_KEY, info.latestVersion)
    setVisible(false)
  }, [info])

  const handleUpdate = useCallback(() => {
    if (info?.downloadUrl) {
      localStorage.setItem(SHOWN_KEY, info.latestVersion)
      window.open(info.downloadUrl, '_blank', 'noopener,noreferrer')
    }
    setVisible(false)
  }, [info])

  if (!visible || !info) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: '12px',
          maxWidth: '420px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
              发现新版本
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              v{info.currentVersion} → v{info.latestVersion}
              {info.publishedAt ? ` · ${info.publishedAt.slice(0, 10)}` : ''}
            </p>
          </div>
          <span style={{ fontSize: '28px', color: 'var(--color-accent)' }}>&#9889;</span>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {info.notes.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {info.notes.map((note, i) => (
                <li
                  key={i}
                  style={{
                    padding: '6px 0',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    borderBottom: i < info.notes.length - 1 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>&#8226;</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              有可用更新，建议升级到最新版本以体验新功能与修复。
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={handleLater}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            稍后再说
          </button>
          <button
            onClick={handleUpdate}
            disabled={!info.downloadUrl}
            style={{
              padding: '8px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fff',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              cursor: info.downloadUrl ? 'pointer' : 'not-allowed',
              opacity: info.downloadUrl ? 1 : 0.5,
            }}
          >
            {info.downloadUrl ? '立即更新' : '暂无下载'}
          </button>
        </div>
      </div>
    </div>
  )
}