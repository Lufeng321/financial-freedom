// 财务相关计算工具
function loanMonthlyPayment(principal, annualRate, months){
  principal = Number(principal)||0; annualRate=Number(annualRate)||0; months=Number(months)||0;
  if(principal<=0 || months<=0) return 0;
  const r = annualRate/12; if(r<=0) return +(principal/months).toFixed(2);
  const pow = Math.pow(1+r, months);
  const pay = principal * r * pow / (pow - 1);
  return +pay.toFixed(2);
}

function calcFinance(state){
  const { bills = [], assets = [], liabilities = [] } = state;
  // 年度账单统计（未来可缓存月度聚合）
  const passiveIncomeYear = bills.filter(b=>b.kind==='in' && b.incomeType==='passive')
    .reduce((s,b)=>s+Number(b.amount||0),0);
  const totalIncomeYear = bills.filter(b=>b.kind==='in')
    .reduce((s,b)=>s+Number(b.amount||0),0);
  const expenseYear = bills.filter(b=>b.kind==='out')
    .reduce((s,b)=>s+Number(b.amount||0),0);
  const activeIncomeYear = totalIncomeYear - passiveIncomeYear;
  // 资产预估被动收益（简单：本金 * 年化）
  const assetsPassive = assets.reduce((s,a)=>s + (Number(a.amount||0) * Number(a.roi||0)),0);
  const realizedPassive = passiveIncomeYear; // 已实现
  const estimatedPassive = assetsPassive; // 预估
  const dayPassive = (passiveIncomeYear + assetsPassive) / 365;
  const dayExpense = (expenseYear / 365) || 1; // 避免除零
  const rawFreedom = Number(((dayPassive / dayExpense) * 100).toFixed(1));
  const cappedFreedom = Math.min(100, rawFreedom);
  const netAsset = assets.reduce((s,a)=>s+Number(a.amount||0),0) - liabilities.reduce((s,l)=>s+Number(l.amount||0),0);
  const savings = totalIncomeYear - expenseYear;
  const savingsRate = totalIncomeYear>0 ? +(savings/totalIncomeYear*100).toFixed(1) : 0;
  const safetyMarginPercent = rawFreedom>100 ? +(rawFreedom-100).toFixed(1) : 0;
  // 年度债务还款(粗略)：优先使用 monthlyPayment，其次用公式推算
  const annualDebtPayment = liabilities.reduce((s,l)=>{
    const mp = l.monthlyPayment ? Number(l.monthlyPayment) : loanMonthlyPayment(l.amount, l.rate, l.remainTermMonths);
    return s + (mp*12 || 0);
  },0);
  const dti = totalIncomeYear>0 ? +(annualDebtPayment/totalIncomeYear*100).toFixed(1) : 0;
  return {
    freedom: cappedFreedom,      // 供仪表盘（0-100 环）
    freedomRaw: rawFreedom,      // 真实可 >100 用于显示安全垫
    dayPassive: +dayPassive.toFixed(2),
    dayExpense: +dayExpense.toFixed(2),
    netAsset: +netAsset.toFixed(2),
    expenseYear: +expenseYear.toFixed(2),
    passiveIncomeYear: +passiveIncomeYear.toFixed(2),
    assetsPassive: +assetsPassive.toFixed(2),
    totalIncomeYear: +totalIncomeYear.toFixed(2),
    activeIncomeYear: +activeIncomeYear.toFixed(2),
    savings: +savings.toFixed(2),
    savingsRate, // 百分数值
    safetyMarginPercent,
    realizedPassive: +realizedPassive.toFixed(2),
    estimatedPassive: +estimatedPassive.toFixed(2),
    annualDebtPayment: +annualDebtPayment.toFixed(2),
    dti
  };
}

