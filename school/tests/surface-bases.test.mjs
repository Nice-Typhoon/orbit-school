import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baseKind,surfaceMap} from '../public/surface-bases.js';
import {initialData} from '../public/data.js';
import {schoolPlanets} from '../public/cosmos.js';
test('Every subject has a labelled landing link and new subjects receive a usable station',()=>{
 const subjects=[...initialData().subjects,{id:'chinese',title:'Китайский <язык>',icon:'globe',desc:''}];
 const html=surfaceMap(schoolPlanets[0],subjects);
 assert.equal((html.match(/data-land-school=/g)||[]).length,subjects.length);
 assert.ok(html.includes('#/subject/primary/chinese/courses'));
 assert.ok(html.includes('Китайский &lt;язык&gt;'));
 assert.equal(baseKind(subjects.at(-1)),'flags');
 assert.equal(baseKind({id:'new',icon:'unknown'}),'archive');
 assert.equal(baseKind({id:'robotics'}),'rover');
 assert.equal(baseKind({id:'coding'}),'data');
});
