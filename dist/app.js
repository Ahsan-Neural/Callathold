const menu=document.querySelector('.menu'),nav=document.querySelector('#nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
const projects=[...document.querySelectorAll('.project')];
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  let count=0;projects.forEach(p=>{p.hidden=button.dataset.filter!=='all'&&p.dataset.category!==button.dataset.filter;if(!p.hidden)count++;});
  document.querySelector('#filter-status').textContent=`Showing ${count} projects`;
}));
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target);}}),{threshold:.1});
 document.querySelectorAll('.section-main>h2,.section-heading,.publication').forEach(e=>io.observe(e));
}
const stage=document.querySelector('#robot-stage');
// Lazy loading is shared with early button presses, so clicks cannot be lost during import.
let companionPromise;
export function getCompanion(){
 return companionPromise??=import('./robot.js').then(m=>m.mountRobot(stage)).catch(error=>{
  document.querySelector('.robot-fallback').hidden=false;
  document.querySelector('#robot-state').textContent='3D unavailable';
  document.querySelector('#greet').disabled=true;document.querySelector('#motion').disabled=true;
  console.error('Companion initialization failed',error);throw error;
 });
}
const loader=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){loader.disconnect();getCompanion().catch(()=>{});}},{rootMargin:'150px'});loader.observe(stage);
document.querySelector('#greet').addEventListener('click',()=>getCompanion().then(c=>c.greet()).catch(()=>{}));
document.querySelector('#motion').addEventListener('click',()=>getCompanion().then(c=>c.toggleMotion()).catch(()=>{}));
