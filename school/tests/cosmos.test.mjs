import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schools} from '../public/data.js';
import {initialData} from '../lib/course-seed.mjs';
import {schoolPlanets,courseInSchool} from '../public/cosmos.js';
import {journey} from '../public/cosmos-view.js';

test('The solar journey moves from primary school to the exam orbit without changing stored school IDs',()=>{
 assert.deepEqual(schoolPlanets.map(s=>s.planet),['mars','jupiter','saturn','uranus','neptune']);
 assert.deepEqual(schoolPlanets.slice(0,4).map(s=>s.id),[...schools].reverse().map(s=>s.id));
 const links=[...journey().matchAll(/href="#\/school\/([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(links,schoolPlanets.map(s=>s.id));
});

test('Neptune presents existing exam courses while Uranus keeps the general senior curriculum',()=>{
 const data=initialData();
 const exams=data.courses.filter(c=>courseInSchool(c,'ege'));
 assert.ok(exams.length);
 assert.ok(exams.every(c=>c.level==='Подготовка к ЕГЭ'));
 assert.ok(exams.every(c=>!courseInSchool(c,'senior')));
 assert.ok(data.courses.some(c=>courseInSchool(c,'senior')));
 assert.ok(data.courses.some(c=>courseInSchool(c,'primary')));
 assert.ok(data.courses.every(c=>c.schools.every(id=>schools.some(s=>s.id===id))));
});
