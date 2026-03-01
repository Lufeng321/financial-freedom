核心定位与北极星
一句话定位：用数据驱动的个人财务自由加速器——帮用户把时间、金钱与技能投入转化为可量化的净资产增长曲线。
北极星指标（任选其一作为全局对齐）：

用户月度“可预测净资产增长率”提升值
达成阶段性财务目标（例如 F1: 6 个月应急金, F2: 年被动收入覆盖 20%支出）进度完成率
辅助指标：日活留存、目标设定转化率、连续记录天数、技能投资回报评估完成率
用户细分 & 关键 Jobs
初阶：理不清钱去向 → 需要简明现金流与支出分类
成长：有结余 → 想知道如何配置（技能 vs 投资 vs 储蓄）
进阶：追求被动收入 → 需要可视化资产/负债/回报率与时间价值
核心 Jobs：
看现在财务状态（我在哪里）
设定财务自由里程碑（我要去哪）
分配时间/金钱（如何更快到）
反馈与纠偏（我是否在正确轨道上）
信息架构重构（现有页面映射）
现有	新定位角色	关键改造点	保留/合并建议
index	财富驾驶舱 Dashboard	汇总：净资产、月现金流、被动收入进度条、今日专注时间、技能 ROI	保留（重做模块化卡片）
finance + bill	现金流 & 资产负债	拆：流水录入、分类预测；加入资产/负债快照、自动计算储蓄率	合并为 finance 主模块
habit	财务习惯引擎	每个习惯需绑定“财务贡献类型”(增收/节支/健康保障/风险控制)	标签重构
skill	技能投资组合	记录：投入时间/费用/阶段胜任度 → 预估年化增收	引入“预期收入 uplift”字段
todo	任务执行	增加字段：关联技能/财务目标/价值权重	与 pomodoro 关联
pomodoro	时间资产化	每个番茄绑定技能或任务 → 汇总“投入资本(时间)→价值”	和 todo 打通
diary	复盘/行为财务日记	模板化：今日消费冲动/投资决策/情绪 → 训练决策质量	结构化输入
sport	健康资本	转成“健康类习惯”子分类，估算医疗费用避免值（可暂降优先级）	并入 habit
me	账户 & 参数	财务自由目标、货币、风险偏好、贴现率	保留
html/pomodoro.html	可迁移	原型迁移到原生或删除	逐步淘汰

关键新数据模型（增量字段）
Goal：{ id, type(FI阶段/应急金/被动收入), targetValue, currentValue, deadline, progressFormula }
Asset：{ id, category(现金/基金/股票/副业/知识产权), principal, currentValue, yieldRate }
Liability：{ id, type, principal, rate, monthlyPayment, remainingTerm }
Transaction：扩展 { emotionTag, necessity(1-5), ROIflag(bool) }
Skill：{ id, name, investedHours, investedCost, expectedAnnualUplift, confidence(%) } → 计算 时间回报率 = uplift / (小时×时间成本)
TimeSession (番茄)：{ id, skillId?, taskId?, minutes, focusQuality(1-5) }
Habit：{ id, name, category(增收|节支|风险|健康), streak, estimatedAnnualImpact }
KPI_Snapshot：周期性缓存聚合，降低实时计算压力
关键算法/计算建议
储蓄率 = (收入 - 支出可变项 - 消费冲动) / 收入
复利投射：假设年化 r & 每月可投资额 m，预计达到目标 T 所需月数 n： 用未来值公式 FV = m * ((1+r/12)^n -1)/(r/12)
技能 ROI： (预期年增收 × 信心) / (已投入货币价值 + 时间价值(小时×小时成本))
财务自由进度条： (被动收入 / 月必要支出) × 100%
情绪决策评分：最近7天“冲动消费金额 / 总支出”下降趋势

