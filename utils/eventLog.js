// 简易事件日志：本地存储，追加写入；用于显示最近成长事件与 XP 来源
// 结构：{ ts, type, xp, desc }

const KEY = 'eventLog:list';
const MAX = 500; // 上限

function _load(){
  try{ return wx.getStorageSync(KEY)||[]; }catch(e){ return []; }
}
function _save(list){
  try{ wx.setStorageSync(KEY, list); }catch(e){}
}
function logEvent(evt){
  if(!evt || !evt.type) return;
  const list = _load();
  list.unshift({ ts: Date.now(), ...evt });
  if(list.length>MAX) list.length = MAX;
  _save(list);
}
function listRecent(limit=20){
  const list=_load();
  return list.slice(0, limit);
}
function clearEvents(){ _save([]); }

module.exports = { logEvent, listRecent, clearEvents };
