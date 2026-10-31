import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flightStage,drawFlight,drawSurface,terrainPalettes} from '../public/expedition-art.js';
test('Landing crosses orbit and atmosphere before touching down; school entry stays in orbit',()=>{
 assert.equal(flightStage(0,true).phase,'orbit');
 assert.equal(flightStage(.4,true).phase,'atmosphere');
 assert.equal(flightStage(.8,true).phase,'surface');
 assert.deepEqual(flightStage(2,true),{phase:'surface',progress:1});
 assert.deepEqual(flightStage(-2,false),{phase:'orbit',progress:0});
 assert.deepEqual(flightStage(1,false),{phase:'orbit',progress:1});
});
test('Every planetary palette renders every flight stage and all grounded stations with valid canvas commands',()=>{
 let balance=0,painted=0;
 const ctx=new Proxy({}, {get:(_,key)=> (...args)=>{
  if(key==='save')balance++;if(key==='restore')balance--;
  assert.ok(balance>=0);
  for(const arg of args.flat())if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${String(key)} received a non-finite coordinate`);
  if(key==='fillRect')painted++;
 },set:()=>true});
 for(const name of Object.keys(terrainPalettes)){
  drawSurface(ctx,1200,340,name,['data','lab','rover','archive','flags','observatory'],3);
  for(const p of [0,.4,.8,1])drawFlight(ctx,960,540,name,'rover',3,p,true);
 }
 assert.equal(balance,0);assert.ok(painted>1000);
});
