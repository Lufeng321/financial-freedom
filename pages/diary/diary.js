const app = getApp();
let saveTimer = null;

// 简单停用词（可再扩展）
// （关键词功能已移除）

Page({
  data:{
    form:{ id:null, date:new Date().toISOString().slice(0,10), mood:3, text:'' },
    moods:[{v:1,icon:'😞'},{v:2,icon:'😐'},{v:3,icon:'🙂'},{v:4,icon:'😃'},{v:5,icon:'🤩'}],
    images:[],
    saveStatus:'',
  // 已移除关键词
    // 总结占位
    summary:{ loading:false, text:'' },
    history:[], // 原始历史
    filteredHistory:[],
    searchKey:''
  },
  onShow(){ this.loadHistory(); },
  pickDate(e){ this.setData({ 'form.date': e.detail.value }); this.scheduleSave(); },
  setMood(e){ this.setData({ 'form.mood': e.currentTarget.dataset.v }); this.scheduleSave(); },
  inputField(e){
    const f = e.currentTarget.dataset.field;
    const val = e.detail.value;
    this.setData({ [`form.${f}`]: val });
    // 关键词功能移除，不再提取
    this.scheduleSave();
  },
  // updateKeywords removed
  generateSummary(){
    if(this.data.summary.loading) return;
    this.setData({ 'summary.loading':true, 'summary.text':'' });
    // 简单本地规则生成占位 JSON（后续可接入 AI）
    const txt = this.data.form.text||'';
    const moods = ['低落','平静','积极','愉悦','高昂'];
    const moodDesc = moods[(this.data.form.mood||3)-1]||'中性';
  const focus = []; // 关键词功能已移除
  const obstacles = [];
  const actions = [];
    const json = {
      date:this.data.form.date,
      mood:moodDesc,
      focus,
      obstacles,
      actionsTomorrow:actions,
      wordCount: txt.length,
      summary: txt.slice(0,80)+(txt.length>80?'...':'')
    };
    setTimeout(()=>{
      this.setData({ 'summary.loading':false, 'summary.text': JSON.stringify(json,null,2) });
    }, 400);
  },
  chooseImages(){
    wx.chooseMedia({ count:6, mediaType:['image'], success:res=>{
      const imgs = res.tempFiles.map(f=>({ id: Date.now()+''+Math.random(), url: f.tempFilePath }));
      this.setData({ images:[...this.data.images, ...imgs].slice(0,12) });
      this.scheduleSave();
    }});
  },
  removeImage(e){
    const id = e.currentTarget.dataset.id;
    this.setData({ images: this.data.images.filter(i=>i.id!==id) });
    this.scheduleSave();
  },
  scheduleSave(){
    this.setData({ saveStatus:'保存中...' });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{ this.persist(); }, 500);
  },
  manualSave(){
    clearTimeout(saveTimer);
    this.setData({ saveStatus:'保存中...' });
  this.persist();
  // 保存完成后清空为新建状态，给用户继续记录下一条
  setTimeout(()=>{ this.newEntry && this.newEntry(); },60);
  },
  persist(){
    const g = app.globalData;
    if(!g.diaryList) g.diaryList = [];
    let entry;
    if(!this.data.form.id){
  entry = { ...this.data.form, id: Date.now()+''+Math.random().toString(16).slice(2), images:this.data.images, createdAt:Date.now(), updatedAt:Date.now() };
      g.diaryList.unshift(entry);
      this.setData({ 'form.id': entry.id });
    } else {
      const idx = g.diaryList.findIndex(d=>d.id===this.data.form.id);
  entry = { ...this.data.form, images:this.data.images, updatedAt:Date.now() };
      if(idx>=0) g.diaryList[idx]= entry; else g.diaryList.unshift(entry); // 兜底
    }
    app.persist && app.persist();
    this.setData({ saveStatus:'已保存' });
    this.loadHistory();
  },
  loadHistory(){
  const raw = (app.globalData.diaryList||[]).slice().sort((a,b)=> b.date.localeCompare(a.date) || (b.createdAt||0)-(a.createdAt||0));
    // 生成同日序号
    const counts = {};
    const list = raw.map(d=>{
      counts[d.date] = (counts[d.date]||0)+1;
      return {
        id:d.id||d.date,
        date:d.date,
        dateMMDD:d.date.slice(5),
        seq:counts[d.date],
        seqTag: counts[d.date]>1? '('+counts[d.date]+')':'',
        mood:d.mood||3,
  preview:d.text ? d.text.slice(0,42) + (d.text.length>42?'...':'') : ''
      };
    });
    this.setData({ history:list });
    this.applyFilter();
  },
  onSearch(e){
    this.setData({ searchKey:e.detail.value.trim() });
    this.applyFilter();
  },
  applyFilter(){
    const k = this.data.searchKey;
    if(!k){ this.setData({ filteredHistory:this.data.history.slice(0,120) }); return; }
    const low = k.toLowerCase();
  const filtered = this.data.history.filter(h=> h.preview.toLowerCase().includes(low));
    this.setData({ filteredHistory: filtered.slice(0,80) });
  },
  newEntry(){
    this.setData({
      form:{ id:null, date:new Date().toISOString().slice(0,10), mood:3, text:'' },
      images:[],
      summary:{ loading:false, text:'' },
      saveStatus:''
    });
  }
});