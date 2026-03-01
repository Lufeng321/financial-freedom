Component({
  properties:{
    percent:{ type:Number, value:0 },
    label:{ type:String, value:'' },
    size:{ type:String, value:'' },
  showMeta:{ type:Boolean, value:true },
    flash:{ type:Boolean, value:false },
    deltaThreshold:{ type:Number, value:15 } // 百分比跳升达到此值自动闪光
  },
  data:{ clamped:0, _prev:0 },
  observers:{
    'percent': function(p){
      let v = Number(p)||0; if(v<0) v=0; if(v>100) v=100; const pv=this.data._prev||0; const diff=v-pv; const data={ clamped: v.toFixed(0), _prev:v };
      if(!this.data.flash && diff>=this.data.deltaThreshold){ data.flash=true; setTimeout(()=>{ this.setData({ flash:false }); }, 1300); }
      this.setData(data);
    }
  }
});
