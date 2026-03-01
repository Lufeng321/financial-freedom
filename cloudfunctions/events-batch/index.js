// 云函数：events-batch
// 功能：批量写入埋点事件至 events 集合（前端缓冲 flush 调用）
// 安全：仅写入当前 openid 事件；忽略空；加入字段校验 + 数量上限保护
// 扩展：返回 inserted / dropped / limited，以及服务端补充 metadata（env/app/version）

const cloud = require('wx-server-sdk');
cloud.init();

// 基础白名单校验（名称 / payload 尺寸）
const MAX_EVENTS_PER_CALL = 500; // 防止一次性超大
const MAX_PAYLOAD_JSON = 1024 * 4; // 4KB 上限
const NAME_REG = /^[a-zA-Z0-9_\-\.]{1,64}$/;

exports.main = async (event, context) => {
  const { events = [], clientTs } = event || {};
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if(!Array.isArray(events) || !events.length){
    return { inserted:0, dropped:0, limited:false, reason:'empty' };
  }

  const now = Date.now();
  const db = cloud.database();

  let dropped = 0;
  const limited = events.length > MAX_EVENTS_PER_CALL;
  const slice = events.slice(0, MAX_EVENTS_PER_CALL);
  const docs = [];
  for(const raw of slice){
    if(!raw || typeof raw !== 'object'){ dropped++; continue; }
    const name = (raw.name||'').trim();
    if(!NAME_REG.test(name)){ dropped++; continue; }
    let payload = raw.payload || {};
    // 尝试裁剪 payload 大小（序列化后）
    try {
      let json = JSON.stringify(payload);
      if(json.length > MAX_PAYLOAD_JSON){
        // 简单裁剪策略：截断字符串字段；若仍超限则置空
        if(typeof payload === 'object'){
          for(const k of Object.keys(payload)){
            const v = payload[k];
            if(typeof v === 'string' && v.length > 200){ payload[k] = v.slice(0,200); }
          }
          json = JSON.stringify(payload);
        }
        if(json.length > MAX_PAYLOAD_JSON){ payload = { truncated:true }; }
      }
    }catch(e){ payload = { parseError:true }; }
    const ts = typeof raw.ts === 'number' ? raw.ts : now;
    const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
    docs.push({
      userId: openid,
      name,
      payload,
      ts,
      sessionId,
      clientTs: typeof clientTs === 'number'? clientTs : null,
      createdAt: now,
      schemaVersion: 2,
      meta: {
        appId: wxContext.APPID || null,
        env: wxContext.ENV || null,
        source: 'mini',
        sdk: 'track-v1'
      }
    });
  }

  if(!docs.length){
    return { inserted:0, dropped: dropped || slice.length, limited };
  }

  // 20/批 写入
  const chunks=[]; const size=20;
  for(let i=0;i<docs.length;i+=size){ chunks.push(docs.slice(i,i+size)); }
  let inserted=0; let errors=[];
  for(const c of chunks){
    try{
      const res = await db.collection('events').add({ data: c });
      inserted += Array.isArray(res._ids)? res._ids.length : c.length;
    }catch(e){
      errors.push(e.message||'add-failed');
    }
  }
  return { inserted, dropped, limited, errors: errors.length? errors: undefined, totalReceived: events.length };
};
