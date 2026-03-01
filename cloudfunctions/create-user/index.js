// 云函数：create-user
// 功能：在 user 集合中为当前 openid 创建或更新用户档案
// 需求：生成唯一业务 id（2字母+5数字），字段：_id (auto) / openid / bizId / nickname / avatarEmoji / avatarUrl / avatarFileID / createdAt / updatedAt

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const BIZ_ID_PREFIX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomBizId(){
  const letters = Array.from({length:2},()=> BIZ_ID_PREFIX_LETTERS[Math.floor(Math.random()*BIZ_ID_PREFIX_LETTERS.length)]).join('');
  const numbers = Math.floor(Math.random()*100000).toString().padStart(5,'0');
  return letters + numbers; // 共7位
}

async function generateUniqueBizId(db){
  const coll = db.collection('user');
  for(let i=0;i<10;i++){
    const bid = randomBizId();
    const exists = await coll.where({ bizId: bid }).limit(1).get();
    if(!exists.data.length) return bid;
  }
  // 退避扩展：加一次毫秒后缀（极低概率）
  return randomBizId() + 'X';
}

exports.main = async (event)=>{
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if(!openid){ return { ok:false, error:'NO_OPENID' }; }
  const { nickname, avatarEmoji, avatarUrl, avatarFileID } = event || {};
  const db = cloud.database();
  const coll = db.collection('user');
  const now = Date.now();
  const existed = await coll.where({ openid }).limit(1).get();
  if(existed.data.length){
    const doc = existed.data[0];
    const patch = { updatedAt: now };
    if(nickname) patch.nickname = nickname;
    if(avatarEmoji) patch.avatarEmoji = avatarEmoji;
    if(avatarUrl) patch.avatarUrl = avatarUrl;
    if(avatarFileID) patch.avatarFileID = avatarFileID;
    await coll.doc(doc._id).update({ data: patch });
    return { ok:true, updated:true, bizId: doc.bizId, openid, _id: doc._id, avatarUrl: patch.avatarUrl||doc.avatarUrl, avatarFileID: patch.avatarFileID||doc.avatarFileID };
  }
  const bizId = await generateUniqueBizId(db);
  const newDoc = { openid, bizId, nickname: nickname||'未命名用户', avatarEmoji: avatarEmoji||'👤', avatarUrl: avatarUrl||'', avatarFileID: avatarFileID||'', createdAt: now, updatedAt: now };
  const addRes = await coll.add({ data: newDoc });
  return { ok:true, created:true, bizId, openid, _id: addRes._id };
};
