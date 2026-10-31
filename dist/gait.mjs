// Distance-driven feet: world-space anchors stay fixed throughout stance.
export const SPEED = 1.60;
export const STRIDE = .56;
export const STANCE = .62;
export const HIP_HEIGHT = .86;
export const ANKLE_HEIGHT = .063;
export const FOOT_LIFT = .105;
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function footTarget(phase,blend=1){
 const p=((phase%1)+1)%1;
 if(p<STANCE)return {z:STRIDE*(.5-p/STANCE)*blend,y:0,stance:true};
 const u=(p-STANCE)/(1-STANCE);
 return {z:STRIDE*(-.5+u)*blend,y:Math.sin(Math.PI*u)*FOOT_LIFT*blend,stance:false};
}
export function solveLeg(z,vertical,upper=.43,lower=.43){
 const d=Math.min(upper+lower-.001,Math.max(.08,Math.hypot(z,vertical)));
 const clip=n=>Math.max(-1,Math.min(1,n));
 const hip=Math.atan2(-z,vertical)-Math.acos(clip((upper*upper+d*d-lower*lower)/(2*upper*d)));
 const knee=Math.PI-Math.acos(clip((upper*upper+lower*lower-d*d)/(2*upper*lower)));
 return {hip,knee,ankle:-hip-knee};
}
export class FootPlanner {
 constructor(x=0,dir=1){this.reset(x,dir);}
 reset(x,dir){
  this.dir=dir;this.phase=STANCE/2;this.parking=null;this.parked=true;
  this.feet=[0,1].map(()=>({x,y:0,stance:true,anchor:x,from:x,startPhase:STANCE}));
 }
 beginWalk(x,dir){
  this.reset(x,dir);this.parked=false;
  this.feet[1].stance=false;this.feet[1].startPhase=(this.phase+.5)%1;
 }
 translate(delta){for(const f of this.feet){f.x+=delta;f.anchor+=delta;f.from+=delta;}if(this.parking)this.parking.fromX+=delta;}
 walk(x,dir,distance){
  this.dir=dir;this.parked=false;this.parking=null;
  this.phase+=Math.abs(distance)*STANCE/STRIDE;
  this.feet.forEach((f,i)=>{
   const p=(this.phase+i*.5)%1;
   if(p<STANCE){
    if(!f.stance){f.anchor=x+dir*STRIDE/2;f.stance=true;}
    f.x=f.anchor;f.y=0;
   }else{
    if(f.stance){f.from=f.anchor;f.startPhase=STANCE;f.stance=false;}
    const u=Math.max(0,Math.min(1,(p-f.startPhase)/(1-f.startPhase)));
    f.x=f.from+(x+dir*STRIDE/2-f.from)*ease(u);f.y=Math.sin(Math.PI*u)*FOOT_LIFT;
   }
  });
 }
 park(x,dt){
  if(!this.parking){
   let index=this.feet.findIndex(f=>f.y>1e-5);
   if(index<0)index=this.feet.findIndex(f=>Math.abs(f.x-x)>.012);
   if(index<0){this.parked=true;return;}
   const foot=this.feet[index];this.parking={index,time:0,fromX:foot.x,fromY:foot.y};foot.stance=false;
  }
  const p=this.parking,f=this.feet[p.index];p.time+=dt;
  const u=Math.min(1,p.time/.15),s=ease(u);
  f.x=p.fromX+(x-p.fromX)*s;f.y=p.fromY*(1-s)+Math.sin(Math.PI*u)*.045;
  if(u===1){f.x=x;f.anchor=x;f.y=0;f.stance=true;this.parking=null;}
  this.parked=!this.parking&&this.feet.every(f=>f.y===0&&Math.abs(f.x-x)<=.012);
 }
 local(x){return this.feet.map(f=>({z:(f.x-x)*this.dir,y:f.y,stance:f.stance,worldX:f.x}));}
}
