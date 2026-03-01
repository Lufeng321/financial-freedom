const app = getApp();
let saveTimer = null;
Page({
  data:{
    form:{ id:null, date:'', mood:3, text:'' },
    moods:[{v:1,icon:'😞'},{v:2,icon:'😐'},{v:3,icon:'🙂'},{v:4,icon:'😃'},{v:5,icon:'🤩'}],
    images:[],
    saveStatus:''
  },
  onLoad(opts){
    const id = opts.id;
    const list = app.globalData.diaryList||[];
    const item = list.find(d=> (d.id||d.date)===id);
    if(item){
      this.setData({
        form:{ id:item.id||id, date:item.date, mood:item.mood||3, text:item.text||'' },
        images:item.images||[]
      });
    } else {
      wx.showToast({ title:'未找到日记', icon:'none'});
    }
  },
  pickDate(e){ this.setData({ 'form.date': e.detail.value }); this.scheduleSave(); },
  setMood(e){ this.setData({ 'form.mood': e.currentTarget.dataset.v }); this.scheduleSave(); },
  inputField(e){ const val = e.detail.value; this.setData({ 'form.text': val }); this.scheduleSave(); },
  chooseImages(){ wx.chooseMedia({ count:6, mediaType:['image'], success:res=>{
    const imgs = res.tempFiles.map(f=>({ id: Date.now()+''+Math.random(), url: f.tempFilePath }));
    this.setData({ images:[...this.data.images, ...imgs].slice(0,12) });
    this.scheduleSave();
  }}); },
  removeImage(e){ const id = e.currentTarget.dataset.id; this.setData({ images:this.data.images.filter(i=>i.id!==id) }); this.scheduleSave(); },
  scheduleSave(){ this.setData({ saveStatus:'保存中...' }); clearTimeout(saveTimer); saveTimer=setTimeout(()=>this.persist(),500); },
  save(){ clearTimeout(saveTimer); this.setData({ saveStatus:'保存中...' }); this.persist(); },
  persist(){
    const g = app.globalData; if(!g.diaryList) g.diaryList=[];
    const idx = g.diaryList.findIndex(d=>d.id===this.data.form.id);
    const entry = { ...this.data.form, images:this.data.images, updatedAt:Date.now() };
    if(idx>=0) g.diaryList[idx]= entry; else g.diaryList.unshift(entry);
    app.persist && app.persist();
    this.setData({ saveStatus:'已保存' });
  },
  deleteEntry(){
    wx.showModal({ title:'删除确认', content:'确定删除该日记？', success:res=>{
      if(res.confirm){
        const g = app.globalData;
        g.diaryList = (g.diaryList||[]).filter(d=>d.id!==this.data.form.id);
        app.persist && app.persist();
        wx.showToast({ title:'已删除', icon:'none'});
        setTimeout(()=>{ wx.navigateBack(); },600);
      }
    }});
  }
});
