// 版本更新记录
// 每次更新版本号时在此追加新的更新记录
// 版本号格式: 0.01, 0.02, 0.03, ...

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const APP_VERSION = '1.68'

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.68',
    date: '2026-09-16',
    changes: [
      '自动更新功能已启用：接入 GitHub Releases（dokouha/zx-cardhelper），启动时检测最新版本，有更新时弹窗提示（可选更新，不强制），支持一键下载安装',
    ],
  },
  {
    version: '1.67',
    date: '2026-09-16',
    changes: [
      '新增自动更新框架：启动时检测 GitHub Releases 最新版本，提示更新（可选更新，不强制），支持一键下载 APK 与 Windows 桌面版',
      '新增一键发布脚本 release.mjs：构建完成后自动创建 GitHub Release 并上传 APK 与 Electron 安装包',
    ],
  },
  {
    version: '1.66',
    date: '2026-09-16',
    changes: [
      '修复额外卡组识别：数据源中中文类型名（升格EX/事件/Z/X EX/剑临等）现已正确映射为标准类型，IG15-053~057等升格EX卡片可正常添加到额外卡组',
      '同步官方勘误修正：B28-073、B36-043、B21-058、B40-058/E39-044/P43-007、E34-013共7张卡的效果文本已同步至最新版本（传说指定·Errata 2026.08.27）',
    ],
  },
  {
    version: '1.65',
    date: '2026-09-15',
    changes: [
      '卡牌详情页罕贵度切换：支持点击罕贵度按钮（N/R/RH/SR/SRH/NH等）切换查看对应价格的3算/4算/5算人民币换算，缺货状态一目了然',
      '组牌页罕贵度造价计算：每张卡牌可选择不同罕贵度版本（如选择RH版价格代替默认最低价），卡组总造价按所选罕贵度实时计算',
    ],
  },
  {
    version: '1.64',
    date: '2026-09-15',
    changes: [
      '修复游游亭价格同编号多罕贵度合并展示：解析卡牌图片 alt 属性提取罕贵度（N/R/R+/RH/SR/SRH/NH/SEC/UR/IGR），同编号全部变体保留不丢弃，详情页显示各罕贵度价格与库存状态（有货/缺货/限购N）',
      '修复库存解析：新增「在庫 : N 点」限购格式匹配（原仅匹配 ◯/× 符号）',
    ],
  },
  {
    version: '1.63',
    date: '2026-09-15',
    changes: [
      '数据库增量更新：新增 IG15「升格夏日」卡包（97张），总卡牌数 16634→16731',
      '同步 IG14 效果文本变更（IG14-013「方阵」→「资源区」），修复 CRLF 换行统一为 LF',
      '新增封神指定/传说指定标签支持：卡牌详情页显示指定标签，组卡时封神指定卡禁止加入、传说指定卡每卡组限 1 张',
      '组牌界面「添加卡牌」改为多方式查询：支持颜色/类型/费用/力量/标记/种族/卡包筛选（与卡牌查询页一致）',
      '游游亭价格展示优化：同一编号不同罕贵度变体（NH/SRH等）合并列出，卡牌详情页显示其他罕贵度价格',
    ],
  },
  {
    version: '1.62',
    date: '2026-09-11',
    changes: [
      '修复bug：【起】效果选目标时可选中对方玩家方阵上的Z/X — findCardsOnSquares 不区分通常方阵/玩家方阵，新增 squareType 过滤参数，通常方阵效果只允许 normal 格',
      '同步修复：模板层22处 + batchRegister 3处 + IG09-051 脚本「选择通常方阵上的对手Z/X」调用补上 squareType: normal',
      '修复bug：IG09-029 琪拉莉登场【自】效果（公开卡组顶3张选「战乘机」Z/X加手牌）不触发 — api.revealTopCards 从未定义，脚本调用时静默崩溃，新增实现并支持卡组卡移动（removeFromCurrentZone 补 deck 区域）',
      '修复bug：资源区卡被【常】效果赋予追加颜色后，减费条件（如「资源区中有蓝色和白色和绿色卡的场合减5费」）无法识别追加颜色 — 5处颜色检查统一接入 computeResourceColorGrants（正则减费条件/脚本 findCards/每有1张计数/资源区颜色数量条件/支付颜色条件）',
    ],
  },
  {
    version: '1.61',
    date: '2026-09-10',
    changes: [
      '修复bug：普通Z/X通过效果获得护盾后场上不显示护盾标记 — BoardSquare.tsx 护盾标记仅限升格卡显示，移除 isAscension 限制，所有卡牌 shieldCount>0 均显示',
      '修复bug：创成提示"无护盾可消耗"但场上已有护盾 — 脚本系统 gainToken(护盾) 走 player.tokens 不走 shieldCount 与正则解析器不一致，统一为写入来源卡 shieldCount',
      '修复bug：手牌弃牌按钮显示灰色但可点击 — CardDetailModal 按钮增加 disabled 属性支持，弃牌按钮设为 disabled（ZX规则不允许自由弃牌）',
      '优化：电影/强袭/创成/起能力等不可用按钮统一增加 disabled 视觉反馈（灰色+禁止点击）',
    ],
  },
  {
    version: '1.60',
    date: '2026-09-10',
    changes: [
      '修复bug：G45-102等「手牌或神域区」多区域选卡登场时崩溃 — fromZone 为数组时消费端仍用单值映射导致「未找到来源区域」，改为遍历所有候选区域查找',
      '修复bug：IG09-051等方阵选目标效果可选择不合法目标（如对手的ZX出现在选择己方效果时） — 在 resolveEffectTarget 方阵目标执行前增加 matchesTarget 完整校验（归属方/方阵类型/卡牌类型/绝界等）',
      '修复bug：方阵多目标效果（如「最多2张对手的Z/X返回手牌」）缺少多选流程 — move_card 方阵目标补充 count>1 时继续选下一张的逻辑',
      '修复bug：方阵多目标候选检查 matchesTarget 参数错误 — currentPlayer 应为效果来源方而非目标所有者',
    ],
  },
  {
    version: '1.59',
    date: '2026-09-10',
    changes: [
      '新增通用伤害加成系统：getDamageBonusForAttacker 扫描方阵/神域区/充能区/资源区源卡的【常】效果，自动累加种族/卡名/自身伤害加成（IG03-038守护者+4000/B19-015界贼+2000/B22-014晓十天+1000/B23-110洛克人+1000/P44-083自身+2000/E14-007驱逐+1000/E20-029皇家+2000/E52-003冬日+2000/E53-001黑礁商会+1000/E29-008普莉兹姆+500等14张）',
      '支持动态伤害加成：E52-001资源区[勇者]/[冬日]每张+1000、E20-038方阵[白鹰]≥3且自己回合+1000、IG03-038共奏状态条件',
      '新增限制类规则引擎：getActiveRestrictions 解析不能使用【起】能力/不能正规使用事件卡/不能从手牌正规使用卡片/不能再攻击等限制效果',
      '限制引擎接入4个入口点：useStartAbility（起能力激活）、playEventCard（事件卡使用）、confirmEventCardUse（事件卡确认）、playCardToSquare（正规使用登场）',
      '覆盖29张限制类卡（IG12-019/IG11-005/IG11-008/IG11-051/IG11-054/IG10-012/IG09-004/IG09-040/IG09-061/IG06-057/E29-029/E48-010/B27-021/B29-079/B33-035/B45-042等），支持条件检测（资源区黑色卡≥4/手牌0张/调查记录≥15/专注≥5/生命≤2/剑临卡≥3等）',
    ],
  },
  {
    version: '1.58',
    date: '2026-09-09',
    changes: [
      '修复严重bug：on_turn_start（回合开始时）触发从未生效 — detectTriggerEvent 缺少正则检测，endTurn 未调用触发',
      '修复严重bug：on_turn_end（回合结束时）触发时序错误 — 原在 currentPlayer 切换后才触发，导致 triggerSide 读取为新玩家',
      '优化AI自能力决策：扩展效果收益判断（新增 draw/buff_power/buff_shield/move_card/gain_life_shield），AI 不再跳过有增益效果的可选自能力',
      '优化AI多触发排序：按效果类型优先级排序（破坏>伤害>抽卡>增益>移动），替代原"选第一个"策略',
    ],
  },
  {
    version: '1.57',
    date: '2026-09-09',
    changes: [
      '扩展 effectParser 正则解析，覆盖高频 manual 模式，提升空壳卡牌 fallback 覆盖率',
      '新增「给予N个<护盾>」解析为 buff_shield（IG10-013/IG12-014/IG10-009/010/IG11-012等）',
      '新增「放置到没有Z/X的◎所示方阵/通常方阵」移动解析为 move_card（含相邻方阵、不处于战斗中等变体）',
      '扩展「将各个Z/X放置到另1个Z/X所在的方阵」交换位置解析为 move_card',
      '覆盖效果：完全覆盖 94.7%→95.2%（8,284→8,326张），零覆盖 39→24张，部分覆盖 419→392张',
    ],
  },
  {
    version: '1.56',
    date: '2026-09-09',
    changes: [
      '为39张零覆盖卡牌（正则fallback完全无法自动执行的效果）编写独立脚本接管，使其效果可自动执行',
      '新增API：moveToSquare方法（方阵间移动卡牌），扩展executor与types/api.ts',
      '脚本按效果类型分组：位置交换2张、移动到◎方阵12张、特殊伤害4张、力量Buff/禁止伤害3张、特殊登场/抽卡3张、原力素材使用2张、其他特殊效果10张',
      '涉及卡号：B08-028/033, B10-022/099, B12-082, B13-026/035/039, B15-021, B17-033, B21-096, B22-042, B23-024/034, B28-001, B29-011, B30-007, B31-108, B32-023, B35-030, B38-063, B39-090/092, C11-008/010, E02-009/013/021/059, E05-004/007, E18-026, E50-005, G32-002, IG07-015, P15-034',
    ],
  },
  {
    version: '1.55',
    date: '2026-09-08',
    changes: [
      '修复批量注册系统崩溃：batchRegister.ts缺失12个被注释import+177个遗漏import（含全部ig11_*段模板），此前批量注册运行时直接ReferenceError崩溃，从未成功运行',
      '批量注册现已正常运行：847张卡安全注册（581个去重组），14156张跳过保留正则fallback',
      '新增空壳模板清洗：matchCard对每个能力段做空壳检测（execute函数体为空则视为未匹配），空壳模板的卡不再注册为"有脚本"而是正确fallback到正则系统',
      '空壳清洗基于Function.prototype.toString运行时检测，对esbuild压缩产物（async(e,t)=>{}）同样有效',
    ],
  },
  {
    version: '1.54',
    date: '2026-09-08',
    changes: [
      '修复IG09-029等卡牌【起】能力“登场到方阵+变原力素材”无法替换的问题',
      '为IG09-029创建完整脚本：【自】公开3张选“战乘机”加手牌+【起】神域区5费以下ZX登场变原力素材',
      '为IG06-029创建完整脚本：【起】衍生物“兽人朋友们”登场+变原力素材',
      '同名卡共享脚本：IG09-050→IG09-095、IG06-075→IG06-029、G45-101→IG09-051',
      '扩展playToken API支持replaceExisting选项（衍生物登场时旧卡变原力素材）',
    ],
  },
  {
    version: '1.53',
    date: '2026-09-08',
    changes: [
      '修复关键Bug：12个Store方法只有接口声明缺少实现体导致按钮失效',
      '从.bak恢复7个方法实现：confirmPlayCardEffectPlacement/cancelPlayCardEffect/confirmRevealArrange/cancelRevealArrange/confirmLinkReplace/playAscension/confirmAscension/playShiftCard',
      '修复confirmPlayCardEffectPlacement被错误替换为playShiftCard代码的数据损坏',
      '新建confirmLifeSelect实现：玩家攻击生命时选择翻开哪张生命卡（恢复damagePlayer上下文）',
      '新建4个脚本交互包装方法：resolveScriptInteraction/cancelScriptInteraction/toggleScriptCardSelection/confirmScriptCardSelection（委托executor.ts）',
    ],
  },
  {
    version: '1.52',
    date: '2026-09-08',
    changes: [
      '同时点触发优化第二阶段：诱发状态累积 + resolveImmediately硬化',
      '差距②诱发累积：CardInstance新增abilityUseCountThisTurn字段，AutoTrigger新增triggerCount',
      '修复批量破坏（力量0以下）时不触发on_destroy/on_leave_field的Bug：每张被破坏卡单独触发',
      '脚本卡和正则卡触发入队时均递增并附带triggerCount（对应DSL ThisTurnAbilityUseCountCompare）',
      '回合结束时重置所有区域卡牌的abilityUseCountThisTurn计数器',
      '差距③resolveImmediately：确认chooseOne选中效果已在队首执行（无需修改）',
      '差距①特能力随时插入：架构改动风险高，暂不实施，留待后续版本专项处理',
    ],
  },
  {
    version: '1.51',
    date: '2026-09-07',
    changes: [
      '同时点复数效果触发优化：脚本卡不再fire-and-forget，统一入队处理',
      '新增回合玩家选择触发顺序功能：多个【自】能力同时触发时弹窗让玩家选择先处理哪个',
      '修复confirmAutoTrigger实现丢失的Bug（可选【自】能力确认按钮无效）',
      '新增AutoTrigger.isScript字段、autoTriggerOrderPending状态和resolveAutoTriggerOrder方法',
      '脚本卡和正则卡触发统一入队，消除双轨制执行差异',
    ],
  },
  {
    version: '1.50',
    date: '2026-09-07',
    changes: [
      '共奏机制逐卡填充：实现52个共奏相关空壳factory的具体效果逻辑',
      'start起能力类12个：库勒普丝/伊斯/无瑕之星/王国屠灭者/莉尔菲/缅因猫共奏起能力完整实现',
      'auto自能力类14个：奥利哈钢暴龙/芙蕾德莉卡/亚历山大/菲爱缇/龙胆/红莲领主/高贵树丛共奏自能力完整实现',
      'auto_enter登场类9个：同步加速器/库勒普丝∀/甘迪瓦∀/阿鲁摩塔赫尔∀/菲叶∀/莉尔菲∀/无瑕之星∀/龙胆∀/涅依∀登场效果完整实现',
      '常时/PR类17个：奥利哈钢暴龙∀/同步加速器∀/缅因猫∀/真双子叶∀起能力+常时标记+共奏诱发+PR混沌链接搜索完整实现',
    ],
  },
  {
    version: '1.49',
    date: '2026-09-07',
    changes: [
      '共奏机制实现：CardInstance新增inCoPlayState/coPlayPartner字段，battleStore新增useCoPlay方法（场上Z/X与手牌Z/X共奏为1张+获得护盾）',
      'executor新增coPlay API方法，api.ts添加类型声明',
      'conditions.ts新增3个共奏条件检查：sourceCoPlay/ownCoPlaySquareZxExists/sourceIsUnison',
      '修复41个共奏动作空壳factory（IG01-IG04/SD08/SD09/G41/G43/G44/G45系列玩家卡共奏起能力）',
      '修复67个共奏条件检查空壳factory（共振者系列共奏条件依赖、SourceCoPlay能力限制、共奏诱发自能力、PR系列共奏搜索）',
    ],
  },
  {
    version: '1.48',
    date: '2026-09-07',
    changes: [
      '换位机制实现：battleStore新增swapSquareCards方法、executor新增swapCards API，支持两张方阵ZX互换位置',
      '修复7个换位空壳factory：starSwapTwoZxPosition/autoEnterSwapOwnZxB07/ig08_049_seg2/sd_SD07_016_seg3/b_B35_005_seg1/e_E03_P04_seg1/e_E04_018_seg1',
      'sd_SD07_016选择能力头段补全：抽卡或换位两项选择均可执行',
    ],
  },
  {
    version: '1.47',
    date: '2026-09-07',
    changes: [
      'P1-4: 实现超限助燃免疫——玩家卡不受效果影响：在damage/destroy/buff效果目标选择、dealDamage、applyDamageToCard、findCardsOnSquares中添加hasOverBoost检查，超限助燃状态下的玩家方阵卡不受任何效果影响',
      'P1-5: 补充RevealPlayerEx等价功能——flipFaceUp扩展为也搜索otherZone(Payer Extra)，新增revealPlayerEx API方法',
      'P2-6: 破天降临限制改为按关键字名称区分——从全局布尔值改为Record<string, boolean>，破天降临/异路超越/异色超越各自独立计数',
      'P2-7: 统一PlayerExPlaced触发器——超限助燃出场也触发on_place_on_player事件',
    ],
  },
  {
    version: '1.46',
    date: '2026-09-07',
    changes: [
      '恢复confirmCrisis实现体：玩家方危机弹窗点击触发/放弃后无反应的严重BUG，从.bak文件恢复完整实现',
      '恢复resolveChooseOne实现体：玩家无法选择"选一项"效果',
      '恢复resolveOrderEffects实现体：玩家无法确认效果执行顺序',
      '修复templates/index.ts中5处playerCard访问：PlayerState无playerCard字段导致玩家卡名条件检查全部返回undefined，改为从玩家方阵获取卡牌',
    ],
  },
  {
    version: '1.45',
    date: '2026-09-06',
    changes: [
      '修复cn/jn旧字段名：executor.ts(48处)、conditions.ts(8处)、templates/index.ts(225处)中.card.cn/.card.jn改为.chineseName/.japaneseName，此前同名卡检查、卡名显示、过滤匹配等全部失效',
      '修复playToken对象字段：tokenCard从短字段名(s/cn/jn/ef/t/c/ic/pw/r)改为ZxCard标准字段名(serial/chineseName/japaneseName/effect/type/color/icons/power/shield/rarity等)',
      '初始化turnEvents：5处ScriptContext创建处从全局state读取turnEvents，此前turnEvents从未初始化导致thisTurnXxx条件永远返回false',
      '更新turnEvents：draw→cardsDrawnByAbility、playCard→cardsEnteredSquare、destroy→cardsDestroyed、dealDamage/damagePlayer→damageDealtToOpponent',
      '更新lastRevealedCards：ignite翻卡和flipFaceUp翻开神域区卡时更新lastRevealedCards',
    ],
  },
  {
    version: '1.44',
    date: '2026-09-06',
    changes: [
      '修复护盾指示器：BoardSquare中护盾值显示使用有效护盾值（卡面+永久修正+临时修正+持续效果修正），此前仅用卡面值导致效果改变护盾时指示器不更新',
      '修复合神后EX权未扣减：useDescent增加exPower>0检查，confirmDescent在素材验证通过后扣减1点exPower',
      '修复autoEnterCondNameDamage导入bug：batchRegister.ts L129被注释导致运行时ReferenceError',
    ],
  },
  {
    version: '1.43',
    date: '2026-09-06',
    changes: [
      '修复登场效果不触发：scanAutoAbilities中无条件continue跳过了所有场上卡牌的正则扫描，改为仅有脚本的卡才跳过',
      '修复字段名不匹配：battleStore.ts中card.card.s→card.card.serial（5处parseCardEffects调用）、executor.ts中card.card.cn→chineseName（14处）和card.card.jn→japaneseName（14处）',
      '修复IG10-032点燃登场：前端ignitionResult弹窗canUse未判断Ascension类型，升格卡有点燃图标时只显示"移入废弃区"，现已支持免费升格登场',
      '优化点燃阶段逻辑：进入点燃阶段充能区有卡时弹窗询问是否点燃、点燃完成后充能区仍有卡则再次询问、无卡时自动推进',
    ],
  },
  {
    version: '1.42',
    date: '2026-09-04',
    changes: [
      'Phase 2完成：IG13系列97个execute块从旧API转换为新executor API语法，恢复实际效果逻辑',
      '20个cost函数转换：1个selfSleep类型保留CostDefinition，19个内联到execute开头（payStartAbilityCost仅支持selfSleep）',
      '修复25行活动旧API调用：condition/costReduction中的getTrash/getResource/findInResource/findInIgnores/shuffleDeck等全部替换为新API',
      '修复moveCard目标区域：deck→deck_bottom（4处，原deck会导致卡牌消失）',
      'API适配：ctx.card属性映射(CardInstance≈旧Card)、findCards返回CardTarget、chooseOne传字符串数组、buffPower/buffShield duration改为turn/permanent',
    ],
  },
  {
    version: '1.41',
    date: '2026-09-03',
    changes: [
      '系统性修复：templates/index.ts中14224个对象格式模板(auto/start/star/special使用{}而非[{}])全部转为数组格式，修复compose()合并时TypeError崩溃和executor迭代失败',
      '修复范围：10682个多行空壳模板+97个有代码模板(代码体注释待Phase2实现)+3448个单行标记型模板+1个special模板',
      '参数顺序修正：全部execute函数签名从(api,ctx)修正为(ctx,api)匹配executor调用约定',
      'trigger归一化：旧ctx.reason函数式trigger转为TriggerReason字符串(on_enter_field/on_destroy/on_shift等)',
      'condition类型修正：(ctx)=>boolean函数式condition转为ConditionChecker对象{check,description}',
      '影响：951张卡牌的10792条非标记规则从此不再因格式不兼容导致效果完全失效',
    ],
  },
  {
    version: '1.40',
    date: '2026-09-03',
    changes: [
      '修复5张卡牌效果未触发问题：E49-045费用加1效果用costReduction实现、IG10-084/IG10-035空壳模板填充(auto+start数组格式)、G45-007/G25-025新建完整脚本',
      '修复同名同效果卡：P36-030/B42-027空壳模板填充为auto+start数组格式',
      '引擎优化：confirmPlayCardToSquare添加"不能正规使用"拦截(388张卡统一生效)',
      '引擎优化：效果点燃(非点燃阶段)玩家回合不再自动放置，改为弹窗选择方阵',
    ],
  },
  {
    version: '1.39',
    date: '2026-09-03',
    changes: [
      '修复4张卡牌效果未触发问题：IG10-016/IG10-079空壳模板填充、IG13-044新建完整脚本、IG13-062/IG01-060/IG01-079补充登场效果、G18-033/B20-100/B21-115事件卡效果实现',
      '修复模板auto/start字段格式问题：空壳模板使用对象格式而非数组格式导致executor无法迭代，统一为数组格式',
    ],
  },
  {
    version: '1.38',
    date: '2026-09-03',
    changes: [
      'G系列2009张卡全部脚本覆盖：新增797个模板函数和797条segmentRules',
      'E系列4349张卡全部脚本覆盖：新增3683个模板函数和3683条segmentRules',
      '至此全部非IG系列卡牌效果均走脚本路径，全卡池覆盖率100%',
    ],
  },
  {
    version: '1.37',
    date: '2026-09-03',
    changes: [
      'SD系列299张有效果卡全部脚本覆盖：新增310个模板函数和310条segmentRules',
      'B系列5735张卡全部脚本覆盖：新增6184个模板函数和6184条segmentRules（最大系列）',
      'P系列2254张卡全部脚本覆盖：新增1232个模板函数和1232条segmentRules',
      '三系列共计7726个新模板，覆盖率均达100%（空效果卡除外）',
    ],
  },
  {
    version: '1.36',
    date: '2026-09-03',
    changes: [
      'CS系列36张有效果卡全部脚本覆盖：新增36个模板函数和36条segmentRules',
      'PR系列242张卡全部脚本覆盖：新增235个模板函数和235条segmentRules（含跨行升格EX效果）',
      'C系列441张卡全部脚本覆盖：新增145个模板函数和145条segmentRules',
      '三系列共计416个新模板，覆盖率均达100%（空效果卡除外）',
    ],
  },
  {
    version: '1.35',
    date: '2026-09-02',
    changes: [
      'ZP系列44张卡全部脚本覆盖：新增49个模板函数和49条segmentRules',
      'BG系列37张有效果卡全部脚本覆盖：新增44个模板函数和44条segmentRules',
      'CP系列30张有效果卡全部脚本覆盖：新增42个模板函数和42条segmentRules',
      '三系列共计135个新模板，覆盖率均达100%（空效果卡除外）',
    ],
  },
  {
    version: '1.34',
    date: '2026-09-02',
    changes: [
      'M系列（金属卡）5张有效果卡全部脚本覆盖：新增6个模板函数和6条segmentRules',
      'F系列（免费卡）12张有效果卡全部脚本覆盖：新增8个模板函数和8条segmentRules',
      'V系列（语音计时器卡）5张有效果卡全部脚本覆盖：新增5个模板函数和5条segmentRules',
      '三系列共计19个新模板，覆盖率均达100%（空效果卡除外），开始推进非IG系列脚本覆盖',
    ],
  },
  {
    version: '1.33',
    date: '2026-09-02',
    changes: [
      'IG02全98张卡牌脚本全覆盖：新增167个模板函数和167条segmentRules，98/98 全部卡牌覆盖无空效果',
      'IG01全94张卡牌脚本全覆盖：新增160个模板函数和160条segmentRules',
      '两包共计327个新模板，覆盖率均达100%（空效果卡除外），更多卡牌效果走脚本路径而非正则解析',
    ],
  },
  {
    version: '1.32',
    date: '2026-09-02',
    changes: [
      'IG05全94张卡牌脚本全覆盖：新增188个模板函数和188条segmentRules',
      'IG04全95张卡牌脚本全覆盖：新增175个模板函数和175条segmentRules',
      'IG03全96张卡牌脚本全覆盖：新增175个模板函数和175条segmentRules',
      '三包共计538个新模板，覆盖率均达100%（空效果卡除外），更多卡牌效果走脚本路径而非正则解析',
    ],
  },
  {
    version: '1.31',
    date: '2026-09-02',
    changes: [
      'IG08全93张卡牌脚本全覆盖：新增167个模板函数和167条segmentRules',
      'IG07全94张卡牌脚本全覆盖：新增187个模板函数和187条segmentRules',
      'IG06全97张卡牌脚本全覆盖：新增184个模板函数和184条segmentRules',
      '三包共计538个新模板，覆盖率均达100%（空效果卡除外），更多卡牌效果走脚本路径而非正则解析',
    ],
  },
  {
    version: '1.30',
    date: '2026-09-02',
    changes: [
      'IG11全96张卡牌脚本全覆盖：新增156个模板函数和156条segmentRules，修复引号字符类匹配问题',
      'IG10全96张卡牌脚本全覆盖：新增156个模板函数和156条segmentRules，修复引号字符类匹配、截断段、双重转义等问题',
      'IG09全95张卡牌脚本全覆盖：新增186个模板函数和186条segmentRules',
      '三包共计498个新模板，覆盖率均达100%（空效果卡除外），更多卡牌效果走脚本路径而非正则解析',
    ],
  },
  {
    version: '1.29',
    date: '2026-09-02',
    changes: [
      'IG13全96张卡牌脚本全覆盖：优化matchSegment匹配引擎，增加剥离头部二次匹配机制，IG13所有有效果卡牌均走脚本路径',
      '修复IG13-087★效果段正则匹配尾部虚线分隔符问题',
      'IG13覆盖率从47/97提升至96/97（100%全段覆盖，1张空效果卡除外）',
    ],
  },
  {
    version: '1.28',
    date: '2026-09-02',
    changes: [
      'IG12全97张卡牌脚本全覆盖：新增130个模板函数和130条segmentRules，IG12所有卡牌效果均走脚本路径，不再依赖正则解析',
      '覆盖率从14/97提升至97/97（100%全段覆盖）',
    ],
  },
  {
    version: '1.27',
    date: '2026-09-02',
    changes: [
      '修复resolveEffectTarget方阵目标处理：正则解析器产生的damage/destroy/buff/move_card/grant_ability效果当目标在方阵上时不再静默失败',
      '修复方阵选择UI：可选效果添加"跳过"按钮，玩家可跳过非强制效果',
      '修复selectCards候选卡显示：候选卡牌现在显示图片和费用，不再只有文字',
      '修复IG09-019废弃区卡返回卡组费用：增强parseSpecialCost正则支持卡名过滤，废弃区5张卡返回卡组切洗改为玩家手动选择而非自动取前N张',
    ],
  },
  {
    version: '1.26',
    date: '2026-09-02',
    changes: [
      '修复神域区交互：移除faceUp限制，背面卡也可正规使用登场（4处条件修复）',
      '修复充能区溢出：合神素材进入/回合结束时超出上限弹出选择框，玩家手动选卡送墓',
      '修复confirmMultiSelectTarget未实现：多选模式"最多N张"效果可通过确认按钮手动提交',
      '修复IG09-095：findCards查找神域区不再过滤faceUp，背面卡可被选中',
      '修复IG09-051：playCard增强为自动从来源区域移除+触发登场效果+支持旧卡变原力素材(to_force)',
      '修复IG09-027/SD10-024：多选UI添加确认/取消按钮，可选效果可手动提交',
    ],
  },
  {
    version: '1.25',
    date: '2026-09-01',
    changes: [
      '神域区正规使用：神域区Z/X类型卡可从神域区支付费用正规使用登场到方阵',
      '神域区YGOPRO式交互：有可用卡牌时神域区发光特效提示，点击弹出查看/使用选项',
      '资源区弹窗起动效果：资源区弹窗中点击卡牌可查看详情并使用起能力',
      '神域区弹窗点击卡牌可查看详情并使用起/剑临/降临等能力',
    ],
  },
  {
    version: '1.24',
    date: '2026-09-01',
    changes: [
      'IG13卡包效果全覆盖：97张卡中96张有效果卡全部编写脚本覆盖',
      '新增IG13专属模板127个：虚空使者/起始卡/生命恢复/门扉卡标记、射程2/3引号段、绝界引号段、创成引号段、共鸣引号段、破天降临双段、超限驱动双段等',
      '新增IG13段规则154条：覆盖166个唯一段文本（含3色费用《红1》《蓝1》《白1》格式、引号切分尾段、虚空使者带括号描述等）',
      '修复模板中13处${}未在模板字符串内的语法错误（damage/count/threshold/nameKeyword等参数直接引用）',
      '新增IG13-022邻接旗舰提督返手获得射程2能力头段模板与规则',
    ],
  },
  {
    version: '1.23',
    date: '2026-09-01',
    changes: [
      'IG14卡包效果全覆盖：97张卡中95张有效果卡全部编写脚本覆盖',
      '新增IG14专属模板114个：创成能力、玩家《》格式、剑临Shift、引号内嵌段匹配等',
      '修复创成/强袭标记pattern（创世→创成、繁体襲→简体袭）',
      '修复引号切分问题：引号内含段标记的文本被splitSegments切分为独立段，新增40+条引号段匹配规则',
      '修复事件卡分色减费pattern不匹配红色卡（色字缺失）问题',
    ],
  },
  {
    version: '1.22',
    date: '2026-09-01',
    changes: [
      'B07卡包效果全覆盖：111张卡中88张有效果卡全部编写脚本覆盖',
      '新增B07专属模板：放置资源区触发(13种)、事件卡★(18种)、玩家能力(4种)、起能力(6种)、常能力(12种)等73个模板',
      '适配B07玩家能力格式（【玩家】「水崎」等「」包裹，与B06《》格式不同）',
      '修复引号内嵌段切分：B07-022/032/060/074的"「【常】射程2」"等内嵌能力段拆分为双段匹配',
      '修复B07-080废弃区卡牌以重启状态登场（此前模板误写为休眠登场）',
    ],
  },
  {
    version: '1.21',
    date: '2026-08-31',
    changes: [
      'B06卡包效果全覆盖：110张卡中88张有效果卡全部编写脚本覆盖',
      '新增B06专属模板：资源区X色6张以上力量buff、资源区条件触发(10种变体)、点燃阶段登场触发(4种)、充能区送墓起能力(6种)、玩家能力(8种)等',
      '修复19张卡pattern匹配缺陷：充能送墓格式缺右书名号、[^\\u3000-\\u9fff]无法匹配色字、引号内嵌段被误切分(B06-006/028/063/067)等',
      '适配grant ability双段结构：B06-063/B06-067的""grant内嵌段拆分为SEG1标记+SEG2效果两段独立匹配',
    ],
  },
  {
    version: '1.20',
    date: '2026-08-31',
    changes: [
      'B05卡包效果全覆盖：120张卡中97张有效果卡全部编写脚本覆盖',
      '新增B05专属模板：登场时伤害/废弃区除外/攻击触发/战斗破坏变体/起能力费用变体/★事件卡等',
      '适配B05文本格式差异：<尖括号>费用段、抽卡1张vs抽1张、卡有vs卡在、切洗vs洗切等用词变体',
      '修复引号内嵌段误切分问题（B05-033射程2、B05-079复写能力）',
    ],
  },
  {
    version: '1.19',
    date: '2026-08-31',
    changes: [
      'B04卡包效果全覆盖：110张卡中93张有效果卡全部编写脚本覆盖',
      '新增B04专属模板：觉醒之种占位、资源区条件触发、★事件卡、常能力力量修正等',
      '修复3张卡pattern匹配缺陷：守护者之心缺少数字1、灭狱波缺少【效果】前缀、碧天的铁爪字符类不匹配色字',
    ],
  },
  {
    version: '1.18',
    date: '2026-08-31',
    changes: [
      '修复能力分段正则表达式Bug：修正【常】等关键字误匹配文本中独立字符的问题',
      '修复引号字符编码问题：pattern中Unicode引号U+201C/U+201D无法匹配导致6张卡牌效果失效',
      'B03卡包效果全覆盖：108张卡中89张有效果卡全部编写脚本覆盖',
      '新增觉醒之种占位模板、资源区条件触发、战斗破坏、种族力量修正等B03专属规则',
    ],
  },
  {
    version: '1.17',
    date: '2026-08-30',
    changes: [
      '效果系统重构为YGOPRO式逐卡脚本架构，支持更精确的卡牌效果实现',
      '新增脚本交互系统：选卡/选方阵/单选/确认四类玩家交互UI',
      'IG09-051、IG10-032、IG09-095三张卡已迁移至脚本系统',
      '未编写脚本的卡牌仍使用旧正则解析系统作为fallback',
    ],
  },
  {
    version: '1.16',
    date: '2026-08-28',
    changes: [
      '修复IG06-090门扉卡点燃阶段开始时触发能力不生效的问题',
      '修复IG10-016/IG09-020原力素材种族条件检测误匹配起能力中的种族标签',
      '修复IG09-027/IG10-032抽牌后"返回卡组然后切洗"效果丢失的问题',
      '修复IG10-016/IG10-032获得护盾被误解析为获得Token的问题',
      '修复SD09-025剑临卡选择资源区卡牌重启时无法点击资源区卡牌的问题',
      '修复SD10-024升格Extra卡在神域区缺少"升格登场"按钮的问题',
      '对话界面增加原力素材列表查看',
      '卡牌详情页增加日文名称复制按钮',
      '追加颜色卡片UI提示增强（移至右下角+色标签显示）',
      '增加抽牌/洗切/破坏/伤害/登场等动作浮动提示动画',
    ],
  },
  {
    version: '1.15',
    date: '2026-08-28',
    changes: [
      '修复G45-102原力素材种族条件检测（射程∞条件性授予）',
      '修复创成能力登场方阵不由玩家选择而是自动随机的问题',
      '修复大危机后Player Extra卡未被正确视为玩家卡的问题',
      '修复游戏开始时额外资源应在调度阶段后置入的问题',
      '修复SD09-002起费用显示从绿1修正为绿3',
      '修复IG13-062资源区ZX区域识别错误',
      '修复PR06-012从神域区登场时费用减少效果不生效',
      '修复B46-030诱发破坏时选择框被AI自动跳过的问题',
      '选任意数量卡的效果增加确认按钮',
    ],
  },
  {
    version: '1.14',
    date: '2026-08-28',
    changes: [
      '修复IG09-019战乘机整备士绵羊人起能力追加颜色不生效的问题',
      '修复效果条件检查不支持"卡名含有「X」的卡有N张以上"模式的区域卡数检查',
    ],
  },
  {
    version: '1.13',
    date: '2026-08-27',
    changes: [
      '修复剑临卡on_shift触发时被误判为已离场导致跳过自动触发的问题',
      '修复IG09-095起效果限定方阵时提示不明确且前端无法点击源卡方阵的问题',
      '卡牌查询界面增加复制卡牌名称按钮',
    ],
  },
  {
    version: '1.12',
    date: '2026-08-27',
    changes: [
      '修复IG09-095战乘机司令官起效果：神域区选卡改为玩家手动选择（不再自动选中单张候选）、限定登场到源卡所在方阵、源卡正确作为原力素材附着到新卡下方',
      '修复IG10-016战乘机维伽克登场效果：手牌放卡组最下方时目标区域映射缺失导致无法操作',
      '修复B46-030玉米破坏诱发：支持《同名》以外的Z/X筛选排除同名卡',
      '修复IG13-062全一之渴求厄尔庇斯：支持"出场到"表述、任意张选择、凭依条件种族/能力排除/卡名关键词过滤',
    ],
  },
  {
    version: '1.11',
    date: '2026-08-27',
    changes: [
      '修复AI破天降临无限重试导致对局卡死的BUG：AI在使用破天降临前预检全部费用条件（资源数量/颜色/方阵Z/X/手牌/废弃区/计数器），条件不满足时跳过而非反复尝试',
      'AI破天降临费用自动支付：AI按资源→方阵→手牌顺序自动选择费用并确认',
      '修复AI出Z/X/事件卡/升格失败仍return true导致无限循环的同类隐患：调用后验证卡是否离开手牌，失败则跳过',
      'AI延伸驱动预检空通常方阵：无空位时跳过而非反复尝试失败',
    ],
  },
  {
    version: '1.10',
    date: '2026-08-27',
    changes: [
      '破天降临费用支付系统：支持167张破天降临卡的完整费用支付流程',
      '资源费用：颜色费用《红1》《绿蓝1》等通过资源区休眠支付',
      '方阵Z/X费用：放置到废弃区/返回手牌/放卡组最下方/除外/破坏/休眠等6种动作',
      '双色Z/X费用：如"红色Z/X和红色以外的Z/X各1张放置到废弃区"',
      '手牌费用：弃手牌/手牌除外/手牌放卡组最下方',
      '废弃区返回手牌费用：如"废弃区中1张「贯穿世堺的赤之魔击」返回手牌"',
      '自身费用：如"将这张卡放置到充能区"',
      '资源休眠费用：如"将资源区中1张无色卡休眠"',
      '消耗计数器费用：如"消耗6个<调查记录>"',
      '费用支付UI弹窗：资源选择+方阵Z/X选择+手牌选择三段式确认',
    ],
  },
  {
    version: '1.09',
    date: '2026-08-26',
    changes: [
      '修复IG09-019起能力被误当常效果执行的问题（parseContinuousBuffs截断到下一能力标记前）',
      '修复破天降临嵌套【起】被误拆为多段的问题（跳过全角括号内的能力标记）',
      '修复SD10-026破天降临重复出现使用按钮的问题',
      '修复IG09-095起效果无法选择神域区对象的问题（isThisCardEffect排除神域区来源）',
      '实现"抽最多N张"由玩家选择抽几张（弹窗0~N张选择，886张卡受益）',
      '神域区正反面区分：初始卡背面朝下，门扉卡/已使用事件卡正面朝上',
      '神域区卡牌离场返回时翻为背面，对手不可查看我方背面卡牌',
    ],
  },
  {
    version: '1.08',
    date: '2026-08-26',
    changes: [
      '修复资源阶段置入资源时确认弹窗无法关闭的问题（JavaScript ASI陷阱导致压缩后代码异常）',
    ],
  },
  {
    version: '1.07',
    date: '2026-08-26',
    changes: [
      '卡组导出新增"复制文本代码"功能，生成人类可读格式直接粘贴分享',
      '卡组导入同时兼容JSON格式和文本格式，自动识别',
      '新建牌组改为选择方式：手动新建或粘贴卡组代码导入',
    ],
  },
  {
    version: '1.06',
    date: '2026-08-26',
    changes: [
      '组牌界面新增"替换为其他罕贵版本的同名卡"功能（卡片左上角按钮，弹窗横向选择）',
      '替换按钮优化：仅当存在其他罕贵版本时显示',
      '修复11张点燃卡漏标（IG10-031~036、IG13-032~036）',
      '修复IG13-031进化原力图标漏标',
      '修复IG13-062被错误识别为起始卡的问题',
      '修复G39-024神域区卡无法投入16张的问题（支持神域区加入最多N张效果）',
    ],
  },
  {
    version: '0.05',
    date: '2026-08-26',
    changes: [
      '新增卡牌价格查询功能（游游亭实时价格，支持人民币3/4/5算换算）',
      '组牌界面支持查看单卡价格和卡组总造价',
      '新增6个卡包数据：IG14、PR11、PR12、PR13、PR14、G45（共231张新卡）',
      '修复新卡类型值格式不一致导致无法筛选的问题',
    ],
  },
  {
    version: '0.04',
    date: '2026-08-13',
    changes: [
      '修复IG10-087对手手牌选择仍为己方的问题（parseTargetSpec识别"他自己"）',
      '修复PR06-010减费效果未正常适用的问题（卡名含有X的卡有N张以上条件）',
      '修复攻击生命区时卡牌信息泄露给攻击方的问题',
      '修复重启阶段不自动跳过的问题（endTurn清除pending状态+自动推进检查扩展）',
    ],
  },
  {
    version: '0.03',
    date: '2026-08-12',
    changes: [
      '修复攻击生命时未添加选择对方生命区卡的环节',
      '修复葛萝莉娅系列Link登场效果未按效果指定名称过滤的问题',
      '修复一转新心葛萝莉娅登场自效果无法诱发的问题',
      '修复灿烂春装葛萝莉娅起效果无法正常发动的问题',
      '修复灰心丧气葛萝莉娅常效果减费未正常执行的问题',
      '修复IG10-044登场效果未正常执行的问题',
      '修复E44-085效果区域识别错误的问题',
      '修复IG10-087对手选择手牌时误选为己方手牌的问题',
      '修复G25-025对手废弃区有ZX时提示无可选择对象的问题',
      '修复IG13-096起效果置入资源后回手效果可被错误取消的问题',
      '修复B45-108跨方阵Link自我消灭未触发的问题',
      '修复E52-054未登场却反复诱发自效果的问题',
    ],
  },
  {
    version: '0.02',
    date: '2026-08-11',
    changes: [
      '修复查卡详情页返回时滚动位置恢复不生效的问题',
      '修复B42-049正规使用登场时选项2条件检查不匹配"的场合"句式',
      '修复G18-033公开卡组顶卡牌选择加入手牌效果无法触发的问题',
      '修复P47-114充能区起动能力费用未正确支付的问题',
      '实现B48-031资源区满足条件时具备所有颜色效果',
      '卡牌常时BUFF UI显示：全色/绝界/保护/力量修正指示器',
      'G36-041离场效果通过通用on_leave_field正确触发',
    ],
  },
  {
    version: '0.01',
    date: '2026-08-11',
    changes: [
      '查卡列表返回时保持原页码和滚动位置',
      '牌组构筑预览页面排序后导出图片也按排序显示',
      '查卡筛选增加种族筛选项',
      '同罕贵卡合并显示（同卡名+同效果+同罕贵度合并，编号旁显示+N）',
      '其他区域自动添加生命护盾(PR07-011)和护盾标记(PR07-012)Token',
      'LINK卡携带上限调整为10张',
      '衍生物(Token)离场时从游戏中消除，并触发离场效果',
      'Link卡自我消灭/替换时返回其他区域而非废弃区',
      '伤害破坏也触发被破坏卡的【自】离场效果',
      '可选减费系统：出牌时弹窗显示减费开关由玩家决定',
    ],
  },
]
