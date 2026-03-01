// 云函数：login
// 返回 openid / unionid / appid
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || null,
    appid: wxContext.APPID,
    env: wxContext.ENV,
    ts: Date.now()
  };
};