交互与体验
首次引导：3步 —— (a) 设定目标 (b) 填基础资产与必要支出 (c) 选 2 个最想提升的技能
Dashboard 卡片：支持长按重排 & 次序记忆
录入加速：最近使用分类 + 智能预测金额/标签
番茄结束弹框：是否归属某技能 → 自动累计技能投入
复盘模板 Quick Slot：每日 3 问（我今天的高价值时间？一次低质量消费？明天最高杠杆行动？）
分阶段迭代（可用 2 周 Sprint 节奏）
Phase 0 基线：数据模型补齐（Goal/Asset/Liability/Skill ≥ MVP 版），Dashboard 初版
Phase 1 行为绑定：番茄 → 技能；习惯 → 年化影响；流水 → 情绪标签
Phase 2 ROI 引擎：技能 ROI 计算 & 排序建议；可投资额建议分配（再投资 vs 学习 vs 现金）
Phase 3 智能洞察：异常支出提醒、连续未投入高 ROI 技能提醒、FI时间预测曲线
Phase 4 社区 / 增长：匿名分享“本周 ROI 最高技能”，排行榜（储蓄率/专注小时）
Phase 5 商业化：Premium（多账户同步/自动导入/高级预测/个性化分配建议）

MVP 优先级矩阵（高价值×低成本）
Must: 目标设定 / 资产+负债快照 / 技能投入记录 / 番茄关联技能 / Dashboard 基础卡片
Should: 储蓄率计算 / 技能 ROI 简版 / 习惯财务标签 / 财务自由进度条
Could: 情绪标记 / 决策复盘模板 / 预测达成时间
Later: 社区 / 高级算法 / 自动数据拉取

现有文件层面改造建议
finance.js：拆分 service 层（/utils/finance.js → /utils/finance/aggregation.js + model.js）
新增 /utils/models.js 统一导出数据结构 schema（即使暂存本地 storage）
新增 /utils/roi.js 封装技能 ROI & FI 进度计算
index.js 重写为聚合读取上述计算函数
在 pomodoro.js 完成一个 session 后调用 roi.updateSkillHours(skillId, minutes)
给 habit/skill 页面增加“年化影响/预期增收”输入组件（可先用 number input）
数据持久与扩展策略
短期：本地 storage + 按天 snapshot（避免每次启动全量扫描）
中期：接入云开发数据库，按集合：goals, assets, liabilities, transactions, skills, sessions, habits, kpi_snapshots
字段预留：version, updatedAt，用于未来迁移

关键埋点（最少）
onboarding_completed
goal_created
transaction_added (with emotion)
skill_session_logged
skill_roi_calculated
dashboard_open
habit_streak_increment
风险 & 早期验证
用户录入负担高 → 解决：默认模板+智能建议+渐进完善
技能 ROI 主观性 → 解决：提供行业基准范围供参考
价值感延迟 → 解决：第一天就显示“预计缩短 X 个月到达 FI” 粗略估算（哪怕后面再校准）
精简首批开发待办（Issue 列表建议）
新建数据模型 & 本地存储封装
资产/负债录入 UI + Dashboard 卡片
财务自由目标设定弹窗
番茄结束绑定技能 & 时间累计
技能列表显示：累计小时 / 预期增收 / ROI 排序
习惯编辑添加“财务作用分类”
储蓄率 & FI 进度计算函数
Dashboard 汇总卡片布局 & 自定义顺序
复盘模板（日记结构化）
埋点抽象函数

简版技术拆分（“契约”示例）
roi.getSkillROI(skillObj) -> { roiPercent, annualUpliftEffective }
finance.getSavingsRate(month) -> number
fi.getProgress() -> { passiveIncome, necessaryExpense, ratio }

下一步建议（行动序列）
新建 /utils/models.js + /utils/roi.js
重构 index.js 读聚合函数
为 skill/ habit / pomodoro 增加必要字段输入与写入
加一个 Goal 设定弹窗（首次启动检测）


---
扩展优化建议总览（追加）

