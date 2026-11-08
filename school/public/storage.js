import {publicLibrary} from './data.js';
const key='orbita-school-v1';
export function loadData(){
 try{
  const data=JSON.parse(localStorage.getItem(key));
  if(data?.version===1&&Array.isArray(data.subjects)&&Array.isArray(data.courses))return data;
 }catch{}
 return {version:1,platform:'Орбита',subjects:[],courses:[],progress:{},attempts:[]};
}
export function saveData(data,{keepGuestLearning=false}={}){
 try{
  const learning=keepGuestLearning?loadData():data;
  const {progress,attempts}=learning;
  localStorage.setItem(key,JSON.stringify({version:1,serverManaged:data.serverManaged,...publicLibrary(data),progress,attempts}));
  return true;
 }catch{return false;}
}
let connection;
function db(){return connection??=new Promise((resolve,reject)=>{const req=indexedDB.open('orbita-materials',1);req.onupgradeneeded=()=>req.result.createObjectStore('files');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function putFile(id,file){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
export async function getFile(id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function deleteFile(id){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
