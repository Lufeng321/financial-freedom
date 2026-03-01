function normalizeGlobalData(g){
  if(!g) return;
  if(Array.isArray(g.habits)){
    g.habits.forEach(h=>{
      if(Array.isArray(h.days)) h.days = new Set(h.days);
      else if(!(h.days instanceof Set)) h.days = new Set();
    });
  }
  if(Array.isArray(g.todos)){
    g.todos.forEach(t=>{ if(t.done && !t.doneAt) t.doneAt = Date.now(); });
  }
}
module.exports = { normalizeGlobalData };
