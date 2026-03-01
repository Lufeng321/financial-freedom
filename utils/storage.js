// 本地缓存封装 (简单过期控制)

function setCache(key, value, ttlMs){
  const item = { v: value, e: ttlMs? Date.now()+ttlMs : 0 };
  try{ wx.setStorageSync(key, item); }catch(e){}
}

function getCache(key){
  try{ const item = wx.getStorageSync(key); if(!item) return null; if(item.e && Date.now()>item.e){ wx.removeStorageSync(key); return null; } return item.v; }catch(e){ return null; }
}

function removeCache(key){ try{ wx.removeStorageSync(key); }catch(e){} }

module.exports = { setCache, getCache, removeCache };
