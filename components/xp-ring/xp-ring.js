Component({
	properties:{
		xp:{ type:Number, value:0 },
		level:{ type:Number, value:1 },
		size:{ type:Number, value:96 },
		stroke:{ type:Number, value:8 }
	},
	data:{ pct:0, circleStyle:'' },
	observers:{
		'xp,level': function(){ this.update(); }
	},
	lifetimes:{ attached(){ this.update(); } },
	methods:{
		update(){
			// 简单经验进度：level^2*100 -> next
			const { xp, level, size, stroke } = this.data;
			const curNeed = (level*level*100);
			const nextNeed = ((level+1)*(level+1)*100);
			const prevNeed = curNeed; // 到达当前级别的总 XP
			const span = nextNeed - prevNeed;
			const curInLevel = xp - prevNeed;
			const pct = Math.max(0, Math.min(1, span? curInLevel/span:0));
			const deg = Math.round(pct*360);
			this.setData({ pct: Math.round(pct*100), circleStyle:`width:${size}px;height:${size}px;--ring:${stroke}px;background:conic-gradient(#6366f1 0deg,#6366f1 ${deg}deg,#e5e7eb ${deg}deg);` });
		}
	}
});
