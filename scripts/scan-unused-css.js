// 粗略扫描 pages/me/me.wxss 未在 me.wxml 中出现的 class 名称
// 用法：node scripts/scan-unused-css.js （需在支持的 Node 环境执行）
// 输出：潜在未使用选择器（仅简单匹配 .className 模式，不解析组合/伪类）

const fs = require('fs');
const path = require('path');
const wxssPath = path.join(__dirname,'..','pages','me','me.wxss');
const wxmlPath = path.join(__dirname,'..','pages','me','me.wxml');

function extractClasses(css){
  const set = new Set();
  css.replace(/\.([a-zA-Z0-9_-]+)\b/g,(m,c)=>{ set.add(c); });
  return Array.from(set);
}

function main(){
  const css = fs.readFileSync(wxssPath,'utf-8');
  const wxml = fs.readFileSync(wxmlPath,'utf-8');
  const classes = extractClasses(css);
  const unused = classes.filter(c=> !wxml.includes(c));
  const whitelist = ['theme-dark','flash','pb-fill'];
  const final = unused.filter(c=> !whitelist.includes(c));
  if(process.argv.includes('--delete')){
    // 生成一个简单的删除版内容（危险操作，默认只打印补丁片段，不直接写入）
    let newCss = css;
    final.forEach(cls=>{ const reg=new RegExp('\\.'+cls+'[^}]*}','g'); newCss=newCss.replace(reg,''); });
    console.log('--- DRY RUN 删除后预览（前 5000 字符） ---');
    console.log(newCss.slice(0,5000));
    console.log('\n候选类数量', final.length);
    console.log('若确认，请手动备份后运行: node scripts/scan-unused-css.js --apply');
  } else if(process.argv.includes('--apply')){
    let newCss = css;
    final.forEach(cls=>{ const reg=new RegExp('\\.'+cls+'[^}]*}','g'); newCss=newCss.replace(reg,''); });
    fs.writeFileSync(wxssPath,newCss,'utf-8');
    console.log('已写入新 CSS，已移除候选类数量:', final.length);
  } else {
    console.log('Potential unused classes (heuristic):');
    final.slice(0,200).forEach(c=>console.log(c));
    console.log(`Total candidates: ${final.length}`);
    console.log('使用 --delete 预览删除效果，--apply 直接应用(先备份)。');
  }
}

main();
