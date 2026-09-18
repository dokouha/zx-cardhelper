import { parseCardEffects } from './src/game/effectParser'

// G32-036 的【起】能力
const effectText = `降临条件：黑色或绿色Z/X合计2张
【常】【有效】神域区【效果】这张卡只能在对手的资源区有4张以上的场合才能正规使用。
【常】【有效】《自己回合》方阵【效果】你的废弃区中的卡每有2张，这张卡的力量+1000。
【起】【有效】《自己回合1次》方阵【费用】将你的充能区中的1张卡放置到废弃区。【效果】将你的卡组最上方的2张卡以休眠状态放置到资源区，选择你的资源区中的2张卡，放置到废弃区。`

const parsed = parseCardEffects(effectText)
for (const a of parsed.abilities) {
  console.log(`\n=== Type: ${a.abilityType} ===`)
  console.log(`Effects count: ${a.effects.length}`)
  for (const e of a.effects as any[]) {
    console.log(`  Effect: ${e.type}`, e.rawText?.substring(0, 60) || '')
    if (e.type === 'move_card') {
      console.log(`    srcZone: ${e.target?.zone}, toZone: ${e.toZone}, count: ${e.target?.count}`)
      console.log(`    target spec:`, JSON.stringify(e.target)?.substring(0, 120))
    }
  }
  if (a.unparsed) console.log(`Unparsed: ${a.unparsed.substring(0, 100)}`)
}
