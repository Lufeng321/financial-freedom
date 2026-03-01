const app = getApp();

function calcMonthExpense(month, bills){
  return bills.filter(b=> b.kind==='out' && b.datetime && b.datetime.startsWith(month))
    .reduce((s,b)=> s + Number(b.amount||0), 0);
}

Page({
  data:{
    month: new Date().toISOString().slice(0,7),
    form:{ expenseBudget:'' },
    usedAmount:0,
    progressPct:0,
    progressState:'', // normal | warn | danger
    showCategoryBudgets:false,
    showCatEdit:false,
    catBudgets:[],
    newCatName:'',
    newCatAmount:''
  },
  onShow(){ this.init(); },
  init(){
    const g=app.globalData; const month=this.data.month; const bud=(g.budgets&&g.budgets[month])||{};
    const used=calcMonthExpense(month, g.bills||[]);
    const total=Number(bud.expenseBudget)||0;
    const pct = total>0? Math.min(999, +(used/total*100).toFixed(1)):0;
    let state=''; if(total>0){ if(pct>=100) state='danger'; else if(pct>=80) state='warn'; }
    const byCat = bud.byCategory || {};
    const catBudgets = Object.keys(byCat).map(k=>({ cat:k, amount:byCat[k] }));
    this.setData({
      form:{ expenseBudget: total? String(total):'' },
      usedAmount: +used.toFixed(2),
      progressPct: pct,
      progressState: state,
      catBudgets
    });
  },
  changeMonth(e){ this.setData({ month: e.detail.value.slice(0,7) }, ()=> this.init()); },
  inputBudget(e){ const v=e.detail.value; this.setData({ 'form.expenseBudget': v }); },
  saveBudget(){
    const g=app.globalData; const month=this.data.month; if(!g.budgets) g.budgets={};
    const val = Number(this.data.form.expenseBudget)||0;
    const prev = g.budgets[month] || {}; g.budgets[month] = { ...prev, expenseBudget: val, byCategory: prev.byCategory||{} };
    app.persist(); this.init(); wx.showToast({ title:'已保存', icon:'success' });
  },
  toggleCatBudgets(){ this.setData({ showCatEdit: !this.data.showCatEdit }); },
  editCatAmount(e){
    const cat=e.currentTarget.dataset.cat; const v=Number(e.detail.value)||0; const g=app.globalData; const month=this.data.month; if(!g.budgets) g.budgets={}; const bud=g.budgets[month]||(g.budgets[month]={ expenseBudget:0, byCategory:{} }); bud.byCategory[cat]=v; app.persist();
  },
  onNewCatName(e){ this.setData({ newCatName:e.detail.value.trim() }); },
  onNewCatAmount(e){ this.setData({ newCatAmount:e.detail.value.trim() }); },
  addCatBudget(){
    const name=this.data.newCatName; const amt=Number(this.data.newCatAmount)||0; if(!name||amt<=0){ wx.showToast({ title:'需分类与金额', icon:'none' }); return; }
    const g=app.globalData; const month=this.data.month; if(!g.budgets) g.budgets={}; const bud=g.budgets[month]||(g.budgets[month]={ expenseBudget:0, byCategory:{} }); bud.byCategory[name]=amt; app.persist(); this.setData({ newCatName:'', newCatAmount:'' }); this.init();
  },
  // 预留：删除分类预算
  removeCat(e){ const cat=e.currentTarget.dataset.cat; const g=app.globalData; const month=this.data.month; if(!g.budgets||!g.budgets[month]) return; delete g.budgets[month].byCategory[cat]; app.persist(); this.init(); },
  showCategoryBudgets(){ this.setData({ showCategoryBudgets: !this.data.showCategoryBudgets }); }
});
