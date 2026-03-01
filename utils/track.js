// 埋点基础封装 Phase 2
// 机制：本地 storage 队列 + 条件触发 flush (数量阈值 / 时间间隔)
// 增强：指数退避重试、网络状态感知、部分批次上传、payload 裁剪由云端补强
// 云函数：events-batch (schemaVersion=2)

const STORAGE_KEY = 'events:buffer';

function getBuffer(){
  try{ return wx.getStorageSync(STORAGE_KEY)||[]; }catch(e){ return []; }
}
function saveBuffer(buf){
  try{ wx.setStorageSync(STORAGE_KEY, buf); }catch(e){}
}

const MAX_BUFFER = 500;
const FLUSH_COUNT = 10; // 累计 10 条触发
const FLUSH_INTERVAL = 60 * 1000; // 60s 定时尝试
const MAX_BATCH_PER_CALL = 100; // 单次最多发送 100 条（云端再二次限制）

let _online = true;
try{
  wx.onNetworkStatusChange && wx.onNetworkStatusChange(res=>{ _online = !!res.isConnected; });
}catch(e){}

let _lastFlush = Date.now();
let _timerStarted = false;
let _retry = { times:0, next:0 };

function ensureTimer(){
  if(_timerStarted) return;
  _timerStarted = true;
  setInterval(()=>{
    try{ if(Date.now()-_lastFlush >= FLUSH_INTERVAL){ flushToCloud({ reason:'interval' }); } }catch(e){}
  }, 5000); // 每 5 秒检查一次是否到间隔
}

function track(name, payload){
  const evt = { name, payload: payload||{}, ts: Date.now(), sessionId: getSessionId() };
  const buf = getBuffer();
  buf.push(evt);
  if(buf.length>MAX_BUFFER) buf.shift();
  saveBuffer(buf);
  ensureTimer();
  if(buf.length>=FLUSH_COUNT){ flushToCloud({ reason:'count' }); }
  return evt;
}

let _sid = null;
function getSessionId(){
  if(_sid) return _sid;
  _sid = Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  return _sid;
}

async function flushToCloud(options){
  const now = Date.now();
  if(_retry.next && now < _retry.next){ return { skipped:true, backoff:true }; }
  const buf = getBuffer();
  if(!buf.length) return { sent:0, reason: options&&options.reason };
  if(!_online){ return { sent:0, reason:'offline' }; }
  _lastFlush = now;
  const sending = buf.slice(0, MAX_BATCH_PER_CALL);
  let result = null; let ok=false;
  try{
    if(wx.cloud){
      result = await wx.cloud.callFunction({ name:'events-batch', data:{ events: sending, clientTs: now } });
      ok = true;
    }
  }catch(e){ ok=false; }
  if(ok){
    // 移除已发送部分
    const remain = buf.slice(sending.length);
    saveBuffer(remain);
    // 成功重置退避
    _retry = { times:0, next:0 };
    // 若还有剩余，排一个微任务继续（避免阻塞）
    if(remain.length && remain.length < FLUSH_COUNT){
      setTimeout(()=>flushToCloud({ reason:'drain' }), 200);
    }else if(remain.length){
      // 下次循环由 timer / count 触发
    }
    return { sent: sending.length, remain: remain.length, uploaded:true, server: result && result.result };
  }
  // 失败：退避
  _retry.times += 1;
  const backoff = Math.min(60000, Math.pow(2, _retry.times) * 500); // 0.5s,1s,2s...cap 60s
  _retry.next = now + backoff;
  return { sent:0, uploaded:false, backoffMs: backoff };
}

module.exports = { track, flushToCloud, getSessionId };
