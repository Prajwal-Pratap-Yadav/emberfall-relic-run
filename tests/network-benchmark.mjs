import {createState,step,addHuman,move,sanitize,emptyInput,dist} from '../game/simulation.ts';
import {writeFileSync}from'node:fs';
let rng=781;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
let s=createState(55,1,2,0,true);let p=addHuman(s,'human','Net test','human');Object.assign(p,{phase:'ground',x:1000,y:1800,invuln:999});let predicted={x:p.x,y:p.y},up=[],down=[],pending=[],seq=0,lastSeq=-1,latest=emptyInput(),active=emptyInput(),acceptedTime=-1,drops=0,reordered=0,arrived=0,errors=[],snaps=0;
const latency=()=>75+(rand()-.5)*70;
for(let n=0;n<42*60;n++){
 const ms=n*1000/60;
 if(n%3===0){const sec=ms/1000;const input={...emptyInput(),seq:++seq,mx:sec<38?Math.cos(sec*.3)*.7:0,my:sec<38?Math.sin(sec*.3)*.7:0};active=input;pending.push(input);if(rand()<.05)drops++;else up.push({at:ms+latency(),input})}
 const ready=up.filter(m=>m.at<=ms).sort((a,b)=>a.at-b.at);up=up.filter(m=>m.at>ms);for(const m of ready){if(m.input.seq>lastSeq){latest=sanitize(m.input);lastSeq=m.input.seq;arrived=ms}else reordered++}
 if(n%3===0){step(s,.05,{human:ms-arrived<350?latest:emptyInput()})}
 if(n%6===0){if(rand()<.05)drops++;else down.push({at:ms+latency(),time:s.time,x:p.x,y:p.y,ack:p.seq})}
 for(const m of down.filter(m=>m.at<=ms).sort((a,b)=>a.at-b.at)){
  if(m.time<=acceptedTime){reordered++;continue}acceptedTime=m.time;pending=pending.filter(i=>i.seq>m.ack);predicted={x:m.x,y:m.y};for(const i of pending)move(predicted,i.mx,i.my,.05);snaps++;
 }down=down.filter(m=>m.at>ms);
 move(predicted,active.mx,active.my,1/60);if(n>60)errors.push(dist(predicted,p));
}
const e=[...errors].sort((a,b)=>a-b);const network={model:'Synthetic 75ms each direction = 150ms RTT, independent ±35ms jitter, Bernoulli 5% loss both directions. This is not a real WebRTC impairment test.',seconds:42,inputs:seq,snapshots:snaps,droppedPackets:drops,reorderedDiscarded:reordered,meanError:errors.reduce((a,b)=>a+b,0)/errors.length,p95Error:e[Math.floor(e.length*.95)],maxError:e.at(-1),settledError:dist(predicted,p),finite:[predicted.x,p.x].every(Number.isFinite)};
if(!network.finite||network.settledError>3)throw Error('Prediction failed to converge');
let rooms=Array.from({length:8},(_,i)=>createState(100+i,4,64)),cost=[],batch=[],begin=performance.now();
for(let n=0;n<2400;n++){const a=performance.now();for(const room of rooms){const t=performance.now();step(room,.05);cost.push(performance.now()-t)}batch.push(performance.now()-a)}
const c=cost.sort((a,b)=>a-b),b=batch.sort((a,b)=>a-b);const load={model:'8 concurrent in-process rooms, 64 combatants each, 20 Hz fixed simulation, 120 simulated seconds. Desktop executor CPU; not an eight-room production WebRTC test.',rooms:8,combatants:512,ticks:cost.length,wallMs:performance.now()-begin,roomTickMs:{mean:cost.reduce((a,b)=>a+b,0)/cost.length,p95:c[Math.floor(c.length*.95)],p99:c[Math.floor(c.length*.99)],max:c.at(-1)},eightRoomBatchP99:b[Math.floor(b.length*.99)],tickBudgetMs:50,p99HeadroomPercent:100*(1-c[Math.floor(c.length*.99)]/50)};
writeFileSync('outputs/network-load.json',JSON.stringify({network,load},null,2));console.log(JSON.stringify({network,load},null,2));
