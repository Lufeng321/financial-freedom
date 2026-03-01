// 全局入口：初始化云开发 & 提供简单内存数据仓库
App({
  onLaunch() {
    if (!wx.cloud) {
      console.warn('当前基础库版本过低，云能力不可用');
    } else {
      try{
        const { envId } = require('./config/cloud-env');
        wx.cloud.init({
          traceUser: true,
          env: envId || undefined,
        });
        console.log('[cloud] init env =', envId);
      }catch(e){
        wx.cloud.init({ traceUser:true });
        console.warn('cloud init without explicit env', e);
      }
    }
    // 使用 storageAdapter 统一加载并执行迁移
    try{
      const { load } = require('./utils/storageAdapter');
      const persisted = load();
      Object.assign(this.globalData, persisted);
    }catch(e){
      const persisted = wx.getStorageSync('pg_data') || {};
      Object.assign(this.globalData, persisted);
    }
  // 规范化数据结构
  try{ const { normalizeGlobalData } = require('./utils/normalize'); normalizeGlobalData(this.globalData); }catch(e){}
    // 首次启动目标引导标记
    if(!this.globalData._onboardGoalDone){ this.globalData._needGoalOnboard = true; }
  },
  globalData: {
    bills: [],
    assets: [],
    liabilities: [],
  billTemplates: [], // 记账模板
  recurringTemplates: [], // 周期账单模板 {id, kind, incomeType, expenseType, category, amount, day, remark}
  recurringExecLogs: [], // 周期执行日志 {id, templateId, datetime, amount}
  achievements: [], // 成就 {id,name,unlocked,time,desc}
  settings:{ taxRateDefault:0.1, hourCost:100 },
    categories: [ // 初始分类（可扩展）
      { id:'c_in_salary', name:'工资', kind:'in', order:1 },
      { id:'c_in_side', name:'副业', kind:'in', order:2 },
      { id:'c_in_dividend', name:'分红', kind:'in', order:3 },
      { id:'c_in_interest', name:'利息', kind:'in', order:4 },
      { id:'c_in_rent', name:'租金', kind:'in', order:5 },
      { id:'c_out_food', name:'餐饮', kind:'out', order:1 },
      { id:'c_out_transport', name:'交通', kind:'out', order:2 },
      { id:'c_out_housing', name:'住房', kind:'out', order:3 },
      { id:'c_out_study', name:'学习', kind:'out', order:4 },
      { id:'c_out_fun', name:'娱乐', kind:'out', order:5 }
    ],
    budgets: { /* 'YYYY-MM': { expenseBudget: number } */ },
  monthlySnapshots: {}, // {'YYYY-MM': { month, income, passiveRealized, passiveEstimated, expense, netAsset, savings, savingsRate, debtPayment, dti, generatedAt, billCount}}
    goals: {
      emergencyFundTarget: 0,      // 目标应急金金额
      savingsRateTarget: 40,       // 目标储蓄率 %
      freedomPassiveTarget: 0      // 目标年度被动收入 (可留空=自动用年度支出)
    },
    goalsStatus: {
      emergencyDone:false,
      savingsRateDone:false,
      freedomPassiveDone:false
    },
    habits: [
      { id: 'h1', name: '早起', days: new Set(), streak: 0 },
      { id: 'h2', name: '阅读30分钟', days: new Set(), streak: 0 }
    ],
    todos: [
      { id: 't1', title: '写周计划', done: false, priority: 'high', focus: true },
      { id: 't2', title: '运动拉伸', done: false, priority: 'normal', focus: false }
    ],
  sportRecords: [],
  sessions: [], // 番茄 session 记录 {id, skillId, minutes, focusQuality, ts}
    skills: [
      { id: 's1', name: '编程', xp: 120 },
      { id: 's2', name: '英语', xp: 60 }
    ],
    diaryList: [],
    messages: [],
  xp: 0,
  level: 1,
  growthStats: {
    wealthLeverCompleted: 0,
    leverageXPBonus: 0
  },
  // 去重后的设置已上移
  },
  persist() {
    const g = this.globalData;
    // 不能直接存 Set，转换
    const habits = g.habits.map(h => ({ ...h, days: Array.from(h.days) }));
  wx.setStorageSync('pg_data', { ...g, habits });
  },
  addXP(amount, reason) {
    const g = this.globalData;
    g.xp += amount;
    // 升级判定：level^2 *100
    while (g.xp >= g.level * g.level * 100) {
      g.level++;
      this.pushMessage({ type: 'level', text: `恭喜达到 Lv${g.level}` });
    }
    if (reason) this.pushMessage({ type: 'xp', text: `+${amount} XP (${reason})` });
    this.persist();
  },
  unlockAchievement(key, desc){
    const g=this.globalData;
    if(g.achievements.find(a=>a.id===key)) return; // already
    const ach={ id:key, name:desc||key, unlocked:true, time:Date.now(), desc };
    g.achievements.push(ach);
    this.pushMessage({ type:'achievement', text:`🎉 成就达成：${desc||key}` });
    this.addXP(30,'成就');
  },
  pushMessage(msg) {
  // 消息中心分类：系统(system) / 成就(achievement/level/xp) / 预算(budget) / 提醒(remind)
  let group='system';
  if(msg.type==='achievement' || msg.type==='level' || msg.type==='xp') group='achievement';
  else if(msg.type && msg.type.indexOf('budget')===0) group='budget';
  else if(msg.type && (msg.type.indexOf('remind')===0 || msg.type.indexOf('notify')===0)) group='remind';
  this.globalData.messages.unshift({ id: Date.now() + '' + Math.random(), time: Date.now(), read:false, group, ...msg });
  if(this.globalData.messages.length>500) this.globalData.messages.length=500; // 截断
  }
});
