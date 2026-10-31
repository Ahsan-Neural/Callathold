import * as T from './assets/three.module.min.js';
import {solveLeg,HIP_HEIGHT} from './gait.mjs';

// Geometry and lighting preserved from the uploaded source.
export function createRobotRig({software=false}={}) {
 const scene=new T.Scene();
 // Enhanced 3-point lighting + soft under-fill
 scene.add(new T.HemisphereLight(0xffffff,0x586050,2.8));
 const key=new T.DirectionalLight(0xfff5e3,3.4);key.position.set(-3,7,6);scene.add(key);
 const rim=new T.DirectionalLight(0xddeeff,2.4);rim.position.set(4,3,-4);scene.add(rim);
 const fill=new T.DirectionalLight(0xffecd4,1.2);fill.position.set(2,-1.5,5);scene.add(fill);
 if(software){scene.add(new T.AmbientLight(0xffffff,.65));key.intensity=.65;rim.intensity=.25;}

 const mat=(color,metalness=.1,roughness=.5,emissive=0,emissiveIntensity=0)=>new T.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
 const ivory=mat(0xdad6c5,.15,.38),ivoryLight=mat(0xe8e5d6,.18,.35),dark=mat(0x222a28,.65,.35),steel=mat(0x76827f,.85,.24),rubber=mat(0x161c1b,.08,.82),copper=mat(0xba6a42,.88,.28),glass=mat(0x0e2326,.92,.12),light=mat(0x8cedcf,.2,.2,0x3fa888,.45);

 const robot=new T.Group();robot.name='R01_ROOT';scene.add(robot);const chassis=new T.Group();chassis.name='CHASSIS';robot.add(chassis);
 function box(w,h,d,m,parent,x=0,y=0,z=0){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function sphere(r,m,parent,x=0,y=0,z=0){const mesh=new T.Mesh(new T.SphereGeometry(r,software?8:12,software?6:10),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function cyl(r,h,m,parent,x=0,y=0,z=0){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,12),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function round(w,h,d,r,m,parent,x=0,y=0,z=0){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:!software,bevelThickness:.018,bevelSize:.018,bevelSegments:2,curveSegments:3,steps:1});g.translate(0,0,-d/2);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}

 // Articulated bipedal droid chassis
 round(.52,.52,.35,.05,ivory,chassis,0,1.18,0);box(.4,.06,.37,copper,chassis,0,1.46,0);round(.34,.25,.035,.025,steel,chassis,0,1.19,.203);box(.25,.075,.024,dark,chassis,0,1.24,.23);box(.20,.015,.025,light,chassis,0,1.25,.245);
 for(let i=0;i<4;i++)box(.20-i*.025,.018,.025,dark,chassis,0,1.13-i*.035,.23);
 for(const x of [-.20,.20])for(const y of [1,1.38])sphere(.019,steel,chassis,x,y,.2);
 cyl(.075,.25,dark,chassis,0,1.57,0);for(const x of [-.11,.11])cyl(.021,.2,steel,chassis,x,1.57,.02);

 const neck=new T.Group();neck.name='NECK_YAW_PITCH';neck.position.set(0,1.76,0);chassis.add(neck);sphere(.10,steel,neck);
 const head=new T.Group();head.name='HEAD_ROLL';head.position.y=.16;neck.add(head);
 round(1.04,.34,.40,.07,ivoryLight,head);round(.98,.235,.035,.04,dark,head,0,-.015,.225);box(.82,.018,.38,copper,head,0,.18,0);

 for(const x of [-.32,.31]){const ring=cyl(.128,.045,steel,head,x,-.005,.255);ring.rotation.x=Math.PI/2;const lens=cyl(.093,.049,glass,head,x,-.005,.282);lens.rotation.x=Math.PI/2;const pupil=cyl(.052,.05,rubber,head,x,-.005,.295);pupil.rotation.x=Math.PI/2;sphere(.018,light,head,x-.025,.03,.327);}
 box(.055,.033,.025,copper,head,0,.005,.27);

 const antennas=[];
 for(const side of [-1,1]){
  const disk=cyl(.095,.075,dark,head,side*.56,0,0);disk.rotation.z=Math.PI/2;sphere(.04,steel,head,side*.60,0,.02);
  const aerialPivot=new T.Group();aerialPivot.position.set(side*.38,.37,-.05);head.add(aerialPivot);
  cyl(.009,.36,steel,aerialPivot,0,0,0);cyl(.014,.05,rubber,aerialPivot,0,.19,0);
  antennas.push({pivot:aerialPivot,side});
  box(.11,.035,.012,steel,head,side*.38,.04,-.222);
 }

 const legs=[];
 for(const side of [-1,1]){
  const hip=new T.Group();hip.name=`HIP_${side}`;hip.position.set(side*.18,.88,0);robot.add(hip);sphere(.105,dark,hip);box(.12,.32,.13,ivory,hip,0,-.22,0);cyl(.03,.31,steel,hip,side*.075,-.22,.02);
  const knee=new T.Group();knee.name=`KNEE_${side}`;knee.position.y=-.43;hip.add(knee);const joint=cyl(.085,.18,steel,knee);joint.rotation.z=Math.PI/2;box(.09,.31,.095,dark,knee,0,-.215,0);cyl(.022,.3,steel,knee,side*.065,-.21,.01);
  const ankle=new T.Group();ankle.name=`ANKLE_${side}`;ankle.position.y=-.43;knee.add(ankle);sphere(.068,copper,ankle);round(.21,.09,.33,.03,ivory,ankle,0,-.016,.075);box(.22,.028,.34,rubber,ankle,0,-.079,.075);
  legs.push({hip,knee,ankle});
 }

 const arms=[];
 for(const side of [-1,1]){
  const shoulder=new T.Group();shoulder.name=`SHOULDER_${side}`;shoulder.position.set(side*.54,1.39,0);chassis.add(shoulder);sphere(.075,dark,shoulder);const axle=cyl(.045,.29,steel,chassis,side*.395,1.39,0);axle.rotation.z=Math.PI/2;round(.105,.24,.13,.025,ivory,shoulder,0,-.15,0);
  const elbow=new T.Group();elbow.position.y=-.29;shoulder.add(elbow);sphere(.055,copper,elbow);box(.075,.18,.09,steel,elbow,0,-.115,0);
  const palm=new T.Group();palm.position.y=-.23;elbow.add(palm);round(.12,.12,.07,.025,ivory,palm,0,-.03,0);box(.02,.09,.045,dark,palm,-.075,-.01,.01);
  arms.push({shoulder,elbow,palm,side});
 }

 // Ground contact shadow
 let shadow=null;
 if(!software && typeof document!=='undefined') {
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,31);
  gradient.addColorStop(0,'rgba(23,32,23,.28)');gradient.addColorStop(1,'rgba(23,32,23,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  shadow=new T.Mesh(new T.PlaneGeometry(1.55,.85),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.029;robot.add(shadow);
 }



 return {scene,robot,chassis,neck,head,legs,arms,antennas,shadow};
}

// All motion is applied to the actual named joint hierarchy; feet use analytical IK.
export function applyRobotPose(rig,c,dt,pointer={active:false,x:0,y:0}){
 const {robot,chassis,neck,head,legs,arms,antennas}=rig;
 const t=c.now,blend=c.blend,bob=Math.sin(c.phase*Math.PI*4)*.006*blend;
 robot.visible=c.state!=='hidden';robot.position.x=c.x;robot.rotation.y=c.heading;
 chassis.position.y=HIP_HEIGHT-.88+bob;chassis.rotation.z=Math.sin(c.phase*Math.PI*2)*.012*blend;
 legs.forEach((leg,i)=>{
  const foot=c.footTargets[i],a=solveLeg(foot.z,HIP_HEIGHT-.063+bob-foot.y);
  leg.hip.position.y=HIP_HEIGHT+bob;leg.hip.rotation.x=a.hip;
  leg.knee.rotation.x=a.knee;leg.ankle.rotation.x=a.ankle;
 });
 const greeting=c.waveAmount;
 const gaze=pointer.active?T.MathUtils.clamp(pointer.x*c.half-c.x,-1,1)*.38:Math.sin(t*.6)*.22;
 neck.rotation.y=T.MathUtils.damp(neck.rotation.y,Math.abs(c.heading)<.35?gaze:Math.sin(t*.7)*.12,7,dt);
 neck.rotation.x=T.MathUtils.damp(neck.rotation.x,greeting*.12+(pointer.active?pointer.y*.08:Math.sin(t*.85)*.04),7,dt);
 head.rotation.z=T.MathUtils.damp(head.rotation.z,greeting*.15+Math.sin(t*.75)*.035,7,dt);
 antennas.forEach(a=>a.pivot.rotation.z=Math.sin(t*3.5)*.04*blend+Math.sin(t*1.6)*.025*a.side);
 const frequency=c.gesture===0?9:11.5,amplitude=c.gesture===0?.2:.26;
 arms.forEach((arm,i)=>{
  const right=arm.side===1;
  arm.shoulder.rotation.x=Math.sin(c.phase*Math.PI*2+i*Math.PI)*.12*blend;
  arm.shoulder.rotation.z=right?greeting*2.05:-.06;
  arm.elbow.rotation.z=right?greeting*(.58+Math.sin(c.now*frequency)*amplitude):0;
  arm.palm.rotation.z=right?greeting*Math.sin(c.now*frequency)*.18:0;
 });
 robot.updateMatrixWorld(true);
}
