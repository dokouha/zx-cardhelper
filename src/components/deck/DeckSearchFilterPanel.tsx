import { useState } from 'react'
import { db } from '@/db/database'
import type { CardFilter, CardColor, CardType, CardIcon } from '@/types/card'
import { COLOR_LABELS, COLOR_HEX } from '@/types/card'

// 卡牌类型选项（与 CardFilterPanel 保持一致）
const TYPE_OPTIONS: { values: CardType[]; label: string }[] = [
  { values: [], label: '全部' },
  { values: ['Z/X'], label: 'Z/X' },
  { values: ['Event'], label: '事件' },
  { values: ['Player'], label: '玩家' },
  { values: ['Ascension'], label: '升格' },
  { values: ['Link'], label: '链结' },
  { values: ['Z/X Extra'], label: 'Z/X额外' },
  { values: ['Event Extra'], label: '事件额外' },
  { values: ['Player Extra'], label: '玩家额外' },
  { values: ['Ascension Extra'], label: '升格额外' },
  { values: ['Z/X Over Boost'], label: '超限助燃' },
  { values: ['Shift'], label: '剑临' },
]

const ICON_OPTIONS: { value: CardIcon; label: string }[] = [
  { value: 'ignition', label: '点燃' },
  { value: 'void_bringer', label: '虚空使者' },
  { value: 'life_recovery', label: '生命恢复' },
  { value: 'overdrive', label: '超限驱动' },
  { value: 'range', label: '射程' },
  { value: 'isolated', label: '绝界' },
  { value: 'evol_seed', label: '进化原力' },
  { value: 'zero_optima', label: '零点优化' },
  { value: 'awakening', label: '觉醒条件' },
  { value: 'descent', label: '降临条件' },
  { value: 'break', label: '破天降临' },
  { value: 'starting', label: '起始卡' },
  { value: 'starting_resource', label: '起始资源' },
  { value: 'door', label: '门扉卡' },
  { value: 'igob', label: 'IGOB' },
  { value: 'creation', label: '创成' },
  { value: 'extension', label: '延伸驱动' },
]

interface Props {
  filter: CardFilter
  onChange: (filter: CardFilter) => void
  onReset: () => void
}

// 组牌页"添加卡牌"多方式查询筛选面板
// 与卡牌查询页 CardFilterPanel 功能一致，但使用受控 props（不依赖 cardStore 全局状态）
export default function DeckSearchFilterPanel({ filter, onChange, onReset }: Props) {
  const [packList] = useState(() => db.getPackList())
  const [raceList] = useState(() => db.getRaceList())

  const set = (partial: Partial<CardFilter>) => onChange({ ...filter, ...partial })

  const inputStyle = {
    background: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  const chipActive = {
    background: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'white',
  }
  const chipIdle = {
    background: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  const toggleIcon = (icon: CardIcon) => {
    const next = filter.icons.includes(icon)
      ? filter.icons.filter(i => i !== icon)
      : [...filter.icons, icon]
    set({ icons: next })
  }

  const handleTypeClick = (values: CardType[]) => {
    if (values.length === 0) {
      set({ types: [] })
      return
    }
    const current = filter.types
    if (current.length === values.length && values.every(v => current.includes(v))) {
      set({ types: [] })
    } else {
      set({ types: values })
    }
  }

  const isTypeActive = (values: CardType[]) => {
    if (values.length === 0) return filter.types.length === 0
    if (values.length !== filter.types.length) return false
    return values.every(v => filter.types.includes(v))
  }

  return (
    <div
      className="rounded-xl border p-3 space-y-3"
      style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      {/* 颜色筛选 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          颜色
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {(['red', 'blue', 'white', 'black', 'green', 'colorless'] as CardColor[]).map(c => (
            <button
              key={c}
              onClick={() => set({ color: filter.color === c ? null : c })}
              className="px-2.5 py-1 rounded text-xs border"
              style={filter.color === c
                ? { ...chipActive, borderColor: COLOR_HEX[c] }
                : chipIdle}
            >
              {COLOR_LABELS[c]}
            </button>
          ))}
          <button
            onClick={() => set({ multiColorOnly: !filter.multiColorOnly })}
            className="px-2.5 py-1 rounded text-xs border"
            style={filter.multiColorOnly ? chipActive : chipIdle}
          >
            仅多色
          </button>
        </div>
      </div>

      {/* 卡牌类型 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          类型
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleTypeClick(opt.values)}
              className="px-2.5 py-1 rounded text-xs border"
              style={isTypeActive(opt.values) ? chipActive : chipIdle}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 费用范围 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          费用范围
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={15}
            value={filter.costMin ?? ''}
            onChange={e => set({ costMin: e.target.value ? Number(e.target.value) : null })}
            placeholder="最低"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={inputStyle}
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
          <input
            type="number"
            min={0}
            max={15}
            value={filter.costMax ?? ''}
            onChange={e => set({ costMax: e.target.value ? Number(e.target.value) : null })}
            placeholder="最高"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={inputStyle}
          />
        </div>
      </div>

      {/* 力量范围 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          力量范围
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={20000}
            value={filter.powerMin ?? ''}
            onChange={e => set({ powerMin: e.target.value ? Number(e.target.value) : null })}
            placeholder="最低"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={inputStyle}
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
          <input
            type="number"
            min={0}
            max={20000}
            value={filter.powerMax ?? ''}
            onChange={e => set({ powerMax: e.target.value ? Number(e.target.value) : null })}
            placeholder="最高"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={inputStyle}
          />
        </div>
      </div>

      {/* 标记/图标 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          标记
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {ICON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleIcon(opt.value)}
              className="px-2.5 py-1 rounded text-xs border"
              style={filter.icons.includes(opt.value) ? chipActive : chipIdle}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 种族 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          种族
        </label>
        <select
          value={filter.race ?? ''}
          onChange={e => set({ race: e.target.value || null })}
          className="w-full px-2 py-1.5 rounded border text-xs"
          style={inputStyle}
        >
          <option value="">全部种族</option>
          {raceList.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* 卡包 */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          卡包
        </label>
        <select
          value={filter.pack ?? ''}
          onChange={e => set({ pack: e.target.value || null })}
          className="w-full px-2 py-1.5 rounded border text-xs"
          style={inputStyle}
        >
          <option value="">全部卡包</option>
          {packList.map(p => (
            <option key={p.prefix} value={p.prefix}>{p.prefix}</option>
          ))}
        </select>
      </div>

      {/* 重置按钮 */}
      <button
        onClick={onReset}
        className="w-full py-2 rounded-lg text-xs border"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
      >
        清空筛选条件
      </button>
    </div>
  )
}
