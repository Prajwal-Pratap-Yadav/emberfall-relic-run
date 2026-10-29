/** Reproducible production-rate soak. Eight threads own disjoint seeds; no simulation shortcuts. */
import {Worker,isMainThread,parentPort,workerData}from'node:worker_threads';
import {availableParallelism}from'node:os';
import{writeFileSync,mkdirSync}from'node:fs';
import{createState,step}from'../game/simulation.ts';
import{WEAPONS}from'../game/data.ts';
if(isMainThread){
 const workers=Math.min(8,availableParallelism()),start=performance.now();let completed=0;
 const groups=await Promise.all(Array.from({length:workers},(_,worker)=>new Promise((resolve,reject)=>{
  const w=new Worker(new URL(import.meta.url),{workerData:{worker,workers}});
  w.on('message',m=>{if(m.progress){completed+=m.progress;console.log(`${completed}/1000 production-rate matches · ${Math.round((performance.now()-start)/1000)}s`)}else resolve(m)});w.on('error',reject);w.on('exit',code=>{if(code)reject(Error('Worker exited '+code))});
 })));
 const rows=groups.flatMap(g=>g.rows).sort((a,b)=>a.seed-b.seed),times=rows.map(r=>r.seconds).sort((a,b)=>a-b);
 const summary={matches:rows.length,combatants:64,modeCounts:{solo:334,duo:333,squad:333},timeStep:.05,tickRate:20,fullZoneSchedule:true,shortcuts:false,failures:0,winnerEveryTime:true,wallMs:Math.round(performance.now()-start),threads:workers,durationSeconds:{min:times[0],median:times[500],p95:times[950],max:times[999],mean:times.reduce((a,b)=>a+b,0)/times.length},maxSampledStateBytes:Math.max(...rows.map(r=>r.peakBytes)),heap:groups.map(g=>g.heap)};
 mkdirSync('outputs',{recursive:true});writeFileSync('outputs/soak-production.json',JSON.stringify({summary,rows},null,2));console.log(JSON.stringify(summary,null,2));
}else{
 const rows=[],heaps=[];global.gc?.();const base=process.memoryUsage().heapUsed;let progress=0;
 for(let n=workerData.worker;n<1000;n+=workerData.workers){
  const mode=[1,2,4][n%3],s=createState(70000+n,mode,64,n/1000),start=performance.now();let ticks=0,peak=0;
  while(!s.ended&&ticks<12000){step(s,.05);ticks++;if(ticks%200===0){peak=Math.max(peak,JSON.stringify(s).length);for(const p of s.players)if(!Number.isFinite(p.x+p.y+p.hp+p.armor)||p.hp<0||p.armor<-.001||p.loadout.some(w=>w.mag<0||w.mag>WEAPONS[w.kind].mag))throw Error('Invalid state seed '+s.seed)}}
  if(!s.ended||s.winner===null)throw Error('No winner seed '+s.seed);rows.push({seed:s.seed,mode,seconds:+s.time.toFixed(2),winner:s.winner,ticks,ms:Math.round(performance.now()-start),peakBytes:peak});progress++;
  if(progress===10){parentPort.postMessage({progress});progress=0;global.gc?.();heaps.push(process.memoryUsage().heapUsed)}
 }
 if(progress)parentPort.postMessage({progress});global.gc?.();parentPort.postMessage({rows,heap:{base,after:process.memoryUsage().heapUsed,checkpoints:heaps}});
}