1. 快速胜利（1–2 天）
1.1 预算体系前台化：`budgets['YYYY-MM']` → 预算设置页 + Dashboard 预算进度条（>80% 黄色，>=100% 红色）。
1.2 账单模板与最近复用：顶部“＋”弹层包含 最近3笔 + 模板分组；录入后可一键“再次添加”。
1.3 周期账单提醒：每日启动检查 `recurringTemplates`（按 day 或 cron 简化）→ 未执行生成提示条；点击批量创建账单并写入 `recurringExecLogs`。
1.4 目标进度卡片：复用 `calcGoalProgress`，显示 Emergency / Passive / Savings 三条进度与 ETA；点击进入目标详情页。
1.5 Dashboard 卡点击跳转：FI→目标详情；Savings→预算；Skill ROI→技能列表；Habit→习惯分析；Health→运动记录；Growth→成长引擎；增加“显示/隐藏”开关与排序持久化（已有排序，补 display flag）。
1.6 日记关键词标签化：关键词可点添加/移除；新增“今日总结”占位按钮（返回结构化 JSON 预留 AI 接口）。
1.7 习惯 streak 动效：打卡成功触发 XP + 粒子动画；连续 7 天自动发成就消息。

2. 中期功能（1–3 周）
2.1 周/月回顾页面：聚合（储蓄率、净资产变化、被动收入增量、Top3 支出类别、Top3 技能投入小时、心情分布、习惯完成率、番茄总时长）。提供分享图（Canvas 导出）。
2.2 成长引擎页：雷达(专注/健康/习惯/杠杆/技能ROI/FI进度) + 时间序列（最近 8 周）。
2.3 任务系统升级：Todo 加字段 `wealthLeverType`（增收/节支/系统/资产）和 `valueWeight(1-5)`；看板分列 Today / Week / Backlog；支持拖拽排序（或上下移动按钮）。
2.4 资产配置与收益：资产新增字段 `type` `expectedROI`；展示当前实际 ROI vs 期望差值；渲染资产配置饼图 + 风险提示（集中度 >50%）。
2.5 被动收入情景模拟器：滑块(投入资本, 预期年化, 复利年数) → 输出：最终年度被动收入、支出覆盖率、FI 年度缩短估计。
2.6 习惯分析：热力图（本年 365），最长连续/当前连续，完成率趋势折线；“影响值”排序 (estimatedAnnualImpact)。
2.7 技能成长路线：每技能定义里程碑数组 [{level,name,criteria,bonusXP}]；达成自动发消息 + XP 加成。
2.8 消息中心前台化：`messages` 分组显示（系统/成就/预算/提醒），支持全部已读。
2.9 预算细分：分类预算 map；列表显示已用金额与剩余天数平均允许支出。
2.10 预测模块 v1：基于过去 90 天平均支出 & 当前被动收入趋势，估算“距支出=被动收入”月份区间 (悲观/基准/乐观)。

3. 长期功能（>1 月）
3.1 AI 洞察：
- 支出分类自动建议（基于最近分类频次 + 关键词匹配）。
- 日记情绪与消费冲动相关性（滑动相关系数）。
- 周报生成（财务/技能/健康 3 段文案）。
3.2 社交/挑战：21 天挑战（习惯/节支/专注）；排行榜（储蓄率、专注小时、连续打卡）。
3.3 多端 & 同步冲突解决：记录含 `updatedAt` + 简单 last-write-wins；冲突日志提示用户合并。
3.4 自定义仪表盘网格：卡片尺寸 S/M/L，拖拽布局存 `dashboardLayout`。
3.5 语音快速记账：语音识别后正则抽取金额 + 可能类别候选。
3.6 安全 & 备份：加密导出（对称密钥）+ 云端增量备份 + 恢复向导。

