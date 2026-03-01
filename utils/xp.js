// 客户端 XP 增加封装
// 使用云函数 gain-xp 并返回 { added, newXP }
function gainXP(type, value){
  return new Promise((resolve,reject)=>{
    if(!wx.cloud){ return reject(new Error('no-cloud')); }
    wx.cloud.callFunction({ name:'gain-xp', data:{ type, value } })
      .then(res=>{ resolve(res.result||{}); })
      .catch(reject);
  });
}

module.exports = { gainXP };