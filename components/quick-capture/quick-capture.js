const app = getApp();
const { awardAction } = require('../../utils/award');
const { emit } = require('../../utils/eventBus');

Component({
  properties:{ show:{ type:Boolean, value:false } },
  data:{
    tabs:[
      { id:'bill', name:'记账' },
      { id:'habit', name:'习惯' },
      { id:'pomo', name:'番茄' },
      { id:'asset', name:'资产' },
      { id:'skill', name:'技能' }
    ],
    currentTab:'bill',
    billAmount:'', billKindIndex:0, billKinds:['支出','收入'],
    billKindLabel:'支出',
    habitNames:[], habitPickLabel:'选择习惯', habitSelectedId:'',
    pomoDurations:['25','15','45'], pomoPickLabel:'25 分钟', pomoDuration:25,
    assetName:'', assetAmount:'',
    skillNames:[], skillPickLabel:'选择技能', skillSelectedId:'',
  },
  lifetimes:{
    attached(){ this._initLists(); }
  },
  methods:{
    open(){ this.setData({ show:true }); this._initLists(); },
    close(){ this.setData({ show:false }); this.triggerEvent('close'); },
    noop(){},
    switchTab(e){ const id=e.currentTarget.dataset.id; this.setData({ currentTab:id }); },
    onInput(e){ const f=e.currentTarget.dataset.field; this.setData({ [f]: e.detail.value }); },
    pickBillKind(e){ const idx=Number(e.detail.value); this.setData({ billKindIndex:idx, billKindLabel:this.data.billKinds[idx] }); },
    pickHabit(e){ const idx=Number(e.detail.value); const h=app.globalData.habits[idx]; this.setData({ habitPickLabel:h? h.name:'选择习惯', habitSelectedId: h? h.id:'' }); },
    pickPomo(e){ const idx=Number(e.detail.value); const d=this.data.pomoDurations[idx]; this.setData({ pomoPickLabel: d+' 分钟', pomoDuration:Number(d) }); },
    pickSkill(e){ const idx=Number(e.detail.value); const s=app.globalData.skills[idx]; this.setData({ skillPickLabel: s? s.name:'选择技能', skillSelectedId: s? s.id:'' }); },
    submitBill(){
      const amt = Number(this.data.billAmount);
      if(!amt){ wx.showToast({ title:'金额?', icon:'none' }); return; }
      const kind = this.data.billKindLabel==='收入'? 'in':'out';
      const bill={ id:'b'+Date.now(), kind, amount:amt, datetime:new Date().toISOString() };
      app.globalData.bills = app.globalData.bills||[]; app.globalData.bills.push(bill);
      app.persist && app.persist();
      try{ awardAction(app,'bill_add',{}); }catch(e){}
      wx.showToast({ title:'已记录', icon:'success' });
      this.setData({ billAmount:'' });
      this.triggerEvent('record',{ type:'bill' });
      emit('data:bill:add', bill);
    },
    submitHabit(){
      if(!this.data.habitSelectedId) return;
      const id=this.data.habitSelectedId;
      const h=app.globalData.habits.find(x=>x.id===id);
      if(!h) return;
      const today=(new Date()).toISOString().slice(0,10);
      if(!(h.days instanceof Set)) h.days = new Set(h.days||[]);
      if(!h.days.has(today)){ h.days.add(today); h.streak = (h.streak||0)+1; awardAction(app,'habit',{ id }); }
      app.persist && app.persist();
      wx.showToast({ title:'打卡成功', icon:'success' });
      this.triggerEvent('record',{ type:'habit' });
      emit('data:habit:check', { id });
    },
    startPomo(){
      // 简化：直接追加 sessions 记录番茄（真正番茄页面仍可提供完整体验）
      const minutes=this.data.pomoDuration;
      app.globalData.sessions = app.globalData.sessions||[];
      app.globalData.sessions.push({ id:'s'+Date.now(), minutes, ts:Date.now() });
      app.persist && app.persist();
      try{ awardAction(app,'focus_session',{}); }catch(e){}
      wx.showToast({ title:'已添加番茄', icon:'success' });
      this.triggerEvent('record',{ type:'pomo' });
      emit('data:pomo:add', { minutes });
    },
    submitAsset(){
      const name=this.data.assetName.trim(); const amount=Number(this.data.assetAmount);
      if(!name || !amount){ wx.showToast({ title:'名称/金额?', icon:'none' }); return; }
      app.globalData.assets = app.globalData.assets||[];
      app.globalData.assets.push({ id:'a'+Date.now(), name, amount, roi:0 });
      app.persist && app.persist();
      wx.showToast({ title:'已添加资产', icon:'success' });
      this.setData({ assetName:'', assetAmount:'' });
      this.triggerEvent('record',{ type:'asset' });
      emit('data:asset:add', { name, amount });
    },
    submitSkillPractice(){
      if(!this.data.skillSelectedId) return;
      const s=app.globalData.skills.find(x=>x.id===this.data.skillSelectedId);
      if(!s) return;
      s.xp = (s.xp||0) + 20;
      app.persist && app.persist();
      try{ awardAction(app,'skill_practice',{ id:s.id }); }catch(e){}
      wx.showToast({ title:'+20 XP', icon:'success' });
      this.triggerEvent('record',{ type:'skill' });
      emit('data:skill:practice', { id:s.id });
    },
    _initLists(){
      const habits=(app.globalData.habits||[]);
      const skills=(app.globalData.skills||[]);
      this.setData({
        habitNames: habits.map(h=>h.name),
        skillNames: skills.map(s=>s.name)
      });
    }
  }
});
