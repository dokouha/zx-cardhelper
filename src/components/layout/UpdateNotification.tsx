import { useState, useEffect } from 'react'
import { APP_VERSION, CHANGELOG } from '@/data/changelog'

const STORAGE_KEY = 'zx-app-version-seen'
const DISMISS_KEY = 'zx-app-changelog-dismiss'

export default function UpdateNotification() {
  const [visible, setVisible] = useState(false)
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    const seenVersion = localStorage.getItem(STORAGE_KEY)
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true'

    // 如果版本不同且用户未勾选"不再提示"，显示弹窗
    if (seenVersion !== APP_VERSION && !dismissed) {
      // 延迟显示，等数据库加载完成
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    // 记录已查看的版本
    localStorage.setItem(STORAGE_KEY, APP_VERSION)
    // 如果勾选了"不再提示"，记录
    if (dontShow) {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
    setVisible(false)
  }

  if (!visible) return null

  // 取最新一条更新记录
  const latest = CHANGELOG[0]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleClose}
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
        onClick={e => e.stopPropagation()}
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
              更新记录
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              v{latest.version} · {latest.date}
            </p>
          </div>
          <span style={{ fontSize: '28px', color: 'var(--color-accent)' }}>&#9876;</span>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {latest.changes.map((change, i) => (
              <li
                key={i}
                style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  borderBottom: i < latest.changes.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>&#8226;</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <label
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            不再提示
          </label>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fff',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
