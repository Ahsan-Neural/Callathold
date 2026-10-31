import {SPEED,FootPlanner,ease} from './gait.mjs';
export const EXIT_MARGIN=1.6, SAFE_MARGIN=1.35, RETURN_COOLDOWN=6;
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const moving=s=>s==='enter'||s==='walk'||s==='exit';
const greetingStates=new Set(['brake','turn-in','greet','lower','look','turn-out']);
// Pure state machine shared by the live browser and the regression suite.
export class CompanionController {
 constructor({half=8,random=Math.random,onState=()=>{},now=0}={}){
  this.half=half;this.random=random;this.onState=onState;this.now=now;
  this.state='hidden';this.time=0;this.x=-half-EXIT_MARGIN;this.target=0;
  this.direction=1;this.travelDirection=1;this.heading=Math.PI/2;this.velocity=0;
  this.crossings=0;this.gesture=0;this.fastEntrance=false;this.visible=false;
  this.completedAt=-Infinity;this.leftAt=null;this.restDuration=10;this.waveAmount=0;
  this.history=['hidden'];this.manualRequests=0;this.feet=new FootPlanner(this.x,1);
 }
 change(state){this.state=state;this.time=0;this.history.push(state);this.history=this.history.slice(-40);this.onState(state);}
 setBounds(half){
  const old=this.half;this.half=Math.max(2.2,half);
  if(this.state==='hidden'){this.x=-this.direction*(this.half+EXIT_MARGIN);this.feet.reset(this.x,this.direction);return;}
  const prior=this.x;
  this.x=this.x*this.half/old;
  if(greetingStates.has(this.state))this.x=clamp(this.x,-this.half+SAFE_MARGIN,this.half-SAFE_MARGIN);
  this.feet.translate(this.x-prior);
  if(this.state==='exit')this.target=this.direction*(this.half+EXIT_MARGIN);
  else if(this.state==='enter'||this.state==='walk')this.target=clamp(this.target*this.half/old,-this.half+SAFE_MARGIN,this.half-SAFE_MARGIN);
 }
 setVisible(visible,now=this.now){
  this.now=Math.max(this.now,now);const was=this.visible;this.visible=visible;
  if(!visible){if(was)this.leftAt=this.now;return;}
  if(was)return;
  if(this.state==='hidden'){
   if(this.now-this.completedAt>=RETURN_COOLDOWN)this.startCrossing();
  }else if(this.leftAt!==null&&this.now-this.leftAt>=RETURN_COOLDOWN&&!greetingStates.has(this.state))this.requestGreeting();
 }
 startCrossing(direction=this.crossings%2===0?1:-1,{expedited=false}={}){
  this.direction=direction;this.travelDirection=direction;this.crossings++;this.edgeApproach=false;this.faceTarget=0;
  this.gesture=this.random()<.5?0:1;this.fastEntrance=expedited;
  this.x=-direction*(this.half+EXIT_MARGIN);this.velocity=0;this.waveAmount=0;
  this.heading=direction*Math.PI/2;
  const firstSafe=this.half-SAFE_MARGIN-.08;
  this.target=-direction*(expedited?firstSafe:Math.min(this.half*.5,firstSafe));
  this.feet.beginWalk(this.x,direction);this.change('enter');
 }
 requestGreeting(){
  if(greetingStates.has(this.state))return 'already-greeting';
  if(this.fastEntrance&&this.state==='enter')return 'entering';
  this.manualRequests++;
  if(this.state==='hidden'){this.startCrossing(undefined,{expedited:true});return 'entering';}
  const safe=this.half-SAFE_MARGIN;
  // A departing character that is already entirely outside begins a new journey from that edge.
  if(Math.abs(this.x)>this.half+.75){this.startCrossing(-Math.sign(this.x),{expedited:true});return 'entering';}
  if(Math.abs(this.x)>safe){
   this.target=clamp(this.x,-safe+.08,safe-.08);this.fastEntrance=true;
   this.pendingDirection=Math.sign(this.target-this.x)||this.direction;
   if(this.pendingDirection!==this.travelDirection){
    this.pendingEdgeTarget=this.target;this.change('brake');this.edgeApproach=true;
   }else this.change('enter');
   return 'entering';
  }
  // No waypoint: decelerate where the visitor actually pressed the button.
  this.target=this.x;this.change('brake');return 'greeting';
 }
 advance(seconds){
  // Preserve elapsed time on slower frames; small integration steps keep feet and body synchronized.
  let remaining=Math.max(0,seconds);
  while(remaining>1e-9){const dt=Math.min(remaining,1/120);this.step(dt);remaining-=dt;}
 }
 step(dt){
  this.now+=dt;this.time+=dt;
  if(this.state==='hidden'){
   this.waveAmount=0;
   if(this.visible&&this.now-this.completedAt>=this.restDuration)this.startCrossing();
   return;
  }
  const oldX=this.x;
  if(moving(this.state)){
   const remaining=Math.abs(this.target-this.x),direction=Math.sign(this.target-this.x)||this.travelDirection;
   this.travelDirection=direction;
   const desired=Math.min(this.fastEntrance?SPEED*1.25:SPEED,remaining*5.8);
   this.velocity=damp(this.velocity,desired,15,dt);
   this.x+=direction*Math.min(remaining,this.velocity*dt);
   this.feet.walk(this.x,direction,this.x-oldX);
   if(remaining<.025){
    if(this.state==='exit'){
     this.completedAt=this.now;this.restDuration=9+this.random()*4;this.velocity=0;this.change('hidden');
    }else{this.fastEntrance=false;this.change('brake');}
   }
  }else if(this.state==='brake'){
   this.velocity=damp(this.velocity,0,20,dt);
   if(this.velocity>.025){
    this.x+=this.travelDirection*this.velocity*dt;
    this.feet.walk(this.x,this.travelDirection,this.x-oldX);
   }else{this.velocity=0;this.feet.park(this.x,dt);}
   if(this.velocity===0&&this.feet.parked){
    this.faceTarget=this.edgeApproach?this.pendingDirection*Math.PI/2:0;
    this.change('turn-in');
   }
  }else if(this.state==='turn-in'||this.state==='turn-out'){
   const goal=this.state==='turn-in'?(this.faceTarget??0):this.direction*Math.PI/2;
   const diff=Math.atan2(Math.sin(goal-this.heading),Math.cos(goal-this.heading));
   this.heading+=diff*(1-Math.exp(-12*dt));
   if(Math.abs(diff)<.015&&this.time>.16){
    this.heading=goal;
    if(this.state==='turn-in'){
     if(this.edgeApproach){this.edgeApproach=false;this.travelDirection=this.pendingDirection;this.target=this.pendingEdgeTarget;this.feet.beginWalk(this.x,this.travelDirection);this.change('enter');}
     else this.change('greet');
    }else{
     this.target=this.direction*(this.half+EXIT_MARGIN);this.fastEntrance=false;
     this.travelDirection=this.direction;this.feet.beginWalk(this.x,this.direction);this.change('exit');
    }
   }
  }else if(this.state==='greet'&&this.time>=1.45)this.change('lower');
  else if(this.state==='lower'&&this.time>=.36)this.change('look');
  else if(this.state==='look'&&this.time>=.24)this.change('turn-out');
  this.waveAmount=this.state==='greet'?ease(this.time/.32):this.state==='lower'?1-ease(this.time/.36):0;
 }
 get phase(){return this.feet.phase;}
 get blend(){return Math.min(1,this.velocity/SPEED);}
 get footTargets(){return this.feet.local(this.x);}
 snapshot(){return {state:this.state,time:this.time,x:this.x,target:this.target,direction:this.direction,heading:this.heading,velocity:this.velocity,wave:this.waveAmount,phase:this.phase,feet:this.footTargets,history:[...this.history],crossings:this.crossings};}
}
