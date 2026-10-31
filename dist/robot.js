import * as T from './assets/three.module.min.js';
import {createRobotRig,applyRobotPose} from './rig.mjs';
import {CompanionController} from './companion-controller.mjs';

export async function mountRobot(stage){
 const status=document.querySelector('#robot-state'),motion=document.querySelector('#motion');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let renderer,software=false;
 const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2',{alpha:true,antialias:true});
 if(context){renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});}
 else{
  const {SVGRenderer}=await import('./assets/SVGRenderer.js');renderer=new SVGRenderer();
  renderer.setQuality('high');renderer.setClearColor(0xe9e9e0);renderer.setPrecision(2);software=true;
 }
 stage.dataset.renderer=software?'software-3d':'webgl';
 renderer.setPixelRatio?.(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
 stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const rig=createRobotRig({software}),camera=new T.OrthographicCamera(-8,8,1.55,-1.55,.1,50);
 camera.position.set(0,3.1,9);camera.lookAt(0,1.25,0);
 let paused=false,reduced=preference.matches||new URLSearchParams(location.search).get('motion')==='off',visible=false,raf=0,last=0,manualClock=false,frames=0,totalMs=0;
 const onState=state=>{status.setAttribute('aria-live','off');status.textContent=({hidden:'Companion resting',enter:'Companion arriving',exit:'Companion departing',brake:'Companion pausing','turn-in':'Companion turning','turn-out':'Companion turning',greet:'Companion waving hello',lower:'Companion lowering arm',look:'Companion observing'})[state]||'Companion active';};
 let controller=new CompanionController({now:performance.now()/1000,onState});
 const pointer={active:false,x:0,y:0};
 status.setAttribute('aria-live','off'); // Automatic state transitions must not interrupt screen-reader reading.
 function label(){motion.textContent=reduced?'Enable motion':paused?'Resume motion':'Pause motion';motion.setAttribute('aria-pressed',String(paused||reduced));}
 function render(dt=1/60){
  const start=performance.now();applyRobotPose(rig,controller,dt,pointer);if(reduced)rig.robot.visible=false;renderer.render(rig.scene,camera);
  frames++;totalMs+=performance.now()-start;
  stage.dataset.robotState=controller.state;stage.dataset.robotX=controller.x.toFixed(3);
  stage.dataset.direction=String(controller.direction);stage.dataset.phase=controller.phase.toFixed(3);
 }
 function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h);const half=3.1*w/h/2;camera.left=-half;camera.right=half;camera.updateProjectionMatrix();
  controller.setBounds(half);render();
 }
 new ResizeObserver(resize).observe(stage);resize();
 function stop(){cancelAnimationFrame(raf);raf=0;}
 function frame(now){
  raf=0;if(!visible||document.hidden||paused||reduced||manualClock)return;
  // Tab suspension is handled separately. Ordinary slow frames retain their elapsed time.
  const dt=Math.min((now-last)/1000,.25);last=now;
  const previous=controller.state;controller.advance(dt);
  if(controller.state!=='hidden'||previous!=='hidden')render(dt);
  raf=requestAnimationFrame(frame);
 }
 function wake(){if(!raf&&visible&&!document.hidden&&!paused&&!reduced&&!manualClock){last=performance.now();raf=requestAnimationFrame(frame);}}
 function greet(){
  reduced=false;paused=false;label();
  const result=controller.requestGreeting();controller.setVisible(visible,performance.now()/1000);
  status.setAttribute('aria-live','polite');status.textContent=result==='entering'?'Coming over to say hello.':'Hello!';
  wake();return result;
 }
 function toggleMotion(){
  if(reduced){reduced=false;paused=false;controller.setVisible(visible);}else paused=!paused;
  label();status.textContent=paused?'Companion paused':'Companion active';if(paused)stop();else{controller.setVisible(visible,performance.now()/1000);wake();}
 }
 preference.addEventListener('change',e=>{
  reduced=e.matches;label();if(reduced){stop();rig.robot.visible=false;renderer.render(rig.scene,camera);status.textContent='Motion reduced';}else{controller.setVisible(visible,performance.now()/1000);wake();}
 });
 stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width*2-1;pointer.y=(e.clientY-r.top)/r.height*2-1;pointer.active=true;});
 stage.addEventListener('pointerleave',()=>pointer.active=false);
 new IntersectionObserver(entries=>{
  visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.2;
  stage.dataset.visible=String(visible);
  if(!reduced&&!paused)controller.setVisible(visible,performance.now()/1000);
  if(visible)wake();else stop();
 },{threshold:[0,.2,.5]}).observe(stage);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wake();});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;stop();label();status.textContent='3D paused';});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{paused=false;label();wake();});
 label();if(reduced)status.textContent='Motion reduced';
 return {
  greet,toggleMotion,
  snapshot:()=>({...controller.snapshot(),visible,paused,reduced,frames,averageRenderMs:frames?totalMs/frames:0,renderer:stage.dataset.renderer}),
  // The local-only test harness calls this API. No test controls or routes ship in dist.
  resetForTest(direction=1){manualClock=true;stop();controller=new CompanionController({half:controller.half,random:()=>.25,onState});controller.startCrossing(direction);render();},
  advanceForTest(seconds){manualClock=true;stop();controller.advance(seconds);render(seconds);return this.snapshot();}
 };
}
