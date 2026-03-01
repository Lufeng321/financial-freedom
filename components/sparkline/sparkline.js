const { t } = require('../../utils/i18n');
Component({
  properties:{ data:{ type:Array, value:[] }, color:{ type:String, value:'#2563eb' }, cid:{ type:String, value:'0' } },
  data:{ emptyText: t('sparkline.empty') },
  lifetimes:{ attached(){ this.draw(); } },
  observers:{ 'data': function(){ this.draw(); } },
  methods:{
    draw(){
      const d = this.data.data||[]; if(!d.length) return;
      const query = this.createSelectorQuery();
      query.select('.spk-c').fields({ node:true, size:true }).exec(res=>{
        if(!res || !res[0]) return; const { node, width, height } = res[0];
        const ctx = node.getContext('2d');
        ctx.clearRect(0,0,width,height);
        const max = Math.max(...d); const min = Math.min(...d);
        const span = max-min || 1; const step = width/(d.length-1);
        ctx.lineWidth=1.5; ctx.strokeStyle=this.data.color; ctx.beginPath();
        d.forEach((v,i)=>{ const x=i*step; const y= height - ( (v-min)/span * (height-4) ) -2; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
        ctx.stroke();
        // 填充渐变
        const grd = ctx.createLinearGradient(0,0,0,height);
        grd.addColorStop(0,this.hexToRgba(this.data.color,0.35));
        grd.addColorStop(1,this.hexToRgba(this.data.color,0));
        ctx.lineTo(width,height); ctx.lineTo(0,height); ctx.closePath();
        ctx.fillStyle=grd; ctx.fill();
      });
    },
    hexToRgba(hex,a){
      const h=hex.replace('#',''); const bigint=parseInt(h,16); const r=(bigint>>16)&255; const g=(bigint>>8)&255; const b=bigint&255; return `rgba(${r},${g},${b},${a})`;
    }
  }
});
