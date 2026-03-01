const app = getApp();
const { calcGoalProgress } = require('../../utils/finance');
const { awardAction } = require('../../utils/award');
const { track } = require('../../utils/track');
Page({
  data:{
    emergency:{ pct:0 },
    savingsRate:{ pct:0 },
    freedomPassive:{ pct:0 },
    goalForm:{ emergencyFundTarget:'', savingsRateTarget:'', freedomPassiveTarget:'' }
  },
  onShow(){ this.refresh(); },
  refresh(){
    const gp = calcGoalProgress(app);
    const g = app.globalData.goals || {};
    this.setData({
      emergency: gp.emergency,
      savingsRate: gp.savingsRate,
      freedomPassive: gp.freedomPassive,
      goalForm:{ emergencyFundTarget: g.emergencyFundTarget||'', savingsRateTarget: g.savingsRateTarget||'', freedomPassiveTarget: g.freedomPassiveTarget||'' }
    });
  },
  inputGoal(e){ const f=e.currentTarget.dataset.field; this.setData({ [`goalForm.${f}`]: e.detail.value }); },
  saveGoals(){
    const f=this.data.goalForm; const g=app.globalData.goals;
    g.emergencyFundTarget=Number(f.emergencyFundTarget)||0;
    g.savingsRateTarget=Number(f.savingsRateTarget)||0;
    g.freedomPassiveTarget=Number(f.freedomPassiveTarget)||0;
  app.persist(); wx.showToast({ title:'已保存', icon:'success' }); this.refresh();
  // 300ms 后返回上一页（等待 Toast 显示 & 刷新完成）
  setTimeout(()=>{ try{ wx.navigateBack({ delta:1 }); }catch(e){} }, 300);
  try{ track && track('goal_created', { emergency:g.emergencyFundTarget, savingsRate:g.savingsRateTarget, passiveTarget:g.freedomPassiveTarget }); }catch(e){}
  if(app.globalData._needGoalOnboard){ app.globalData._onboardGoalDone=true; app.globalData._needGoalOnboard=false; try{ track && track('onboarding_completed',{ ts:Date.now() }); }catch(e){} app.persist(); }
  try{ awardAction(app,'goal_update',{}); }catch(e){}
  }
  ,recommendAll(){
    // 智能推荐：应急金=近30天支出均值*6（无数据用30000），储蓄率=40，被动收入=年度支出或 120000 兜底
    const g = app.globalData; const cutoff = Date.now()-30*86400000;
    const bills = (g.bills||[]).filter(b=> b.kind==='out' && b.datetime && new Date(b.datetime).getTime()>=cutoff);
    const sum = bills.reduce((s,b)=> s+Number(b.amount||0),0);
    const monthExpense = bills.length ? (sum/30*30) : 5000*6; // 近30天推月，兜底 5000*6=30000
    const emergency = Math.round(monthExpense*6/6); // monthExpense 已代表月支出
    // 年度支出估算：已有年度 out 合计 或 月×12
    const annualOut = (g.bills||[]).filter(b=> b.kind==='out').reduce((s,b)=> s+Number(b.amount||0),0);
    const expenseYearEst = annualOut>0? annualOut : Math.round((monthExpense)*12/6); // 若 monthExpense 是6个月的?上面 monthExpense 实际是月；这里乘12
    this.setData({ 'goalForm.emergencyFundTarget': String(emergency), 'goalForm.savingsRateTarget':'40', 'goalForm.freedomPassiveTarget': String(expenseYearEst) });
    wx.showToast({ title:'已填入推荐', icon:'none' });
    try{ track && track('goal_recommend_all',{ emergency, savingsRate:40, passive: expenseYearEst }); }catch(e){}
  }
});