4. 数据结构追加/调整
4.1 Todo: { id,title,done,priority,focus,wealthLeverType?,valueWeight?,doneAt?,estimateMinutes? }
4.2 Budget: { month, total, byCategory:{ categoryId:amount }, createdAt, updatedAt }
4.3 RecurringTemplate: { id, kind, category, amount, day, remark, active, lastRunMonth }
4.4 Message: { id,time,type,level?,text,read:false,meta? }
4.5 Milestone (per skill): { id, skillId, level, name, criteria:{ hours>=? | xp>=? }, bonusXP }
4.6 GrowthScore breakdown缓存: { date, components:{ leverage, focus, health, roi, fi }, total }

5. 关键算法/公式扩展
- 杠杆任务完成率（7 日） = 完成的 lever todos / 目标 leverTarget (默认 10)。
- GrowthScore = Σ(componentWeight * normalizedValue)（列出权重配置化）。
- 预算日均可用 = (预算总额 - 当月已支出) / (剩余天数)。
- 预测 FI 月：利用最近 N(月) passiveIncome 增量线性回归 → intercept 提供悲观/乐观 ±σ 区间。

6. 性能与架构
- 引入聚合缓存：`monthlySnapshots` 已有；新增 `weeklySnapshot`（周一计算）。
- 读写抽象层：`storageAdapter` 封装 get/set + 版本迁移；集中处理 Set 序列化。
- 模块拆分：`/utils/finance/` `roi/` `habit/` `skill/` `predict/`。
- 事件总线（轻量）：emit('bill:add',bill) → 监听器更新缓存/触发预算检查。

7. 埋点扩展（基于现有 track）
- budget_threshold_hit
- recurring_bill_generated
- weekly_review_open
- growth_score_view
- lever_task_completed
- milestone_unlocked
- passive_income_projection_run

8. UX 微交互
- 数字跃迁动画：净资产、被动收入、GrowthScore。
- 预算溢出抖动 + 色彩渐变。
- 目标达成全屏庆祝（Lottie）。
- 长按习惯弹出“三日趋势”小浮层。
- 账单分类选择：最近使用置顶 + 可搜索。

9. 优先级执行推荐（首 2 Sprint）
Sprint 1：预算页 + 周期账单提醒 + 目标卡片 + Dashboard 点击跳转 + 账单模板 + 埋点扩展 + 数据结构 version 迁移。
Sprint 2：周回顾 v1 + 任务杠杆字段 + 习惯分析热力图基础 + 成长引擎初版(只显示雷达) + 消息中心基础（系统/成就）。

10. 验证指标（新增）
- 预算功能 7 日使用率（设过预算的用户中≥1 次查看预算的比例）。
- 周回顾打开率 = 打开周回顾人数 / 周活跃数。
- 杠杆任务占比 = 已完成杠杆任务 / 全部完成任务；目标 ≥30%。
- GrowthScore 周提升（本周平均 - 上周平均）。
- 预测 ETA 可信度：实际 vs 预测误差中位数（目标 <20%）。

11. 未来 AI 对接预留
- `ai.generateWeeklyReview(data)` 返回 markdown。
- `ai.classifyTransaction(rawText)` → { amount, categoryCandidates[], confidence }。
- `ai.sentimentDiary(text)` → { moodScore, impulseScore }。

12. 风险补充
- 预算 & 周期账单双写冲突：锁定同一 day 生成操作（写日志先）。
- 预测误导：显示置信区间而非单一日期。
- 数据膨胀：图片/日志数量—提供“媒体清理”工具（按未访问天数排序）。

13. 简化落地顺序（技术视角 Checklist）
[] 添加 version & migration 管理
[] 抽出 storageAdapter
[] 预算 CRUD + 预算计算模块
[] 周期账单执行器（每日 onShow 触发）
[] Goal 详情页 + 目标卡点击跳转
[] Dashboard 卡 register/点击路由映射
[] 周回顾数据聚合函数 weeklyAggregator.js
[] GrowthScore 组件化（输入 metrics 输出分值）
[] Habit 热力图组件（单文件可复用）
[] 消息中心页 + read 状态

（以上为扩展补充，便于继续迭代规划。）



