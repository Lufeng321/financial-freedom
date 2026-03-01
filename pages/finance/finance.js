const app = getApp();
const { updateQuestProgress } = require('../../utils/quest');
// 统一成长激励使用 growthService.award
const { award } = require('../../utils/growthService');
const { calcFinance, ensureCurrentMonthSnapshot, getRecentSnapshots, calcGoalProgress } = require('../../utils/finance');

// 数字格式化工具（简单实现，可后续抽离）
function fmtMoney(n){
  if(n===undefined||n===null||n==='') return '-';
  const num = Number(n);
  if(isNaN(num)) return '-';
  return num.toLocaleString('zh-CN',{maximumFractionDigits:2});
}
function fmtPercent(n){
  if(n===undefined||n===null||isNaN(Number(n))) return '-';
  return Number(n).toFixed(1)+'%';
}

let calcTimer = null; // 防抖
Page({
  data:{
    metrics:{ freedom:0, dayPassive:0, dayExpense:0, netAsset:0 },
    assets:[], liabilities:[], assetsTotal:0, liabilitiesTotal:0,
    calc:{ expenseYear:'120000', asset:'0', roi:'0.05' },
    calcRes:{ target:0, gap:0 },
  freedomWidth:'0%',
  gapProgress:'0%',
  passiveYear:0,
  expenseYear:0,
  targetMsg:'',
  fiveYearPlan:[],
  recentSnapshots:[],
  goalsProgress:null,
  showGoalDialog:false,
  goalForm:{ emergencyFundTarget:'', savingsRateTarget:'', freedomPassiveTarget:'' },
  ringStyle:'',
  freedomPercent:0,
  showAssetDialog:false,
  showLiabilityDialog:false,
  assetForm:{ id:'', name:'', amount:'', roi:'', type:'cash', risk:'low', liquidity:'high' },
  liabilityForm:{ id:'', name:'', amount:'', rate:'', type:'loan', remainTermMonths:'', monthlyPayment:'' },
  assetTypeOptions:[{v:'cash',label:'现金'},{v:'fund',label:'基金'},{v:'stock',label:'股票'},{v:'bond',label:'债券'},{v:'realestate',label:'不动产'},{v:'pension',label:'养老金'},{v:'receivable',label:'应收款'}],
  riskOptions:[{v:'low',label:'低'},{v:'mid',label:'中'},{v:'high',label:'高'}],
  liquidityOptions:[{v:'high',label:'高'},{v:'mid',label:'中'},{v:'low',label:'低'}],
  liabilityTypeOptions:[{v:'loan',label:'贷款'},{v:'mortgage',label:'房贷'},{v:'credit',label:'信用卡'},{v:'other',label:'其他'}]
  },
  onShow(){ this.refresh(); const tabBar=this.getTabBar&&this.getTabBar(); if(tabBar){ tabBar.setSelectedByRoute(this.route); } },
  refresh(){
    const g=app.globalData; const metrics=calcFinance(g);
  // 快照（放在末尾以保证账单等数据已加载）
  ensureCurrentMonthSnapshot(app);
  const snaps = getRecentSnapshots(app,6);
  const goalsProgress = calcGoalProgress(app);
    const assets=g.assets; const liabilities=g.liabilities;
    const assetsTotal=assets.reduce((s,a)=>s+Number(a.amount||0),0);
    const liabilitiesTotal=liabilities.reduce((s,a)=>s+Number(a.amount||0),0);
    // 年度数据
    const passiveYear = g.bills.filter(b=>b.kind==='in' && b.incomeType==='passive').reduce((s,b)=>s+Number(b.amount||0),0) + assets.reduce((s,a)=>s + (Number(a.amount||0)*(Number(a.roi||0))),0);
    const expenseYear = g.bills.filter(b=>b.kind==='out').reduce((s,b)=>s+Number(b.amount||0),0);
  const safety = metrics.freedomRaw>100 ? (metrics.freedomRaw-100).toFixed(1) : null;
  const targetMsg = metrics.freedomRaw>=100 ? `🎉 已达到财务自由，安全垫 +${safety}%` : `进度 ${metrics.freedomRaw.toFixed(1)}%，还差 ${(100-metrics.freedomRaw).toFixed(1)}% · 储蓄率 ${metrics.savingsRate}%`;
    const pct = Math.min(100, metrics.freedomRaw);
    const deg = pct * 3.6; // 转换为角度
    const ringStyle = `background:conic-gradient(#3366ff 0deg,#3366ff ${deg}deg,#e5e7eb ${deg}deg);`;
    this.setData({ 
      metrics, 
      assets, 
      liabilities, 
      assetsTotalFmt: fmtMoney(assetsTotal),
      liabilitiesTotalFmt: fmtMoney(liabilitiesTotal),
      netAssetFmt: fmtMoney(metrics.netAsset),
      assetsTotal, liabilitiesTotal, 
      freedomWidth:`${pct}%`, 
      passiveYear:Math.round(passiveYear), 
      expenseYear:Math.round(expenseYear), 
      passiveYearFmt: fmtMoney(passiveYear),
      expenseYearFmt: fmtMoney(expenseYear),
      targetMsg,
      ringStyle, 
      freedomPercent: metrics.freedomRaw.toFixed(1),
      goalsProgress
    });
  this.setData({ recentSnapshots: snaps });
    this.calcCompute();
  this.checkGoalRewards();
  },
  openGoalDialog(){
    const g = app.globalData.goals||{};
    this.setData({ showGoalDialog:true, goalForm:{ emergencyFundTarget:String(g.emergencyFundTarget||''), savingsRateTarget:String(g.savingsRateTarget||''), freedomPassiveTarget:String(g.freedomPassiveTarget||'') } });
  },
  closeGoalDialog(){ this.setData({ showGoalDialog:false }); },
  goalInput(e){ const f=e.currentTarget.dataset.field; this.setData({ [`goalForm.${f}`]: e.detail.value }); },
  submitGoals(){
    const g = app.globalData; const f=this.data.goalForm;
  g.goals.emergencyFundTarget = Number(f.emergencyFundTarget)||0;
  g.goals.savingsRateTarget = Number(f.savingsRateTarget)||0;
  g.goals.freedomPassiveTarget = Number(f.freedomPassiveTarget)||0;
    app.persist&&app.persist();
    wx.showToast({ title:'已保存', icon:'success' });
    this.setData({ showGoalDialog:false });
    this.refresh();
  try{ award(app,'goal_update',{}); }catch(e){}
  },
  recommendEmergency(){
    // 近 30 天支出均值 * 6
    const g=app.globalData; const now=new Date(); const cutoff=Date.now()-30*86400000;
    const recentOut = (g.bills||[]).filter(b=>b.kind==='out' && b.datetime && new Date(b.datetime).getTime()>=cutoff);
    const sum = recentOut.reduce((s,b)=>s+Number(b.amount||0),0);
    const daily = recentOut.length? sum/30 : 0;
    const target = Math.round(daily*30*6); // 月支出≈30*daily
    this.setData({ 'goalForm.emergencyFundTarget': String(target) });
  },
  checkGoalRewards(){
    const g=app.globalData; const prog=this.data.goalsProgress; if(!prog) return;
    const st = g.goalsStatus || (g.goalsStatus={});
  if(prog.emergency.pct>=100 && !st.emergencyDone){ st.emergencyDone=true; try{ award(app,'achievement_unlock',{ key:'goal_emergency', xpOverride:50 }); }catch(e){ app.addXP && app.addXP(50,'完成应急金目标'); } }
  if(prog.savingsRate.pct>=100 && !st.savingsRateDone){ st.savingsRateDone=true; try{ award(app,'achievement_unlock',{ key:'goal_savingsRate', xpOverride:30 }); }catch(e){ app.addXP && app.addXP(30,'达到储蓄率目标'); } }
  if(prog.freedomPassive.pct>=100 && !st.freedomPassiveDone){ st.freedomPassiveDone=true; try{ award(app,'achievement_unlock',{ key:'goal_freedomPassive', xpOverride:100 }); }catch(e){ app.addXP && app.addXP(100,'实现被动收入目标'); } }
    app.persist&&app.persist();
  },
  goalBarClass(pct){
    if(pct>=80) return 'ok'; if(pct>=40) return 'warn'; return 'bad';
  },
  openAssetDialog(e){
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if(id){
      const item = this.data.assets.find(a=>a.id===id);
      if(item){ this.setData({ assetForm:{...item} }); }
    } else { this.setData({ assetForm:{ id:'', name:'', amount:'', roi:'', type:'cash', risk:'low', liquidity:'high' } }); }
    const { assetTypeOptions, riskOptions, liquidityOptions, assetForm } = this.data;
    this.setData({ 
      showAssetDialog:true,
      assetAdvanced:false,
      assetTypeLabel: (assetTypeOptions.find(i=>i.v===assetForm.type)||{}).label,
      riskLabel: (riskOptions.find(i=>i.v===assetForm.risk)||{}).label,
      liquidityLabel: (liquidityOptions.find(i=>i.v===assetForm.liquidity)||{}).label
    });
  },
  toggleAssetAdvanced(){ this.setData({ assetAdvanced: !this.data.assetAdvanced }); },
  closeAssetDialog(){ this.setData({ showAssetDialog:false }); },
  submitAsset(e){
    const fd = e.detail.value; const id = fd.id || Date.now()+''+Math.random();
    if(!fd.name){ wx.showToast({ title:'名称必填', icon:'none' }); return; }
    if(Number(fd.amount)<0){ wx.showToast({ title:'金额不能为负', icon:'none' }); return; }
    let roi = Number(fd.roi||0); if(roi>1) roi = roi/100; if(roi<0){ wx.showToast({ title:'ROI无效', icon:'none' }); return; }
    const rec = { id, name: fd.name||'资产', amount:Number(fd.amount||0), roi, type:fd.type||'cash', risk:fd.risk||'low', liquidity:fd.liquidity||'high' };
    const idx = app.globalData.assets.findIndex(a=>a.id===id);
    if(idx>-1) app.globalData.assets[idx]=rec; else app.globalData.assets.push(rec);
    app.persist && app.persist();
    this.setData({ showAssetDialog:false });
    this.refresh();
  try{ updateQuestProgress('finance',1); }catch(e){}
  try{ award(app,'finance_asset',{ id }); }catch(e){}
  },
  assetTypePick(e){ const idx = Number(e.detail.value); const opt=this.data.assetTypeOptions[idx]; this.setData({ 'assetForm.type': opt.v, assetTypeLabel: opt.label }); },
  assetRiskPick(e){ const idx=Number(e.detail.value); const opt=this.data.riskOptions[idx]; this.setData({ 'assetForm.risk': opt.v, riskLabel: opt.label }); },
  assetLiquidityPick(e){ const idx=Number(e.detail.value); const opt=this.data.liquidityOptions[idx]; this.setData({ 'assetForm.liquidity': opt.v, liquidityLabel: opt.label }); },
  deleteAsset(){
    const id = this.data.assetForm.id;
    if(!id) return this.setData({ showAssetDialog:false });
    const arr = app.globalData.assets || [];
    const idx = arr.findIndex(a=>a.id===id);
    if(idx>-1){ arr.splice(idx,1); app.persist && app.persist(); }
    this.setData({ showAssetDialog:false });
    this.refresh();
  },
  openLiabilityDialog(e){
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if(id){
      const item = this.data.liabilities.find(a=>a.id===id);
      if(item){ this.setData({ liabilityForm:{...item} }); }
    } else { this.setData({ liabilityForm:{ id:'', name:'', amount:'', rate:'', type:'loan', remainTermMonths:'', monthlyPayment:'' } }); }
  const { liabilityTypeOptions, liabilityForm } = this.data;
  this.setData({ showLiabilityDialog:true, liabilityTypeLabel: (liabilityTypeOptions.find(i=>i.v===liabilityForm.type)||{}).label });
  },
  closeLiabilityDialog(){ this.setData({ showLiabilityDialog:false }); },
  submitLiability(e){
    const fd = e.detail.value; const id = fd.id || Date.now()+''+Math.random();
    if(!fd.name){ wx.showToast({ title:'名称必填', icon:'none' }); return; }
    if(Number(fd.amount)<0){ wx.showToast({ title:'金额不能为负', icon:'none' }); return; }
    let rate = Number(fd.rate||0); if(rate>1) rate = rate/100; if(rate<0){ wx.showToast({ title:'利率无效', icon:'none' }); return; }
    const rec = { id, name: fd.name||'负债', amount:Number(fd.amount||0), rate, type:fd.type||'loan', remainTermMonths:Number(fd.remainTermMonths)||'', monthlyPayment: fd.monthlyPayment? Number(fd.monthlyPayment): '' };
    const idx = app.globalData.liabilities.findIndex(a=>a.id===id);
    if(idx>-1) app.globalData.liabilities[idx]=rec; else app.globalData.liabilities.push(rec);
    app.persist && app.persist();
    this.setData({ showLiabilityDialog:false });
    this.refresh();
  try{ updateQuestProgress('finance',1); }catch(e){}
  try{ award(app,'finance_liability',{ id }); }catch(e){}
  },
  liabilityTypePick(e){ const idx=Number(e.detail.value); const opt=this.data.liabilityTypeOptions[idx]; this.setData({ 'liabilityForm.type': opt.v, liabilityTypeLabel: opt.label }); },
  deleteLiability(){
    const id = this.data.liabilityForm.id;
    if(!id) return this.setData({ showLiabilityDialog:false });
    const arr = app.globalData.liabilities || [];
    const idx = arr.findIndex(a=>a.id===id);
    if(idx>-1){ arr.splice(idx,1); app.persist && app.persist(); }
    this.setData({ showLiabilityDialog:false });
    this.refresh();
  },
  calcInput(e){
    const f=e.currentTarget.dataset.field; let v = e.detail.value;
    // ROI 兼容：如果用户输入 >1 视为百分数
    if(f==='roi'){
      const num = Number(v);
      if(!isNaN(num) && num>1) v = (num/100).toFixed(4);
    }
    this.setData({ [`calc.${f}`]: v });
    if(calcTimer) clearTimeout(calcTimer);
    calcTimer = setTimeout(()=>this.calcCompute(),250);
  },
  calcCompute(){
    const { expenseYear, asset, roi } = this.data.calc;
    const exp = Number(expenseYear)||0; const as = Number(asset)||0; const r = (Number(roi)||0.05);
    // 校验
    if(r<=0){ return this.setData({ calcRes:{ target:0, gap:0, err:'年化回报率必须>0' }, gapProgress:'0%' }); }
    const target = exp / r;
    const gap = target - as;
    const progress = target>0? Math.min(100, (as/target*100)) : 0;
    // 五年被动收入计划（复利简单预测）
    const basePassive = this.data.passiveYear || 0; const plan=[]; let currentPassive=basePassive; for(let y=1;y<=5;y++){ currentPassive = currentPassive*(1+r)+ as*r; plan.push({ year:y, passive:Math.round(currentPassive), hitFreedom: currentPassive >= exp }); }
  this.setData({ calcRes:{ target:Math.round(target), gap:Math.round(gap), err:'' }, gapProgress:`${progress}%`, fiveYearPlan:plan });
  }
});