import {drawOrbit,drawSurface} from './expedition-art.js';
let stopScene=()=>{};
export function mountExpeditionScenes(){
 stopScene();
 const canvases=[...document.querySelectorAll('canvas[data-expedition]')];
 if(!canvases.length)return;
 let cancelled=false,frame=0,last=0,wasQuiet=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const paint=time=>{
  if(cancelled)return;
  const quiet=reduced.matches||document.documentElement.classList.contains('motion-off');
  if(!document.hidden&&(!last||(!quiet&&time-last>65)||quiet!==wasQuiet)){
   canvases.forEach(canvas=>{
    const c=canvas.getContext('2d');if(!c)return;
    const t=quiet?0:time/1000;
    if(canvas.dataset.expedition==='orbit')drawOrbit(c,canvas.width,canvas.height,canvas.dataset.planet,t);
    else drawSurface(c,canvas.width,canvas.height,canvas.dataset.planet,(canvas.dataset.kinds||'').split(',').filter(Boolean),t,canvas.dataset.expedition==='landed'?{landing:canvas.dataset.kind,progress:1}:{});
   });last=time;wasQuiet=quiet;
  }
  frame=requestAnimationFrame(paint);
 };
 frame=requestAnimationFrame(paint);
 stopScene=()=>{cancelled=true;cancelAnimationFrame(frame);};
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;
 if(button.dataset.action==='view-settlement'){event.preventDefault();document.querySelector('#settlement')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 if(button.dataset.action==='pan-settlement'){const viewport=button.closest('.expedition')?.querySelector('.surface-scroll');viewport?.scrollBy({left:Number(button.dataset.direction)*Math.max(200,viewport.clientWidth*.65),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
});