// 提炼纯函数：储蓄率 & FI 进度 (自由度)
function calcSavingsRate(totalIncomeYear, expenseYear){
  totalIncomeYear=Number(totalIncomeYear)||0; expenseYear=Number(expenseYear)||0;
  if(totalIncomeYear<=0) return 0;
  return +(((totalIncomeYear - expenseYear)/ totalIncomeYear)*100).toFixed(1);
}
function calcFIProgress(passiveIncomeYear, assetsPassive, expenseYear){
  passiveIncomeYear=Number(passiveIncomeYear)||0; assetsPassive=Number(assetsPassive)||0; expenseYear=Number(expenseYear)||0;
  if(expenseYear<=0) return 0;
  const dayPassive = (passiveIncomeYear + assetsPassive)/365;
  const dayExpense = expenseYear/365 || 1;
  return Math.min(100, +((dayPassive/dayExpense)*100).toFixed(1));
}
function buildMonthlySnapshot(state, month){
  const { bills = [], assets = [], liabilities = [] } = state;
  const [y,m] = month.split('-');
  const monthBills = bills.filter(b=> b.datetime && b.datetime.startsWith(`${y}-${m}`));
  const income = monthBills.filter(b=>b.kind==='in').reduce((s,b)=>s+Number(b.amount||0),0);
  const realizedPassive = monthBills.filter(b=>b.kind==='in' && b.incomeType==='passive').reduce((s,b)=>s+Number(b.amount||0),0);
  const expense = monthBills.filter(b=>b.kind==='out').reduce((s,b)=>s+Number(b.amount||0),0);
  // 预估当月资产收益：年化收益 /12 (简化模型)
  const passiveEstimated = assets.reduce((s,a)=>s + (Number(a.amount||0) * Number(a.roi||0))/12,0);
  const netAsset = assets.reduce((s,a)=>s+Number(a.amount||0),0) - liabilities.reduce((s,l)=>s+Number(l.amount||0),0);
  const savings = income - expense;
  const savingsRate = income>0? +(savings/income*100).toFixed(1):0;
  const debtPayment = liabilities.reduce((s,l)=>{
    const mp = l.monthlyPayment ? Number(l.monthlyPayment) : loanMonthlyPayment(l.amount, l.rate, l.remainTermMonths);
    return s + (mp||0);
  },0);
  const dti = income>0? +(debtPayment*12/income*100).toFixed(1):0;
  return {
    month,
    income:+income.toFixed(2),
    passiveRealized:+realizedPassive.toFixed(2),
    passiveEstimated:+passiveEstimated.toFixed(2),
    expense:+expense.toFixed(2),
    netAsset:+netAsset.toFixed(2),
    savings:+savings.toFixed(2),
    savingsRate,
    debtPayment:+debtPayment.toFixed(2),
    dti,
    billCount: monthBills.length,
    generatedAt: Date.now()
  };
}

function ensureCurrentMonthSnapshot(app){
  const g = app.globalData;
  const month = new Date().toISOString().slice(0,7);
  if(!g.monthlySnapshots) g.monthlySnapshots = {};
  const currentBills = g.bills.filter(b=> b.datetime && b.datetime.startsWith(month));
  const snap = g.monthlySnapshots[month];
  if(!snap || snap.billCount !== currentBills.length){
    g.monthlySnapshots[month] = buildMonthlySnapshot(g, month);
    app.persist && app.persist();
  }
  return g.monthlySnapshots[month];
}

function getRecentSnapshots(app, n=6){
  const g = app.globalData; if(!g.monthlySnapshots) return [];
  return Object.keys(g.monthlySnapshots).sort().slice(-n).map(k=>g.monthlySnapshots[k]);
}

