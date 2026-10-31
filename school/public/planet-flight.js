import {planetSchool} from './cosmos.js';
import {drawFlight} from './expedition-art.js';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function orbitGeometry(width, height, contentWidth = width) {
  const size = width <= 700
    ? Math.max(620, Math.min(width * 1.7, 1000))
    : Math.max(900, Math.min(width * .94, 1900));
  return {size, left: contentWidth - size * .72, top: height * .12};
}

export function installPlanetFlights(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=null;
 const clear=f=>{if(active!==f)return;active=null;cancelAnimationFrame(f.frame);f.overlay.remove();document.documentElement.classList.remove('planet-in-flight');};
 const commit=f=>{if(active!==f)return;f.committed=true;location.hash=f.href;};
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-flight-school],a[data-land-school]');
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target==='_blank')return;
  if(active){event.preventDefault();return;}
  const school=planetSchool(link.dataset.flightSchool||link.dataset.landSchool);
  if(!school||location.hash===link.getAttribute('href')||reduced.matches||document.documentElement.classList.contains('motion-off'))return;
  const landing=!!link.dataset.landSchool;
  const overlay=document.createElement('div');overlay.className='expedition-flight';
  overlay.innerHTML=`<div class="cinema-top"><span>ОРБИТА / ПОЛЁТНЫЙ ЖУРНАЛ</span><span>OR–01</span></div><canvas width="960" height="540" aria-hidden="true"></canvas><div class="cinema-caption" role="status"><span>${landing?'ОРБИТА → АТМОСФЕРА → ПОВЕРХНОСТЬ':'ВЫХОД ИЗ ПЕРЕЛЁТА · ОРБИТАЛЬНЫЙ МАНЁВР'}</span><strong>${escape(landing?link.dataset.baseTitle:school.title)}</strong><div class="cinema-progress"><i></i></div><small>Esc — отменить перелёт</small></div>`;
  const canvas=overlay.querySelector('canvas'),context=canvas.getContext('2d');if(!context)return;
  event.preventDefault();document.body.append(overlay);document.documentElement.classList.add('planet-in-flight');
  const f={overlay,href:link.getAttribute('href'),origin:link,frame:0,start:performance.now(),committed:false};active=f;
  const duration=landing?3600:2800;
  const tick=now=>{
   if(active!==f)return;
   const p=Math.min(1,(now-f.start)/duration);
   drawFlight(context,960,540,school.planet,link.dataset.baseKind||'archive',now/1000,p,landing);
   overlay.querySelector('.cinema-progress i').style.width=`${p*100}%`;
   if(p<1)f.frame=requestAnimationFrame(tick);
   else{commit(f);overlay.classList.add('cinema-reveal');const fade=overlay.animate([{opacity:1},{opacity:0}],{duration:450,fill:'forwards'});fade.finished.then(()=>clear(f),()=>clear(f));}
  };
  f.frame=requestAnimationFrame(tick);
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){const f=active;clear(f);if(!f.committed&&f.origin.isConnected)f.origin.focus({preventScroll:true});else document.querySelector('#main')?.focus({preventScroll:true});}});
 window.addEventListener('hashchange',()=>{if(active&&location.hash!==active.href)clear(active);});
 const finish=()=>{if(active){const f=active;commit(f);clear(f);}};
 window.addEventListener('resize',finish);
 reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
}
