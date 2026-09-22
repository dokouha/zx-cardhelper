import { useCardStore } from '@/stores/cardStore'
import type { CardType, CardIcon } from '@/types/card'

// Type filter options: individual extra types separated
const TYPE_OPTIONS: { values: CardType[]; label: string }[] = [
  { values: [], label: '全部类型' },
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

export default function CardFilterPanel() {
  const filter = useCardStore(s => s.filter)
  const setFilter = useCardStore(s => s.setFilter)
  const search = useCardStore(s => s.search)
  const resetFilter = useCardStore(s => s.resetFilter)
  const availablePacks = useCardStore(s => s.availablePacks)
  const availableRaces = useCardStore(s => s.availableRaces)

  const handleApply = () => {
    search(1)
  }

  const handleReset = () => {
    resetFilter()
    search(1)
  }

  const toggleIcon = (icon: CardIcon) => {
    const current = filter.icons
    const next = current.includes(icon)
      ? current.filter(i => i !== icon)
      : [...current, icon]
    setFilter({ icons: next })
  }

  // Toggle type filter: click again to deselect
  const handleTypeClick = (values: CardType[]) => {
    if (values.length === 0) {
      // '全部类型' always clears filter
      setFilter({ types: [] })
      return
    }
    const current = filter.types
    // Check if the exact same type set is already selected
    if (current.length === values.length && values.every(v => current.includes(v))) {
      setFilter({ types: [] }) // deselect
    } else {
      setFilter({ types: values })
    }
  }

  // Check if a type option is active
  const isTypeActive = (values: CardType[]) => {
    if (values.length === 0) return filter.types.length === 0
    if (values.length !== filter.types.length) return false
    return values.every(v => filter.types.includes(v))
  }

  const selectStyle = {
    background: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  return (
    <div
      className="animate-slide-up border-b px-4 py-3 space-y-3"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Type Filter */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          卡牌类型
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleTypeClick(opt.values)}
              className="px-2.5 py-1 rounded text-xs border"
              style={{
                background: isTypeActive(opt.values) ? 'var(--color-accent)' : 'var(--color-bg-card)',
                borderColor: isTypeActive(opt.values) ? 'var(--color-accent)' : 'var(--color-border)',
                color: isTypeActive(opt.values) ? 'white' : 'var(--color-text-primary)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exclude Player-Restricted Cards */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          效果限定玩家卡
        </label>
        <button
          onClick={() => setFilter({ excludePlayerRestricted: !filter.excludePlayerRestricted })}
          className="px-2.5 py-1 rounded text-xs border"
          style={{
            background: filter.excludePlayerRestricted ? 'var(--color-accent)' : 'var(--color-bg-card)',
            borderColor: filter.excludePlayerRestricted ? 'var(--color-accent)' : 'var(--color-border)',
            color: filter.excludePlayerRestricted ? 'white' : 'var(--color-text-primary)',
          }}
        >
          {filter.excludePlayerRestricted ? '已排除限制玩家的卡' : '排除效果限制玩家的卡'}
        </button>
      </div>

      {/* Cost Range */}
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
            onChange={e => setFilter({ costMin: e.target.value ? Number(e.target.value) : null })}
            placeholder="最低"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={selectStyle}
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
          <input
            type="number"
            min={0}
            max={15}
            value={filter.costMax ?? ''}
            onChange={e => setFilter({ costMax: e.target.value ? Number(e.target.value) : null })}
            placeholder="最高"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={selectStyle}
          />
        </div>
      </div>

      {/* Power Range */}
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
            onChange={e => setFilter({ powerMin: e.target.value ? Number(e.target.value) : null })}
            placeholder="最低"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={selectStyle}
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
          <input
            type="number"
            min={0}
            max={20000}
            value={filter.powerMax ?? ''}
            onChange={e => setFilter({ powerMax: e.target.value ? Number(e.target.value) : null })}
            placeholder="最高"
            className="w-16 px-2 py-1 rounded border text-xs text-center"
            style={selectStyle}
          />
        </div>
      </div>

      {/* Icon/Marker Filter */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          标记/图标
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {ICON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleIcon(opt.value)}
              className="px-2.5 py-1 rounded text-xs border"
              style={{
                background: filter.icons.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-bg-card)',
                borderColor: filter.icons.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-border)',
                color: filter.icons.includes(opt.value) ? 'white' : 'var(--color-text-primary)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Race Filter */}
      {availableRaces.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            种族
          </label>
          <select
            value={filter.race ?? ''}
            onChange={e => setFilter({ race: e.target.value || null })}
            className="w-full px-2 py-1.5 rounded border text-xs"
            style={selectStyle}
          >
            <option value="">全部种族</option>
            {availableRaces.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {/* Pack Filter */}
      {availablePacks.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            卡包
          </label>
          <select
            value={filter.pack ?? ''}
            onChange={e => setFilter({ pack: e.target.value || null })}
            className="w-full px-2 py-1.5 rounded border text-xs"
            style={selectStyle}
          >
            <option value="">全部卡包</option>
            {availablePacks.map(p => (
              <option key={p.prefix} value={p.prefix}>
                {p.prefix}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          应用筛选
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg text-sm border"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          重置
        </button>
      </div>
    </div>
  )
}