function calcGoalProgress(app){
  const g = app.globalData; const metrics = calcFinance(g); const goals = g.goals || {};
  const emergencyTarget = Number(goals.emergencyFundTarget)||0;
  const emergencyFund = (g.assets||[]).filter(a=>a.liquidity==='high').reduce((s,a)=>s+Number(a.amount||0),0);
  const emergencyPct = emergencyTarget>0? Math.min(100, +(emergencyFund/emergencyTarget*100).toFixed(1)) : 0;
  const savingsRateTarget = Number(goals.savingsRateTarget)||0;
  const savingsRatePct = savingsRateTarget>0? Math.min(100, +(metrics.savingsRate/savingsRateTarget*100).toFixed(1)) : 0;
  const passiveTarget = Number(goals.freedomPassiveTarget)||metrics.expenseYear||0;
  const passiveCurrent = metrics.passiveIncomeYear + metrics.assetsPassive;
  const passivePct = passiveTarget>0? Math.min(100, +(passiveCurrent/passiveTarget*100).toFixed(1)) : 0;
  const snaps = getRecentSnapshots(app, 3);
  let passiveETA='';
  if(passivePct<100 && snaps.length>=2){
    const deltas=[];
    for(let i=1;i<snaps.length;i++){
      const prev=snaps[i-1]; const cur=snaps[i];
      deltas.push((cur.passiveRealized+cur.passiveEstimated) - (prev.passiveRealized+prev.passiveEstimated));
    }
    const avgDelta = deltas.reduce((s,v)=>s+v,0)/deltas.length;
    if(avgDelta>0){
      const remaining = passiveTarget - passiveCurrent;
      const months = Math.ceil(remaining/avgDelta);
      const eta = new Date(new Date().getFullYear(), new Date().getMonth()+months, 1);
      passiveETA = eta.toISOString().slice(0,7);
    }
  }
  let emergencyETA='';
  if(emergencyPct<100 && snaps.length>=2){
    const deltas=[];
    for(let i=1;i<snaps.length;i++){
      const prev=snaps[i-1]; const cur=snaps[i];
      deltas.push(cur.netAsset - prev.netAsset);
    }
    const avgDelta = deltas.reduce((s,v)=>s+v,0)/deltas.length;
    const remaining = emergencyTarget - emergencyFund;
    if(avgDelta>0 && remaining>0){
      const months = Math.ceil(remaining/avgDelta);
      const eta = new Date(new Date().getFullYear(), new Date().getMonth()+months,1);
      emergencyETA = eta.toISOString().slice(0,7);
    }
  }
  // 被动收入多情景 (基准=当前增长, 乐观=+30%, 保守=-30%)
  let passiveScenarios=null;
  if(passivePct<100 && passiveETA){
    const snaps = getRecentSnapshots(app, 3);
    if(snaps.length>=2){
      const deltas=[];
      for(let i=1;i<snaps.length;i++){
        const prev=snaps[i-1]; const cur=snaps[i];
        deltas.push((cur.passiveRealized+cur.passiveEstimated) - (prev.passiveRealized+prev.passiveEstimated));
      }
      const base = deltas.reduce((s,v)=>s+v,0)/deltas.length;
      function etaFor(delta){
        if(delta<=0) return '';
        const remaining = passiveTarget - passiveCurrent;
        const months = Math.ceil(remaining/delta);
        const etaDate = new Date(new Date().getFullYear(), new Date().getMonth()+months,1);
        return etaDate.toISOString().slice(0,7);
      }
      passiveScenarios = {
        base: passiveETA,
        optimistic: etaFor(base*1.3),
        pessimistic: etaFor(base*0.7)
      };
    }
  }
  return {
    emergency:{ target: emergencyTarget, current: emergencyFund, pct: emergencyPct, eta: emergencyETA },
    savingsRate:{ target: savingsRateTarget, current: metrics.savingsRate, pct: savingsRatePct },
    freedomPassive:{ target: passiveTarget, current: passiveCurrent, pct: passivePct, eta: passiveETA, scenarios: passiveScenarios }
  };
}

module.exports.calcGoalProgress = calcGoalProgress;

function deriveMonthlyAggregates(bills){
  const map={};
  bills.forEach(b=>{
    if(!b.datetime) return; const key=b.datetime.slice(0,7);
    const m = map[key] || (map[key]={ month:key, income:0, incomePassive:0, expense:0 });
    if(b.kind==='in'){ m.income+=b.amount; if(b.incomeType==='passive') m.incomePassive+=b.amount; }
    else if(b.kind==='out'){ m.expense+=b.amount; }
  });
  return Object.values(map).map(m=>{ const savings=m.income-m.expense; const sr=m.income? (savings/m.income*100):0; return { ...m, savings, savingsRate:Number(sr.toFixed(1)) }; }).sort((a,b)=>a.month<b.month?1:-1);
}

function buildCategoryBreakdown(bills, kind){
  const sums={}; let total=0;
  bills.forEach(b=>{ if(b.kind!==kind) return; const cat=b.category||'未分类'; sums[cat]=(sums[cat]||0)+b.amount; total+=b.amount; });
  const list=Object.keys(sums).map(k=>({ category:k, amount:sums[k], pct: total? Number((sums[k]/total*100).toFixed(1)):0 }));
  list.sort((a,b)=>b.amount-a.amount);
  return { total, list };
}

module.exports = { calcFinance, loanMonthlyPayment, buildMonthlySnapshot, ensureCurrentMonthSnapshot, getRecentSnapshots, calcGoalProgress, deriveMonthlyAggregates, buildCategoryBreakdown, calcSavingsRate, calcFIProgress };
