import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orbitGeometry} from '../public/planet-flight.js';

test('The destination globe stays finite and visible from phone to ultrawide monitor',()=>{
  for(const [width,height] of [[320,700],[390,844],[700,900],[701,900],[1280,800],[1440,900],[2560,1440],[3840,2160]]){
    const orbit=orbitGeometry(width,height);
    assert.ok(Object.values(orbit).every(Number.isFinite));
    assert.ok(orbit.size>=620);
    assert.ok(orbit.size<=1900);
    assert.ok(orbit.left<width);
    assert.ok(orbit.left+orbit.size>width);
    assert.ok(orbit.top<height/2);
    assert.ok(orbit.top+orbit.size>height/2);
  }
});

test('Scrollbar space affects the landing position without changing the planet scale',()=>{
  const plain=orbitGeometry(1440,900);
  const withScrollbar=orbitGeometry(1440,900,1425);
  assert.equal(withScrollbar.size,plain.size);
  assert.equal(withScrollbar.top,plain.top);
  assert.equal(withScrollbar.left,plain.left-15);
});
