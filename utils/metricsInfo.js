// actions 由 { label, type, action, gen? } 组成:
// type: 'nav' 跳转  'task' 生成任务  'habit' 生成习惯占位
// action: 页面路径或内部标识
module.exports = {
  fi: { title:'FI 进度', desc:'被动收入 / 必要支出。≥100% 达成。', formula:'FI% = (年化被动收入 / 年必要支出) × 100%', improve:['增加被动现金流','降低固定支出','提升储蓄率'], actions:[
    { label:'添加/更新资产', type:'nav', action:'/pages/finance/finance' },
    { label:'降低高额固定支出', type:'task', action:'reduce_fixed_cost' },
    { label:'记录新被动收入', type:'task', action:'add_passive_income' }
  ] },
  goal: { title:'目标进度', desc:'应急金 / 储蓄率 / 被动收入三目标完成度。', formula:'目标进度 = (应急金%+储蓄率%+被动进度%) / 3', improve:['补齐应急金','提高储蓄率','增加被动资产'], actions:[
    { label:'补应急金', type:'task', action:'emergency_fund' },
    { label:'提升储蓄率', type:'task', action:'increase_savings_rate' },
    { label:'新增被动资产', type:'nav', action:'/pages/finance/finance' }
  ] },
  budget: { title:'本月预算', desc:'当月预算使用率。≥80% 预警。', formula:'使用率 = 本月已支出 / 预算总额', improve:['设置类别预算','复盘大额支出','设立超支提醒'], actions:[
    { label:'设置子类预算', type:'nav', action:'/pages/budget/budget' },
    { label:'复盘大额支出', type:'task', action:'review_big_expense' },
    { label:'设超支提醒', type:'task', action:'set_budget_alert' }
  ] },
  savings: { title:'储蓄率', desc:'(收入-支出)/收入。', formula:'储蓄率 = (总收入 - 总支出) / 总收入', improve:['记录全部收入','控制冲动消费','提升副业收入'], actions:[
    { label:'记录全部收入', type:'task', action:'log_all_income' },
    { label:'压缩低 ROI 支出', type:'task', action:'cut_low_roi_expense' },
    { label:'副业提升收入', type:'task', action:'side_income' }
  ] },
  focus: { title:'专注小时', desc:'今日深度专注总时长。', formula:'专注小时 = 今日番茄累计分钟 / 60', improve:['固定时间块','减少上下文切换','复盘分心来源'], actions:[
    { label:'开始番茄', type:'nav', action:'/pages/pomodoro/pomodoro' },
    { label:'预留时间块', type:'task', action:'schedule_time_block' },
    { label:'减少上下文切换', type:'task', action:'reduce_context_switch' }
  ] },
  roi: { title:'技能 ROI', desc:'投入/产出估算排序前 3。', formula:'ROI% ≈ (预期年收益增量 × 置信度 / (投入时间×时间成本+投入成本)) × 100%', improve:['量化预期收益','淘汰低回报技能','记录学习时长'], actions:[
    { label:'记录学习时长', type:'task', action:'log_skill_time' },
    { label:'设量化产出', type:'task', action:'define_skill_output' },
    { label:'淘汰低回报技能', type:'task', action:'drop_low_roi_skill' }
  ] },
  lever: { title:'杠杆完成', desc:'近 7 天完成的高杠杆任务数。', formula:'杠杆完成 = 近7天高杠杆任务完成数', improve:['拆分高杠杆任务','安排周计划','复盘收益'], actions:[
    { label:'拆分高杠杆任务', type:'task', action:'breakdown_lever_task' },
    { label:'安排到本周', type:'task', action:'schedule_lever_task' },
    { label:'复盘收益', type:'task', action:'review_lever_result' }
  ] },
  growth: { title:'成长指数', desc:'连续性 + 杠杆性 综合得分。', formula:'加权=杠杆*W1 + 专注*W2 + 健康*W3 + 技能ROI*W4 + FI*W5', improve:['保持连续行动','优先高杠杆事项','保障健康与被动进度'], actions:[
    { label:'保持连续打卡', type:'task', action:'keep_consistency' },
    { label:'优先高杠杆事项', type:'task', action:'prioritize_lever' },
    { label:'关注健康与 FI', type:'nav', action:'/pages/finance/finance' }
  ] },
  habit: { title:'习惯影响', desc:'习惯年化正向价值估算。', formula:'影响值 = Σ(单习惯年化价值)', improve:['为习惯估算价值','新增高影响习惯','淘汰低价值习惯'], actions:[
    { label:'设置年化价值', type:'nav', action:'/pages/habit/habit' },
    { label:'新增高影响习惯', type:'habit', action:'create_high_impact_habit' },
    { label:'淘汰低价值习惯', type:'habit', action:'remove_low_value_habit' }
  ] },
  health: { title:'健康达标', desc:'本周运动分钟 / 目标。', formula:'健康% = 本周运动分钟 / 目标分钟 × 100%', improve:['拆分短运动块','设定周目标','番茄间隙活动'], actions:[
    { label:'拆分短运动块', type:'task', action:'micro_workout' },
    { label:'设置周分钟目标', type:'nav', action:'/pages/sport/sport' },
    { label:'番茄间隙活动', type:'task', action:'pomodoro_break_activity' }
  ] },
  fiCoverage: { title:'FI 覆盖率', desc:'当前被动收入对目标被动（或年支出）的覆盖百分比。', formula:'覆盖率 = (当前年化被动 / 目标年化被动) × 100%', improve:['提升储蓄率扩大可投资额','新增被动资产来源','提高技能年化增值'], actions:[
    { label:'新增/更新资产', type:'nav', action:'/pages/finance/finance' },
    { label:'提升储蓄率', type:'task', action:'increase_savings_rate' },
    { label:'规划技能增值', type:'nav', action:'/pages/skill/skill' }
  ] },
  compound: { title:'复合分数', desc:'专注 / 储蓄 / 习惯 / 健康 / 技能增值 / FI 覆盖 六维加权综合。反映整体复利健康度。', formula:'Σ(规范化指标 × 动态权重)', improve:['查找最低维度优先补齐','保持指标差距不失衡','聚焦提升被动驱动与技能'], actions:[
    { label:'查看技能 ROI', type:'nav', action:'/pages/skill/skill' },
    { label:'补齐弱项任务', type:'task', action:'fix_weak_dimension' },
    { label:'提高健康与专注', type:'task', action:'improve_health_focus' }
  ] }
};
