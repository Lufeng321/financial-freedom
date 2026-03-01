const app = getApp();
const { track } = require('../../utils/track');
Page({
  data:{
    form:{
      kind:'out',
      incomeType:'active', incomeTypeIndex:0,
      expenseType:'necessary', expenseTypeIndex:0,
      category:'', categoryIndex:0,
      amount:'',
      date:new Date().toISOString().slice(0,10),
      time:'00:00',
      remark:'',
      currency:'CNY', currencyIndex:0,
      taxType:'after', taxTypeIndex:0,
      necessityScore:4, necessityIndex:1,
      asTemplate:false
    },
    editId:'',
    lastAction:null,
    currencyOptions:['人民币 (CNY)','美元 (USD)','欧元 (EUR)','日元 (JPY)'],
    incomeTypeOptions:['主动收入 (工资/兼职)','被动收入 (租金/股息/利息)'],
    expenseTypeOptions:['必要支出 (房租/伙食)','非必要支出 (娱乐/购物)'],
    taxTypeOptions:['税后','税前'],
    necessityOptions:['5 极必要','4 必要','3 中等','2 可选','1 冲动'],
    categories:[], recent:[],
    incomeTypeLabel:'主动收入 (工资/兼职)',
    expenseTypeLabel:'必要支出 (房租/伙食)',
    currencyLabel:'人民币 (CNY)',
    taxTypeLabel:'税后',
    necessityLabel:'4 必要',
  templateShortcuts:[],
  showRecurringDialog:false,
  recurringForm:{ id:'', kind:'out', incomeType:'active', expenseType:'necessary', category:'', amount:'', day:'1', remark:'', enabled:true, mode:'monthly', weekdays:[], intervalDays:'', startDate:new Date().toISOString().slice(0,10) },
  recurringFilterCategory:'',
  recurringSort:'day',
  recurringListFiltered:[],
  recurringCategoryOptions:[],
  showRecurringLogs:false,
  recurringLogs:[],
  // 快速复用功能已移除
  },
  onShow(){ this.buildCategories(); this.refreshRecent(); this.buildTemplateShortcuts(); this.checkAutoRecurring(); this.updateRecurringList(); },
  buildCategories(){
    const kind=this.data.form.kind;
    const list = kind==='in'? ['工资','副业','分红','利息','租金'] : ['餐饮','交通','住房','学习','娱乐'];
    this.setData({ categories:list });
  },
  buildTemplateShortcuts(){
    const t=(app.globalData.billTemplates||[]).slice(0,5);
    this.setData({ templateShortcuts:t });
  },
  tapKind(e){ const v=e.currentTarget.dataset.v; if(v===this.data.form.kind) return; this.setData({ 'form.kind':v },()=>{ this.buildCategories(); this.setData({ 'form.category':'', 'form.categoryIndex':0 }); }); },
  pickIncomeType(e){ const idx=Number(e.detail.value); const val=idx===0?'active':'passive'; this.setData({ 'form.incomeTypeIndex':idx,'form.incomeType':val, incomeTypeLabel:this.data.incomeTypeOptions[idx] }); },
  pickExpenseType(e){ const idx=Number(e.detail.value); const val=idx===0?'necessary':'optional'; this.setData({ 'form.expenseTypeIndex':idx,'form.expenseType':val, expenseTypeLabel:this.data.expenseTypeOptions[idx] }); },
  pickCategory(e){ const idx=e.detail.value; this.setData({ 'form.categoryIndex':idx, 'form.category':this.data.categories[idx] }); },
  pickDate(e){ this.setData({ 'form.date': e.detail.value }); },
  pickTime(e){ this.setData({ 'form.time': e.detail.value }); },
  pickCurrency(e){ const idx=Number(e.detail.value); const map=['CNY','USD','EUR','JPY']; this.setData({ 'form.currencyIndex':idx,'form.currency':map[idx], currencyLabel:this.data.currencyOptions[idx] }); },
  pickTaxType(e){ const idx=Number(e.detail.value); const map=['after','before']; this.setData({ 'form.taxTypeIndex':idx,'form.taxType':map[idx], taxTypeLabel:this.data.taxTypeOptions[idx] }); },
  pickNecessity(e){ const idx=Number(e.detail.value); const scoreMap=[5,4,3,2,1]; this.setData({ 'form.necessityIndex':idx,'form.necessityScore':scoreMap[idx], necessityLabel:this.data.necessityOptions[idx] }); },
  inputField(e){ const field=e.currentTarget.dataset.field; const val=e.detail.value; this.setData({ [`form.${field}`]: val });
    if(field==='remark'){
      const suggest=this.suggestCategoryByRemark(val);
      if(suggest && !this.data.form.category){ this.setData({ 'form.category':suggest }); }
    }
  },
  focusAmount(){ this.buildQuickAmounts(); this.buildRecentCategories(); },
  chooseQuickAmount(e){ const v=e.currentTarget.dataset.v; this.setData({ 'form.amount': String(v) }); },
  chooseRecentCategory(e){ const v=e.currentTarget.dataset.v; this.setData({ 'form.category': v }); },
  toggleTemplate(e){ this.setData({ 'form.asTemplate': e.detail.value }); },
  now(){ const d=new Date(); this.setData({ 'form.date': d.toISOString().slice(0,10), 'form.time': ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2) }); },
  useTemplate(e){ const id=e.currentTarget.dataset.id; const t=(app.globalData.billTemplates||[]).find(x=>x.templateId===id||x.id===id); if(!t) return; const now=new Date(); this.setData({ form:{ ...this.data.form, kind:t.kind, incomeType:t.incomeType||'active', expenseType:t.expenseType||'necessary', category:t.category, amount:String(t.amount), date:now.toISOString().slice(0,10), time:now.toTimeString().slice(0,5), remark:t.remark||'', asTemplate:false } },()=>{ this.buildCategories(); }); },
  editBill(e){ const id=e.currentTarget.dataset.id; const b=app.globalData.bills.find(x=>x.id===id); if(!b) return; const d=new Date(b.datetime.replace(/-/g,'/')); this.setData({ editId:b.id, form:{ kind:b.kind, incomeType:b.incomeType||'active', incomeTypeIndex:b.incomeType==='passive'?1:0, expenseType:b.expenseType||'necessary', expenseTypeIndex:b.expenseType==='optional'?1:0, category:b.category, categoryIndex:0, amount:String(b.amount), date:d.toISOString().slice(0,10), time: ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2), remark:b.remark||'', currency:b.currency||'CNY', currencyIndex:0, taxType:b.taxType||'after', taxTypeIndex:b.taxType==='before'?1:0, necessityScore:b.necessityScore||4, necessityIndex:[5,4,3,2,1].indexOf(b.necessityScore||4), asTemplate:false } },()=>{ this.buildCategories(); wx.showToast({ title:'编辑模式', icon:'none' }); }); },
  deleteBill(e){ const id=e.currentTarget.dataset.id; const idx=app.globalData.bills.findIndex(b=>b.id===id); if(idx===-1) return; const removed=app.globalData.bills.splice(idx,1)[0]; this.data.lastAction={ type:'delete', bill:{...removed} }; app.persist(); this.refreshRecent(); wx.showToast({ title:'已删除，可撤销', icon:'none' }); },
  undo(){ const a=this.data.lastAction; if(!a){ wx.showToast({ title:'无可撤销', icon:'none' }); return; } if(a.type==='add'){ const i=app.globalData.bills.findIndex(b=>b.id===a.bill.id); if(i>-1) app.globalData.bills.splice(i,1); } else if(a.type==='delete'){ app.globalData.bills.push(a.bill); } else if(a.type==='update'){ const i=app.globalData.bills.findIndex(b=>b.id===a.bill.id); if(i>-1) app.globalData.bills[i]=a.prev; } this.data.lastAction=null; app.persist(); this.refreshRecent(); wx.showToast({ title:'已撤销', icon:'success' }); },
  submit(){
    const f=this.data.form; if(!f.category){ wx.showToast({ title:'请选择分类', icon:'none' }); return; }
    if(!f.amount){ wx.showToast({ title:'请输入金额', icon:'none' }); return; }
    const amt=Number(f.amount); if(isNaN(amt)||amt<=0){ wx.showToast({ title:'金额需>0', icon:'none' }); return; }
    const dtStr=f.date+' '+f.time; const ts=new Date(dtStr.replace(/-/g,'/')).getTime(); if(ts>Date.now()+60000){ wx.showToast({ title:'时间不能是未来', icon:'none' }); return; }
    const editing=!!this.data.editId;
    // 税前收入转换为税后净额（简化版，使用全局默认税率）
    let realAmount=amt;
    if(f.kind==='in' && f.taxType==='before'){
      const rate=(app.globalData.settings&&app.globalData.settings.taxRateDefault)||0.1;
      realAmount=Number((amt*(1-rate)).toFixed(2));
    }
    const bill={ id: editing? this.data.editId : (Date.now()+''+Math.random()), kind:f.kind, incomeType: f.kind==='in'? f.incomeType:undefined, expenseType: f.kind==='out'? f.expenseType:undefined, category:f.category, amount:realAmount, grossAmount: f.kind==='in' && f.taxType==='before'? amt:undefined, currency:f.currency, taxType:f.kind==='in'? f.taxType:undefined, necessityScore:f.kind==='out'? f.necessityScore:undefined, datetime:dtStr, remark:f.remark||'' };
    if(editing){ const idx=app.globalData.bills.findIndex(b=>b.id===bill.id); if(idx>-1){ const prev={...app.globalData.bills[idx]}; app.globalData.bills[idx]=bill; this.data.lastAction={ type:'update', bill:{...bill}, prev }; } }
  else { app.globalData.bills.push(bill); this.data.lastAction={ type:'add', bill:{...bill} }; if(bill.kind==='in'){ try{ require('../../utils/growthService').award(app,'finance_asset',{ billId:bill.id, xpOverride: bill.incomeType==='passive'?15:8 }); }catch(e){ app.addXP && app.addXP(bill.incomeType==='passive'?15:8,'记账(收入)'); } } else { try{ require('../../utils/growthService').award(app,'finance_liability',{ billId:bill.id, xpOverride: bill.expenseType==='optional'?1:3 }); }catch(e){ app.addXP && app.addXP(bill.expenseType==='optional'?1:3,'记账(支出)'); } } if(f.asTemplate){ const tpl={ ...bill, templateId:bill.id }; app.globalData.billTemplates.unshift(tpl); app.globalData.billTemplates=app.globalData.billTemplates.slice(0,50); } }
  app.persist();
  try{ track && track('transaction_added', { id: bill.id, kind: bill.kind, category: bill.category, amount: bill.amount, incomeType: bill.incomeType, expenseType: bill.expenseType, necessity: bill.necessityScore }); }catch(e){}
  wx.showToast({ title: editing?'已更新':'已记录', icon:'success' }); this.refreshRecent(); this.setData({ 'form.amount':'', 'form.remark':'', editId:'', 'form.asTemplate':false }); this.buildTemplateShortcuts(); this.buildQuickAmounts(); this.buildRecentCategories();
  // 记录后补充快速面板数据（若打开）
  if(this.data.showQuickPanel){ this.buildQuickPanelData(); }
  },
  buildQuickAmounts(){
    const bills=app.globalData.bills.filter(b=>b.kind===this.data.form.kind).slice(-300);
    const freq={}; bills.forEach(b=>{ if(!b.amount) return; const a=b.amount; freq[a]=(freq[a]||0)+1; });
    const list=Object.keys(freq).map(k=>({ a:Number(k), c:freq[k] })).sort((a,b)=>b.c-a.c).slice(0,5).map(i=>i.a);
    this.setData({ quickAmounts:list });
  },
  buildRecentCategories(){
    const bills=app.globalData.bills.filter(b=>b.kind===this.data.form.kind).sort((a,b)=>a.datetime<b.datetime?1:-1);
    const seen=new Set(); const list=[]; for(const b of bills){ if(b.category && !seen.has(b.category)){ list.push(b.category); seen.add(b.category); if(list.length>=6) break; } }
    this.setData({ recentCategories:list });
  },
  checkAutoRecurring(){
    const rec=app.globalData.recurringTemplates||[]; if(!rec.length) return;
    const today=new Date(); const day=today.getDate(); const monthKey=today.toISOString().slice(0,7);
    let changed=false;
    rec.forEach(t=>{
      if(t.enabled===false) return;
      const mode=t.mode||'monthly';
      const todayStr=today.toISOString().slice(0,10);
      if(mode==='monthly'){
        const lastDay=new Date(today.getFullYear(), today.getMonth()+1,0).getDate();
        const effectiveDay = Math.min(t.day||1, lastDay);
        if(effectiveDay===day){
          const exists=app.globalData.bills.some(b=> b.remark && b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,7)===monthKey);
            if(!exists){
              app.globalData.bills.push({ id:Date.now()+''+Math.random(), kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 08:00', remark:(t.remark||'')+' REC:'+t.id });
              t.lastExec = todayStr;
              changed=true;
            }
        }
      } else if(mode==='weekly'){
        const w = today.getDay()===0?7:today.getDay(); // 1-7
        const wds = Array.isArray(t.weekdays)? t.weekdays:[];
        if(wds.includes(w)){
          const exists=app.globalData.bills.some(b=> b.remark && b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,10)===todayStr);
          if(!exists){
            app.globalData.bills.push({ id:Date.now()+''+Math.random(), kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 08:00', remark:(t.remark||'')+' REC:'+t.id });
            t.lastExec = todayStr;
            changed=true;
          }
        }
      } else if(mode==='interval'){
        const interval = Number(t.intervalDays)||0; if(interval<=0) return;
        const last = t.lastExec || t.startDate || todayStr;
        const diffDays = Math.floor( ( new Date(todayStr) - new Date(last) ) / 86400000 );
        if(diffDays>=interval){
          const exists=app.globalData.bills.some(b=> b.remark && b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,10)===todayStr);
          if(!exists){
            app.globalData.bills.push({ id:Date.now()+''+Math.random(), kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 08:00', remark:(t.remark||'')+' REC:'+t.id });
            t.lastExec = todayStr;
            changed=true;
          }
        }
      }
    });
  if(changed){ app.persist(); this.refreshRecent(); wx.showToast({ title:'已生成周期账单', icon:'none' }); this.updateRecurringList(); }
  },
  suggestCategoryByRemark(remark){
    if(!remark) return '';
    const kv=[ ['午','餐饮'],['晚饭','餐饮'],['早餐','餐饮'],['地铁','交通'],['公交','交通'],['房租','住房'],['租房','住房'],['课程','学习'],['网课','学习'],['游戏','娱乐'],['电影','娱乐'] ];
    remark=remark.toLowerCase();
    for(const [k,c] of kv){ if(remark.indexOf(k)>-1) return c; }
    return '';
  },
  openRecurringDialog(e){
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if(id){
      const item=(app.globalData.recurringTemplates||[]).find(r=>r.id===id);
      if(item){
        this.setData({ showRecurringDialog:true, recurringForm:{ id:item.id, kind:item.kind, incomeType:item.incomeType||'active', expenseType:item.expenseType||'necessary', category:item.category, amount:String(item.amount), day:String(item.day||1), remark:item.remark||'', enabled:item.enabled!==false, mode:item.mode||'monthly', weekdays:(item.weekdays||[]), intervalDays: String(item.intervalDays||''), startDate: item.startDate || new Date().toISOString().slice(0,10) } });
      }
    } else {
      this.setData({ showRecurringDialog:true, recurringForm:{ id:'', kind:'out', incomeType:'active', expenseType:'necessary', category:'', amount:'', day:'1', remark:'', enabled:true, mode:'monthly', weekdays:[], intervalDays:'', startDate:new Date().toISOString().slice(0,10) } });
    }
  },
  closeRecurringDialog(){ this.setData({ showRecurringDialog:false }); },
  recurringKindTap(e){
    const v=e.currentTarget.dataset.v; const f=this.data.recurringForm; if(v===f.kind) return; this.setData({ 'recurringForm.kind':v });
  },
  recurringInput(e){ const field=e.currentTarget.dataset.field; this.setData({ [`recurringForm.${field}`]: e.detail.value }); },
  recurringModePick(e){ const idx=Number(e.detail.value); const map=['monthly','weekly','interval']; this.setData({ 'recurringForm.mode': map[idx] }); },
  toggleWeekday(e){ const d=Number(e.currentTarget.dataset.d); const wds=[...this.data.recurringForm.weekdays]; const i=wds.indexOf(d); if(i>-1) wds.splice(i,1); else wds.push(d); wds.sort(); this.setData({ 'recurringForm.weekdays': wds }); },
  recurringSwitch(e){ this.setData({ 'recurringForm.enabled': e.detail.value }); },
  submitRecurring(){
    const f=this.data.recurringForm; const mode=f.mode||'monthly';
    if(!f.category || !f.amount){ wx.showToast({ title:'请完善字段', icon:'none' }); return; }
    const amt=Number(f.amount); if(isNaN(amt)||amt<=0){ wx.showToast({ title:'金额无效', icon:'none' }); return; }
    let dayNum=Number(f.day||1); if(mode==='monthly'){ if(dayNum<1||dayNum>31){ wx.showToast({ title:'执行日 1-31', icon:'none' }); return; } }
    if(mode==='weekly' && (!f.weekdays || !f.weekdays.length)){ wx.showToast({ title:'请选择星期', icon:'none' }); return; }
    if(mode==='interval'){ const iv=Number(f.intervalDays); if(isNaN(iv)||iv<=0){ wx.showToast({ title:'间隔天数>0', icon:'none' }); return; } }
    const list=app.globalData.recurringTemplates || (app.globalData.recurringTemplates=[]);
    if(f.id){
      const idx=list.findIndex(r=>r.id===f.id);
      if(idx>-1){ list[idx]={ ...list[idx], kind:f.kind, incomeType:f.kind==='in'?f.incomeType:undefined, expenseType:f.kind==='out'?f.expenseType:undefined, category:f.category, amount:amt, day:dayNum, remark:f.remark, enabled:f.enabled, mode, weekdays:[...(f.weekdays||[])], intervalDays: f.intervalDays, startDate:f.startDate, lastExec:list[idx].lastExec } }
    } else {
      list.push({ id:'rec_'+Date.now()+Math.random().toString(16).slice(2), kind:f.kind, incomeType:f.kind==='in'?f.incomeType:undefined, expenseType:f.kind==='out'?f.expenseType:undefined, category:f.category, amount:amt, day:dayNum, remark:f.remark, enabled:f.enabled, mode, weekdays:[...(f.weekdays||[])], intervalDays:f.intervalDays, startDate:f.startDate, lastExec:'' });
    }
    app.persist(); wx.showToast({ title:'已保存', icon:'success' }); this.setData({ showRecurringDialog:false }); this.refreshRecent(); this.updateRecurringList();
  },
  toggleRecurring(e){
    const id=e.currentTarget.dataset.id; const list=app.globalData.recurringTemplates||[]; const item=list.find(r=>r.id===id); if(!item) return; item.enabled = !item.enabled; app.persist(); this.refreshRecent(); this.updateRecurringList();
  },
  deleteRecurring(e){
    const id=e.currentTarget.dataset.id; const list=app.globalData.recurringTemplates||[]; const idx=list.findIndex(r=>r.id===id); if(idx>-1){ list.splice(idx,1); app.persist(); this.refreshRecent(); this.updateRecurringList(); wx.showToast({ title:'已删除', icon:'none' }); }
  },
  executeRecurring(e){
    const id=e.currentTarget.dataset.id; const list=app.globalData.recurringTemplates||[]; const t=list.find(r=>r.id===id); if(!t) return;
    const today=new Date(); const todayStr=today.toISOString().slice(0,10); const monthKey=todayStr.slice(0,7);
    const mode=t.mode||'monthly';
    let duplicate=false;
  if(mode==='monthly') duplicate = app.globalData.bills.some(b=>b.remark&&b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,7)===monthKey);
    else duplicate = app.globalData.bills.some(b=>b.remark&&b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,10)===todayStr);
    if(duplicate){ wx.showToast({ title:'已存在记录', icon:'none' }); return; }
  const billId=Date.now()+''+Math.random();
  app.globalData.bills.push({ id:billId, kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 09:00', remark:(t.remark||'')+' REC:'+t.id });
  t.lastExec=todayStr;
  (app.globalData.recurringExecLogs||(app.globalData.recurringExecLogs=[])).unshift({ id:'log_'+billId, templateId:t.id, datetime: todayStr+' 09:00', amount:t.amount });
  app.persist(); this.refreshRecent(); this.updateRecurringList(); wx.showToast({ title:'已执行', icon:'success' });
  },
  updateRecurringList(){
    const list=[...(app.globalData.recurringTemplates||[])];
    // categories options
    const catSet=new Set(); list.forEach(i=>{ if(i.category) catSet.add(i.category); });
    const cats=[''].concat(Array.from(catSet));
    const filterCat=this.data.recurringFilterCategory;
    let filtered = filterCat? list.filter(i=>i.category===filterCat): list;
    const sortKey=this.data.recurringSort;
  if(sortKey==='category') filtered = filtered.sort((a,b)=> (a.category||'').localeCompare(b.category||''));
    else if(sortKey==='day') filtered = filtered.sort((a,b)=> (a.day||0)-(b.day||0));
    else if(sortKey==='amount') filtered = filtered.sort((a,b)=> (a.amount||0)-(b.amount||0));
  const todayMonth=new Date().toISOString().slice(0,7);
  filtered = filtered.map(it=>({ ...it, _pending: (it.mode||'monthly')==='monthly'? !(it.lastExec && it.lastExec.slice(0,7)===todayMonth) : (it.mode==='weekly' || it.mode==='interval')? !(it.lastExec && it.lastExec===new Date().toISOString().slice(0,10)) : false }));
    this.setData({ recurringListFiltered: filtered, recurringCategoryOptions: cats });
  },
  filterRecurringCategory(e){ const idx=Number(e.detail.value); const opt=this.data.recurringCategoryOptions[idx]; this.setData({ recurringFilterCategory: opt || '' }, ()=> this.updateRecurringList()); },
  sortRecurring(e){ const val=e.currentTarget.dataset.v; this.setData({ recurringSort: val }, ()=> this.updateRecurringList()); },
  copyRecurring(e){ const id=e.currentTarget.dataset.id; const list=app.globalData.recurringTemplates||[]; const t=list.find(r=>r.id===id); if(!t) return; const clone={ ...t, id:'rec_'+Date.now()+Math.random().toString(16).slice(2), lastExec:'', remark:(t.remark||'')+'(复制)' }; list.push(clone); app.persist(); this.updateRecurringList(); wx.showToast({ title:'已复制', icon:'success' }); },
  bulkEnable(e){ const list=app.globalData.recurringTemplates||[]; list.forEach(i=> i.enabled=true); app.persist(); this.updateRecurringList(); wx.showToast({ title:'全部启用', icon:'success' }); },
  bulkDisable(e){ const list=app.globalData.recurringTemplates||[]; list.forEach(i=> i.enabled=false); app.persist(); this.updateRecurringList(); wx.showToast({ title:'全部停用', icon:'none' }); },
  openRecurringLogs(e){
    const id=e.currentTarget.dataset.id; const logs=(app.globalData.recurringExecLogs||[]).filter(l=>l.templateId===id).slice(0,30);
    this.setData({ showRecurringLogs:true, recurringLogs: logs });
  },
  closeRecurringLogs(){ this.setData({ showRecurringLogs:false, recurringLogs:[] }); },
  // 重写自动生成逻辑，增加执行日志记录
  checkAutoRecurring(){
    const rec=app.globalData.recurringTemplates||[]; if(!rec.length) return;
    const today=new Date(); const day=today.getDate(); const monthKey=today.toISOString().slice(0,7);
    let changed=false;
    rec.forEach(t=>{
      if(t.enabled===false) return;
      const mode=t.mode||'monthly';
      const todayStr=today.toISOString().slice(0,10);
      if(mode==='monthly'){
        const lastDay=new Date(today.getFullYear(), today.getMonth()+1,0).getDate();
        const effectiveDay = Math.min(t.day||1, lastDay);
        if(effectiveDay===day){
          const exists=app.globalData.bills.some(b=> b.remark && b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,7)===monthKey);
          if(!exists){
            const billId=Date.now()+''+Math.random();
            app.globalData.bills.push({ id:billId, kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 08:00', remark:(t.remark||'')+' REC:'+t.id });
            t.lastExec = todayStr;
            (app.globalData.recurringExecLogs||(app.globalData.recurringExecLogs=[])).unshift({ id:'log_'+billId, templateId:t.id, datetime: todayStr+' 08:00', amount:t.amount });
            changed=true;
          }
        }
      } else if(mode==='weekly'){
        const w = today.getDay()===0?7:today.getDay(); // 1-7
        const wds = Array.isArray(t.weekdays)? t.weekdays:[];
        if(wds.includes(w)){
          const exists=app.globalData.bills.some(b=> b.remark && b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,10)===todayStr);
          if(!exists){
            const billId=Date.now()+''+Math.random();
            app.globalData.bills.push({ id:billId, kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 08:00', remark:(t.remark||'')+' REC:'+t.id });
            t.lastExec = todayStr;
            (app.globalData.recurringExecLogs||(app.globalData.recurringExecLogs=[])).unshift({ id:'log_'+billId, templateId:t.id, datetime: todayStr+' 08:00', amount:t.amount });
            changed=true;
          }
        }
      } else if(mode==='interval'){
        const interval = Number(t.intervalDays)||0; if(interval<=0) return;
        const last = t.lastExec || t.startDate || todayStr;
        const diffDays = Math.floor( ( new Date(todayStr) - new Date(last) ) / 86400000 );
        if(diffDays>=interval){
          const exists=app.globalData.bills.some(b=> b.remark && b.remark.indexOf('REC:'+t.id)>-1 && b.datetime.slice(0,10)===todayStr);
          if(!exists){
            const billId=Date.now()+''+Math.random();
            app.globalData.bills.push({ id:billId, kind:t.kind, incomeType:t.incomeType, expenseType:t.expenseType, category:t.category, amount:t.amount, currency:'CNY', datetime: todayStr+' 08:00', remark:(t.remark||'')+' REC:'+t.id });
            t.lastExec = todayStr;
            (app.globalData.recurringExecLogs||(app.globalData.recurringExecLogs=[])).unshift({ id:'log_'+billId, templateId:t.id, datetime: todayStr+' 08:00', amount:t.amount });
            changed=true;
          }
        }
      }
    });
    if(changed){ app.persist(); this.refreshRecent(); wx.showToast({ title:'已生成周期账单', icon:'none' }); this.updateRecurringList(); }
  },
  updateRecurringList(){
    const list=[...(app.globalData.recurringTemplates||[])];
    const catSet=new Set(); list.forEach(i=>{ if(i.category) catSet.add(i.category); });
    const cats=[''].concat(Array.from(catSet));
    const filterCat=this.data.recurringFilterCategory;
    let filtered = filterCat? list.filter(i=>i.category===filterCat): list;
    const sortKey=this.data.recurringSort;
    if(sortKey==='category') filtered = filtered.sort((a,b)=> (a.category||'').localeCompare(b.category||''));
    else if(sortKey==='day') filtered = filtered.sort((a,b)=> (a.day||0)-(b.day||0));
    else if(sortKey==='amount') filtered = filtered.sort((a,b)=> (a.amount||0)-(b.amount||0));
    const todayMonth=new Date().toISOString().slice(0,7);
    filtered = filtered.map(it=>({ ...it, _pending: (it.mode||'monthly')==='monthly' && !(it.lastExec && it.lastExec.slice(0,7)===todayMonth) }));
    this.setData({ recurringListFiltered: filtered, recurringCategoryOptions: cats });
  },
  refreshRecent(){
    const bills=[...app.globalData.bills].sort((a,b)=>a.datetime<b.datetime?1:-1);
    const list=bills.slice(0,50).map(b=>({ id:b.id, kind:b.kind, incomeType:b.incomeType, expenseType:b.expenseType, category:b.category, amount:b.amount, currency:b.currency||'CNY', taxType:b.taxType==='before'?'税前':(b.taxType==='after'?'税后':undefined), necessityScore:b.necessityScore, date:b.datetime.split(' ')[0], dateShort:b.datetime.slice(5,16), sign:b.kind==='in'?'+':'-', remark:b.remark }));
    let inc=0,out=0; bills.forEach(b=>{ if(b.kind==='in') inc+=b.amount; else out+=b.amount; }); const net=inc-out;
    // 月度聚合 & 分类占比
    const { deriveMonthlyAggregates, buildCategoryBreakdown } = require('../../utils/finance');
    const monthlyAggs = deriveMonthlyAggregates(bills).slice(0,3); // 最近 3 个月
    const currentMonth = new Date().toISOString().slice(0,7);
    const currentBills = bills.filter(b=>b.datetime && b.datetime.slice(0,7)===currentMonth);
    const catBreakdownOut = buildCategoryBreakdown(currentBills,'out');
    this.setData({ recent:list, totalIncome:inc, totalExpense:out, totalNet:net, monthlyAggs, catBreakdownOut });
  }
});
