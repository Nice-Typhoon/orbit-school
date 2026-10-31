// Original pixel scenery. All coordinates share a physical ground line, not floating tiles.
export const terrainPalettes = {
 mars:['#bd7957','#784b43','#412e38','#211e30'],
 jupiter:['#b69872','#766254','#464053','#252436'],
 saturn:['#a6a184','#676c66','#414b51','#202b37'],
 uranus:['#8abbb7','#557e87','#344d65','#182b42'],
 neptune:['#799cbd','#4a668f','#303e62','#18213b']
};
const mix=(hex,k)=>{const n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*k)).join(',')})`;};
const noise=(x,y=0)=>Math.sin(x*12.9898+y*78.233)*43758.5453%1;
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
const poly=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const line=(c,x,y,w,h,color)=>rect(c,x,y,w,h,color);
function stars(c,w,h,t,velocity=1){
 rect(c,0,0,w,h,'#090f22');
 for(let i=0;i<170;i++){
  const x=((i*137.7-t*velocity*(1+i%3))%w+w)%w,y=(i*71.3)%h;
  rect(c,x,y,i%19===0?2:1,i%19===0?2:1,['#7b8ba8','#c4c8cf','#60708c'][i%3]);
 }
 for(let i=0;i<95;i++){const x=(i*71)%w,y=30+Math.sin(i*.3)*40+(i%13)*3;rect(c,x,y,8+i%12,2,'#121b32');}
}
function ship(c,x,y,t,landing=false,thrust=1){
 c.save();c.translate(Math.round(x),Math.round(y));
 rect(c,-14,4,14,7,'#18273d');rect(c,-25,6,14+(Math.floor(t*15)%3)*4,3,'#f4bb70');rect(c,-20,7,10,1,'#fff0b5');
 poly(c,[[0,-8],[32,-8],[49,0],[60,4],[60,14],[38,20],[0,20],[-8,13],[-8,0]],'#77909e');
 rect(c,0,-5,30,5,'#c3c9ba');rect(c,4,5,26,11,'#34485d');rect(c,7,7,19,6,'#f2cb82');rect(c,32,0,13,10,'#8ee1db');rect(c,47,5,8,5,'#458b9f');
 rect(c,0,16,36,5,'#384c61');rect(c,12,-13,16,5,'#536b7c');rect(c,14,-11,10,2,'#9aafae');
 rect(c,3,11,2,2,'#e0d8b8');rect(c,29,11,2,2,'#e0d8b8');rect(c,36,16,3,2,'#ef9a65');
 if(landing){for(const sx of [6,35]){rect(c,sx,21,3,7,'#b4beb4');rect(c,sx-3,27,10,2,'#5e7982');if(thrust>0){const flame=5+Math.floor(thrust*16)+Math.floor(t*40)%4;rect(c,sx-1,22,5,flame,'#e99e69');rect(c,sx,22,3,flame-3,'#ffe3a2');}}}
 c.restore();
}
function planet(c,x,y,r,name,t){
 const p=terrainPalettes[name]||terrainPalettes.neptune;
 if(name==='saturn'){c.save();c.translate(x,y);c.rotate(-.32);c.strokeStyle='#847f71';c.lineWidth=8;c.beginPath();c.ellipse(0,0,r*1.55,r*.35,0,0,Math.PI*2);c.stroke();c.restore();}
 // Quantized sphere normals keep a consistent pixel grid and a real day/night boundary.
 for(let py=-r-3;py<=r+3;py+=3)for(let px=-r-3;px<=r+3;px+=3){
  const nx=px/r,ny=py/r,d=nx*nx+ny*ny;
  if(d>1.025)continue;
  if(d>1){rect(c,x+px,y+py,3,3,'#365c77');continue;}
  const nz=Math.sqrt(1-d),longitude=Math.atan2(nx,nz)+t*.035,latitude=Math.asin(ny);
  const field=Math.sin(longitude*5+Math.sin(latitude*7))*Math.cos(latitude*9)+Math.sin(longitude*11+latitude*4)*.3;
  const band=['jupiter','saturn','uranus','neptune'].includes(name);
  const land=band?Math.sin(latitude*25+Math.sin(longitude*4)*.3):field;
  const color=land>.35?p[0]:land>-.25?p[1]:p[2];
  const light=Math.max(.13,Math.min(1,-nx*.65-ny*.35+nz*.68));
  rect(c,x+px,y+py,3,3,mix(color,.3+Math.round(light*6)/7));
  if(!band&&field>.8&&nz>.3&&Math.sin(latitude*33+longitude*13+t*.015)>.65)rect(c,x+px,y+py,3,3,mix('#c9d3c5',light*.7));
 }
 if(name==='saturn'){c.save();c.translate(x,y);c.rotate(-.32);c.strokeStyle='#b9ae8d';c.lineWidth=6;c.beginPath();c.ellipse(0,0,r*1.55,r*.35,0,0,Math.PI);c.stroke();c.restore();}
}
export function drawOrbit(c,w,h,name,t=0,entry=1){
 c.imageSmoothingEnabled=false;stars(c,w,h,t,.6);
 const slide=(1-entry)*170;
 planet(c,w*.66+slide,h*.55,Math.min(w*.27,h*.49),name,t);
 c.save();c.strokeStyle='#8bbaab45';c.setLineDash([2,7]);c.beginPath();c.ellipse(w*.64,h*.58,w*.34,h*.36,-.25,0,Math.PI*2);c.stroke();c.restore();
 ship(c,w*.21-(1-entry)*210,h*.29+Math.sin(t*1.1)*2,t);
 // Orbital relay, with panels aligned to its actual support mast.
 rect(c,w*.84,h*.13,3,15,'#8fadaf');rect(c,w*.84-22,h*.13+4,18,10,'#3e5d7c');rect(c,w*.84+6,h*.13+4,18,10,'#3e5d7c');rect(c,w*.84-2,h*.13+4,8,9,'#c4c9b8');
 for(let i=0;i<5;i++){const a=i*.7+t*.02;const x=w*.66+Math.cos(a)*w*.15,y=h*.55+Math.sin(a)*h*.21;rect(c,x,y,2,2,'#e7ce89');}
}
function mountains(c,w,base,color,seed,height){
 const pts=[[0,base+height]];
 for(let x=0;x<=w+16;x+=16){const y=base-Math.floor((Math.sin(x*.013+seed)*.5+Math.sin(x*.027+seed)*.25+.7)*height/4)*4;pts.push([x,y],[x+16,y]);}
 pts.push([w,400],[0,400]);poly(c,pts,color);
}
function terrain(c,w,h,name,t){
 const p=terrainPalettes[name]||terrainPalettes.mars;
 stars(c,w,h,t,.05);rect(c,0,105,w,140,'#1b293f');rect(c,0,145,w,100,mix(p[2],.7));
 mountains(c,w,190,mix(p[1],.43),1,55);mountains(c,w,220,mix(p[1],.66),4,62);
 rect(c,0,242,w,h-242,p[2]);rect(c,0,242,w,5,p[0]);rect(c,0,247,w,9,p[1]);
 for(let x=0;x<w;x+=6){const y=259+Math.floor(Math.abs(noise(x))*74);rect(c,x,y,2+(x%4),2,x%3?mix(p[1],.7):p[3]);if(x%18===0)rect(c,x,238,3,4,p[1]);}
 rect(c,0,310,w,h-310,p[3]);
 for(let x=0;x<w;x+=28){rect(c,x,312+Math.floor(Math.abs(noise(x))*20),14,2,mix(p[1],.4));}
}
function windowPane(c,x,y,w,h,warm=false){rect(c,x-2,y-2,w+4,h+4,'#17293a');rect(c,x,y,w,h,warm?'#dbac72':'#568f9f');rect(c,x,y,w,2,warm?'#f2d194':'#a4d6c7');}
function wall(c,x,y,w,h){rect(c,x,y,w,h,'#526879');rect(c,x,y,w,4,'#a0aca8');rect(c,x,y+4,w,3,'#758a93');rect(c,x,y+h-5,w,5,'#344a5e');for(let xx=x+5;xx<x+w;xx+=18)rect(c,xx,y+9,1,h-16,'#455b6e');}
function door(c,x,y,h=27){rect(c,x,y,14,h,'#273e50');rect(c,x+2,y+2,10,h-4,'#526e7c');rect(c,x+5,y+4,5,6,'#9bbaa8');rect(c,x+10,y+h-10,2,2,'#e5bc77');}
function roof(c,x,y,w){rect(c,x-3,y,w+6,5,'#344958');rect(c,x-1,y,w+2,2,'#b4bba7');}
function solar(c,x,y){rect(c,x+9,y+9,3,14,'#536c7b');poly(c,[[x,y],[x+29,y],[x+23,y+11],[x-6,y+11]],'#304c70');for(let i=0;i<4;i++)rect(c,x+i*7-2,y+2,1,6,'#6289a4');rect(c,x-5,y+9,29,2,'#718e9d');}
function astronaut(c,x,y,t){const step=Math.floor(t*2)%2;rect(c,x,y,5,5,'#d0c4a3');rect(c,x+2,y+1,4,2,'#638e9a');rect(c,x,y+5,6,5,'#99aeb2');rect(c,x-2,y+5,2,5,'#587384');rect(c,x,y+10,2,3+step,'#597081');rect(c,x+4,y+10,2,4-step,'#597081');}
function rover(c,x,y,t){for(let i=0;i<3;i++){rect(c,x+i*10,y+10,8,7,'#122333');rect(c,x+i*10+2,y+12,4,3,'#7695a0');}rect(c,x-1,y+4,32,7,'#b49b70');rect(c,x+5,y,17,6,'#d1b98c');rect(c,x+19,y-6,3,9,'#8ba9aa');rect(c,x+22,y-7,8,4,'#b6c7ba');rect(c,x+27,y-6,3,2,'#83d6d1');}
function flag(c,x,y,index,t){rect(c,x,y,2,38,'#b9bca9');const wav=Math.sin(t*2+index)>.2?1:0;const fx=x+2,fy=y+1;
 if(index===0){rect(c,fx,fy,16,10,'#304e7b');for(let i=0;i<5;i++){rect(c,fx+i*3,fy+i*2,3,2,'#ddd8bd');rect(c,fx+13-i*3,fy+i*2,3,2,'#ddd8bd');}rect(c,fx+6,fy,4,10,'#ddd8bd');rect(c,fx,fy+3,16,4,'#ddd8bd');rect(c,fx+7,fy,2,10,'#bd5962');rect(c,fx,fy+4,16,2,'#bd5962');}
 if(index===1){rect(c,fx,fy+wav,16,10,'#bf4e58');rect(c,fx+3,fy+3+wav,3,3,'#e5c77d');rect(c,fx+9,fy+2+wav,1,1,'#e5c77d');}
 if(index===2){rect(c,fx,fy,16,3,'#202b37');rect(c,fx,fy+3,16,4,'#b65054');rect(c,fx,fy+7,16,3,'#dcc17a');}
 if(index===3){rect(c,fx,fy+wav,5,10,'#547695');rect(c,fx+5,fy+wav,6,10,'#ddd7be');rect(c,fx+11,fy+wav,5,10,'#c76b67');}
}
export function drawBuilding(c,cx,ground,kind,t=0){
 const x=Math.round(cx-58),y=ground;
 // Concrete footing and bolted skids connect every wall to the shared ground.
 rect(c,x-7,y-3,133,6,'#263a4a');rect(c,x-5,y-3,129,2,'#8e9c94');
 if(kind==='data'){
  wall(c,x+8,y-91,93,88);roof(c,x+5,y-96,99);wall(c,x+91,y-66,22,63);roof(c,x+89,y-70,26);
  for(let i=0;i<3;i++){windowPane(c,x+17+i*24,y-76,17,38);rect(c,x+19+i*24,y-74,13,34,'#243c4d');for(let j=0;j<6;j++){rect(c,x+21+i*24,y-71+j*5,9,3,'#456f80');rect(c,x+21+i*24,y-71+j*5,2,1,j%2?'#9de4bc':'#d9b778');}}
  door(c,x+49,y-30);for(let i=0;i<3;i++){rect(c,x+96,y-59+i*15,13,10,'#233a4d');rect(c,x+100,y-56+i*15,5,3,'#7597a1');}
  rect(c,x+15,y-105,25,9,'#3b5467');rect(c,x+18,y-103,19,2,'#708d98');rect(c,x+68,y-127,2,30,'#98aaa7');rect(c,x+62,y-119,14,2,'#829d9f');rect(c,x+68,y-129,3,3,'#e5b871');solar(c,x-27,y-25);
 }else if(kind==='rover'){
  wall(c,x,y-64,117,61);poly(c,[[x-3,y-65],[x+10,y-80],[x+103,y-80],[x+121,y-65]],'#758d98');rect(c,x+13,y-78,86,3,'#b7bca9');
  rect(c,x+12,y-55,65,51,'#152a3c');for(let i=0;i<4;i++)rect(c,x+13,y-54+i*5,62,2,'#5c7888');rect(c,x+9,y-57,4,53,'#a49973');rect(c,x+77,y-57,4,53,'#a49973');
  windowPane(c,x+90,y-51,17,13,true);door(c,x+91,y-30);rect(c,x+18,y-91,3,12,'#819a9b');rect(c,x+18,y-94,75,4,'#d0b984');rect(c,x+87,y-90,2,25,'#819a9b');rect(c,x+84,y-66,7,4,'#b4b3a0');rover(c,x+24,y-20,t);rover(c,x+124,y-15,t);
 }else if(kind==='flags'){
  wall(c,x+8,y-74,104,71);roof(c,x+5,y-79,110);windowPane(c,x+17,y-59,28,23,true);windowPane(c,x+76,y-59,26,23,true);door(c,x+52,y-36,33);roof(c,x+45,y-40,29);solar(c,x+22,y-98);
  for(let i=0;i<4;i++)flag(c,x-20+i*44,y-44-(i%2)*8,i,t);
 }else if(kind==='lab'){
  wall(c,x+7,y-75,105,72);poly(c,[[x+3,y-77],[x+21,y-95],[x+100,y-95],[x+116,y-77]],'#789c9c');rect(c,x+23,y-93,74,3,'#b9cbb5');
  windowPane(c,x+16,y-66,54,36);rect(c,x+20,y-61,46,24,'#365d67');for(let i=0;i<3;i++){rect(c,x+25+i*12,y-48,6,9,'#96c6af');rect(c,x+27+i*12,y-54,2,8,'#c6d9b7');}door(c,x+83,y-34,31);rect(c,x+73,y-66,3,63,'#adb5a2');
  rect(c,x+117,y-44,15,41,'#677f8b');rect(c,x+120,y-41,9,27,'#94b9b6');rect(c,x+121,y-58,3,14,'#8aa2a3');
 }else if(kind==='observatory'){
  wall(c,x+17,y-63,84,60);poly(c,[[x+14,y-65],[x+14,y-77],[x+21,y-77],[x+21,y-88],[x+32,y-88],[x+32,y-96],[x+45,y-96],[x+45,y-100],[x+73,y-100],[x+73,y-96],[x+88,y-96],[x+88,y-87],[x+99,y-87],[x+99,y-76],[x+105,y-76],[x+105,y-65]],'#8b9fa2');
  rect(c,x+55,y-100,8,35,'#293f53');poly(c,[[x+58,y-78],[x+87,y-108],[x+96,y-101],[x+67,y-70]],'#bdc4b0');rect(c,x+89,y-111,8,9,'#5b8e9b');door(c,x+52,y-34,31);windowPane(c,x+27,y-44,15,13,true);solar(c,x-28,y-24);
 }else{
  wall(c,x+3,y-86,111,83);roof(c,x,y-91,117);for(let i=0;i<3;i++){windowPane(c,x+13+i*31,y-72,23,32,true);for(let j=0;j<4;j++){rect(c,x+15+i*31,y-69+j*7,19,2,'#967358');for(let k=0;k<5;k++)rect(c,x+16+i*31+k*4,y-73+j*7,2,4,['#c4a574','#8fab9e','#b77f6a'][k%3]);}}
  door(c,x+54,y-32,29);rect(c,x+47,y-37,27,4,'#c8b58b');rect(c,x+22,y-103,65,10,'#3e5969');rect(c,x+26,y-101,57,3,'#c5b389');
 }
 // Walkway lamps, landing pad paint and a small suited researcher establish scale.
 rect(c,x-17,y-13,2,13,'#6e8a91');rect(c,x-19,y-15,6,3,'#e5c78b');rect(c,x+117,y-13,2,13,'#6e8a91');rect(c,x+115,y-15,6,3,'#e5c78b');
 astronaut(c,x+79,y-16,t);
}
export function drawSurface(c,w,h,name,kinds,t=0,{landing=null,progress=1}={}){
 c.imageSmoothingEnabled=false;
 if(landing){
  stars(c,w,h,t,.05);
  const lift=(1-progress)*160;c.save();c.translate(0,lift);terrain(c,w,h,name,t);drawBuilding(c,w*.68,242,landing,t);rect(c,w*.32,239,85,3,'#a6b2a0');for(let i=0;i<7;i++)rect(c,w*.32+i*12,236,7,3,'#d4ba80');c.restore();
  ship(c,w*.35,Math.min(210,45+progress*165),t,true,Math.max(0,1-progress*1.2));
  for(let i=0;i<12;i++){const a=(i*21+t*30)%80;rect(c,w*.36+a,240-i%3,3,1,progress>.8?'#a49c7a':'#455268');}
 }else{
  terrain(c,w,h,name,t);
  const spacing=w/Math.max(1,kinds.length);
  kinds.forEach((kind,i)=>{drawBuilding(c,spacing*(i+.5),242,kind,t);if(i<kinds.length-1){for(let px=spacing*(i+.5)+65;px<spacing*(i+1.5)-65;px+=8)rect(c,px,240,5,2,'#7d8c83');}});
 }
}
export function flightStage(progress,landing){
 const p=Math.max(0,Math.min(1,progress));
 return !landing ? {phase:'orbit',progress:p} : p<.32?{phase:'orbit',progress:p/.32}:p<.58?{phase:'atmosphere',progress:(p-.32)/.26}:{phase:'surface',progress:Math.min(1,(p-.58)/.42)};
}
export function drawFlight(c,w,h,name,kind,time,p,landing){
 const stage=flightStage(p,landing);
 if(stage.phase==='orbit')drawOrbit(c,w,h,name,time,landing?1:Math.min(1,p*1.2));
 if(stage.phase==='atmosphere'){
  stars(c,w,h,time,8);rect(c,0,0,w,h,mix((terrainPalettes[name]||terrainPalettes.mars)[1],.5));
  for(let i=0;i<18;i++){const y=((i*27+stage.progress*h*2)%h);rect(c,(i*119)%w,y,60+(i%4)*40,3,'#b5c3bc33');}
  ship(c,w*.4,h*.4+stage.progress*h*.18,time,true,1);
 }if(stage.phase==='surface'){c.save();c.scale(w/720,w/720);drawSurface(c,720,h*720/w,name,[],time,{landing:kind,progress:stage.progress});c.restore();}
}
