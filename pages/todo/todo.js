const app = getApp();
const FOCUS_LIMIT = 3;
const { award } = require('../../utils/growthService');
Page({
  data:{
    priorityRange:['高','中','低'],
    priorityIndex:1,
    sortRange:['按创建时间','按优先级','按截止时间'],
    sortIndex:0,
    filterPriorityRange:['全部优先级','高','中','低'],
    filterPriorityIndex:0,
    filterStatusRange:['全部状态','未完成','已完成','焦点','今日','逾期'],
    filterStatusIndex:0,
    searchQuery:'',
  form:{ title:'', due:'', labels:'', focus:false, priority:'medium', wealthLever:false },
    todos:[],
    filteredTodos:[],
    focusCount:0,
    FOCUS_LIMIT,
    statTotal:0,
    statDone:0,
    statRate:0,
    editVisible:false,
  editForm:{ id:'', title:'', due:'', labels:'', focus:false, priority:'medium', wealthLever:false },
    editPriorityIndex:1
  },
  onShow(){ this.loadData(); },
  loadData(){
    app.globalData.todos.forEach(t=>{ if(t.priority==='normal') t.priority='medium'; });
    this.setData({ todos: app.globalData.todos.slice() }, ()=>{ this.recalc(); });
  },
  recalc(){
    const { todos, filterPriorityIndex, filterStatusIndex, searchQuery, sortIndex } = this.data;
    let list = todos.slice();
    if(filterPriorityIndex>0){
      const map=['','high','medium','low'];
      list = list.filter(t=>t.priority===map[filterPriorityIndex]);
    }
    if(filterStatusIndex>0){
      const todayStr = this._today();
      list = list.filter(t=>{
        const due = t.due || '';
        const overdue = due && due < todayStr && !t.done;
        const dueToday = due && due === todayStr;
        switch(filterStatusIndex){
          case 1: return !t.done;
          case 2: return !!t.done;
          case 3: return !!t.focus;
          case 4: return dueToday;
          case 5: return overdue;
          default: return true;
        }
      });
    }
    if(searchQuery.trim()){
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(t=>{
        const labels = Array.isArray(t.labels)? t.labels.join(',') : (t.labels||'');
        return (t.title||'').toLowerCase().includes(q) || labels.toLowerCase().includes(q);
      });
    }
    if(sortIndex===1){
      const weight = { high:3, medium:2, low:1 };
      list.sort((a,b)=> (weight[b.priority]||0)-(weight[a.priority]||0));
    } else if(sortIndex===2){
      const weight = { high:3, medium:2, low:1 };
      list.sort((a,b)=>{
        if(!a.due && !b.due) return (weight[b.priority]||0)-(weight[a.priority]||0);
        if(!a.due) return 1; if(!b.due) return -1;
        if(a.due===b.due) return (weight[b.priority]||0)-(weight[a.priority]||0);
        return a.due.localeCompare(b.due);
      });
    } else {
      list.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
    }
    const focusCount = app.globalData.todos.filter(t=>t.focus).length;
    const statTotal = list.length;
    const statDone = list.filter(x=>x.done).length;
    const statRate = statTotal? +(statDone/statTotal).toFixed(2):0;
  const statRatePercent = Math.round(statRate*100);
  this.setData({ filteredTodos:list.map(x=>this._decorate(x)), focusCount, statTotal, statDone, statRate, statRatePercent });
  },
  _decorate(t){
    const todayStr = this._today();
    if(!t.__meta) t.__meta={};
    const due = t.due;
    if(due){
      t.__meta.overdue = !t.done && due < todayStr;
      t.__meta.today = !t.done && due === todayStr;
      t.__meta.soon = !t.done && !t.__meta.overdue && !t.__meta.today && this._isTomorrow(due);
    } else {
      t.__meta.overdue = t.__meta.today = t.__meta.soon = false;
    }
    return t;
  },
  _today(){
    const d=new Date(); const m=(d.getMonth()+1).toString().padStart(2,'0'); const day=d.getDate().toString().padStart(2,'0');
    return `${d.getFullYear()}-${m}-${day}`;
  },
  _isTomorrow(dateStr){
    const d=new Date(); d.setDate(d.getDate()+1);
    const m=(d.getMonth()+1).toString().padStart(2,'0'); const day=d.getDate().toString().padStart(2,'0');
    return dateStr===`${d.getFullYear()}-${m}-${day}`;
  },
  onFormInput(e){ const f=e.currentTarget.dataset.field; this.setData({ form:{ ...this.data.form, [f]: e.detail.value } }); },
  onPickDate(e){ this.setData({ form:{ ...this.data.form, due:e.detail.value } }); },
  pickPriority(e){ const idx=Number(e.detail.value); const map=['high','medium','low']; this.setData({ priorityIndex:idx, form:{ ...this.data.form, priority: map[idx] } }); },
  toggleFocus(e){ this.setData({ form:{ ...this.data.form, focus:e.detail.value || e.detail.checked } }); },
  addTodo(){
    const f=this.data.form;
    if(!f.title.trim()){ wx.showToast({ title:'请输入内容', icon:'none'}); return; }
    if(f.focus){
      const focusCount = app.globalData.todos.filter(t=>t.focus).length;
      if(focusCount>=FOCUS_LIMIT){ wx.showToast({ title:'焦点已满', icon:'none'}); return; }
    }
  const todo={ id:Date.now()+''+Math.random(), title:f.title.trim(), done:false, priority:f.priority, focus:f.focus, due:f.due, labels: f.labels? f.labels.split(/[，,]/).map(s=>s.trim()).filter(Boolean):[], createdAt:Date.now(), wealthLever: !!f.wealthLever };
    app.globalData.todos.unshift(todo);
  try{ award(app,'todo_create',{ id:todo.id }); }catch(e){ app.addXP && app.addXP(2,'添加待办'); }
    app.persist && app.persist();
  this.setData({ form:{ title:'', due:'', labels:'', focus:false, priority:'medium', wealthLever:false } });
    this.loadData();
  },
  toggleDone(e){
    const id=e.currentTarget.dataset.id; const t=app.globalData.todos.find(x=>x.id===id);
    if(!t) return;
    t.done = !t.done;
    if(t.done){
      let bonus = 0;
      // 记录完成时间戳（用于最近7天统计）
      t.doneAt = Date.now();
      if(t.wealthLever){
        const weight = t.priority==='high'?6: t.priority==='medium'?4:2;
        bonus = weight;
        const gs = app.globalData.growthStats = app.globalData.growthStats || { wealthLeverCompleted:0, leverageXPBonus:0 };
        gs.wealthLeverCompleted += 1;
        gs.leverageXPBonus += bonus;
      }
  try{ award(app,'todo_complete',{ id:t.id, bonus }); }catch(e){ app.addXP && app.addXP(6 + bonus, t.wealthLever? '完成杠杆待办':'完成待办'); }
    } else {
      // 取消完成则移除 doneAt（不回退已发放 XP）
      delete t.doneAt;
    }
    app.persist && app.persist();
    this.loadData();
  },
  setFocus(e){
    const id=e.currentTarget.dataset.id; const t=app.globalData.todos.find(x=>x.id===id); if(!t) return;
    if(!t.focus){
      const focusCount=app.globalData.todos.filter(x=>x.focus).length; if(focusCount>=FOCUS_LIMIT){ wx.showToast({ title:'焦点已满', icon:'none'}); return; }
      t.focus=true;
    } else { t.focus=false; }
    app.persist && app.persist(); this.loadData();
  },
  deleteTodo(e){ const id=e.currentTarget.dataset.id; app.globalData.todos=app.globalData.todos.filter(t=>t.id!==id); app.persist && app.persist(); this.loadData(); },
  batchComplete(){ app.globalData.todos.forEach(t=>{ if(!t.done) t.done=true; }); try{ award(app,'todo_complete',{ batch:true, count:app.globalData.todos.length }); }catch(e){ app.addXP && app.addXP(4,'批量完成'); } app.persist && app.persist(); this.loadData(); },
  clearCompleted(){ const before=app.globalData.todos.length; app.globalData.todos=app.globalData.todos.filter(t=>!t.done); if(app.globalData.todos.length!==before){ app.persist && app.persist(); this.loadData(); } },
  changeFilterPriority(e){ this.setData({ filterPriorityIndex:Number(e.detail.value) }, this.recalc); },
  changeFilterStatus(e){ this.setData({ filterStatusIndex:Number(e.detail.value) }, this.recalc); },
  changeSort(e){ this.setData({ sortIndex:Number(e.detail.value) }, this.recalc); },
  onSearch(e){ this.setData({ searchQuery:e.detail.value }, this.recalc); },
  openEdit(e){ const id=e.currentTarget.dataset.id; const t=app.globalData.todos.find(x=>x.id===id); if(!t) return; const idx = t.priority==='high'?0: t.priority==='medium'?1:2; this.setData({ editVisible:true, editForm:{ id:t.id, title:t.title, due:t.due||'', labels:(t.labels||[]).join(','), focus:t.focus, priority:t.priority, wealthLever: !!t.wealthLever }, editPriorityIndex:idx }); },
  closeEdit(){ this.setData({ editVisible:false }); },
  onEditInput(e){ const f=e.currentTarget.dataset.field; this.setData({ editForm:{ ...this.data.editForm, [f]: e.detail.value } }); },
  onEditPickDate(e){ this.setData({ editForm:{ ...this.data.editForm, due:e.detail.value } }); },
  editPickPriority(e){ const idx=Number(e.detail.value); const map=['high','medium','low']; this.setData({ editPriorityIndex:idx, editForm:{ ...this.data.editForm, priority:map[idx] } }); },
  editToggleFocus(e){ this.setData({ editForm:{ ...this.data.editForm, focus:e.detail.value || e.detail.checked } }); },
  toggleWealthLever(e){ this.setData({ form:{ ...this.data.form, wealthLever: e.detail.value || e.detail.checked } }); },
  editToggleWealthLever(e){ this.setData({ editForm:{ ...this.data.editForm, wealthLever: e.detail.value || e.detail.checked } }); },
  saveEdit(){
    const f=this.data.editForm; const t=app.globalData.todos.find(x=>x.id===f.id); if(!t) return;
    if(f.focus && !t.focus){ const focusCount=app.globalData.todos.filter(x=>x.focus).length; if(focusCount>=FOCUS_LIMIT){ wx.showToast({ title:'焦点已满', icon:'none'}); return; } }
    Object.assign(t,{ title:f.title, due:f.due, focus:f.focus, priority:f.priority, wealthLever: !!f.wealthLever, labels: f.labels? f.labels.split(/[，,]/).map(s=>s.trim()).filter(Boolean):[] });
    app.persist && app.persist(); this.setData({ editVisible:false }); this.loadData();
  },
  startPomodoro(e){
    const id=e.currentTarget.dataset.id; const t=app.globalData.todos.find(x=>x.id===id); if(!t) return;
    // 跳转到番茄页面并传递任务名称用于预填
    wx.navigateTo({ url:`/pages/pomodoro/pomodoro?task=${encodeURIComponent(t.title)}` });
  }
});