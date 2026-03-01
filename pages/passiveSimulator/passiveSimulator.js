const app = getApp();
const { calcFinance } = require('../../utils/finance');

Page({
  data:{ capital:100000, monthlyContribution:2000, annualRate:8, years:10, futureValue:0, futurePassiveYear:0, coveragePct:0, fiShortenYears:0 },
  onShow(){ this.recalc(); },
  onSlide(e){ const field=e.currentTarget.dataset.field; const v=Number(e.detail.value); this.setData({ [field]:v }, ()=> this.recalc()); },
  recalc(){
    const { capital, monthlyContribution, annualRate, years } = this.data;
    const r = annualRate/100;
    let fv = 0;
    let passiveYear = 0;
    if(r>0){
      const monthlyRate = r/12;
      const months = years*12;
      const fvLump = capital * Math.pow(1 + r, years); // 年复利
      // 月度定投普通年金（每月期末投入）公式
      const fvContrib = monthlyContribution * ((Math.pow(1+monthlyRate, months) - 1) / monthlyRate);
      fv = fvLump + fvContrib;
      passiveYear = fv * r; // 简化：期末年度被动收入≈期末资产 * 年化收益率
    } else {
      fv = capital + monthlyContribution * 12 * years; // 无收益情况下纯累积
      passiveYear = 0;
    }
    // 获取当前年支出
    const finance = calcFinance(app.globalData);
    const expenseYear = finance.expenseYear || 1;
    const coverage = Math.min(999, +(passiveYear / expenseYear *100).toFixed(1));
    // 额外被动收入增量 vs 当前 (当前被动收入=passiveIncomeYear+assetsPassive)
    const currentPassive = finance.passiveIncomeYear + finance.assetsPassive;
    const deltaPassive = Math.max(0, passiveYear - currentPassive);
    // FI 年度缩短估计：假设达到被动=支出需要基准10年；提升比例 * 10
    const baseYears = 10;
    const fiShorten = +(Math.min(baseYears, (deltaPassive/expenseYear)*baseYears).toFixed(2));
    this.setData({
      futureValue: Math.round(fv).toLocaleString(),
      futurePassiveYear: Math.round(passiveYear).toLocaleString(),
      coveragePct: coverage,
      fiShortenYears: fiShorten
    });
  }
});
