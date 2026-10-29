/** Input-only automated pilot. No invulnerability, teleportation, damage or result overrides. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createAdventure,stepAdventure} from '../game/adventure.ts';
import {blocked,dist,lineOfSight,emptyInput} from '../game/simulation.ts';
const count=Number(process.argv[2]??1000),rows=[],failures=[],start=performance.now();
const size=36,origin=1050,width=59,grid=new Map();
for(let y=0;y<width;y++)for(let x=0;x<width;x++){const p={x:origin+x*size,y:origin+y*size};if(!blocked(p.x,p.y,22)&&Math.hypot(p.x-2100,p.y-2100)<1060)grid.set(y*width+x,p);}
function nearest(p){let best=Infinity,key=0;for(const [k,q]of grid){const d=dist(p,q);if(d<best){best=d;key=k;}}return key;}
function route(from,to){
 const first=nearest(from),last=nearest(to),queue=[first],prev=new Map([[first,-1]]);
 for(let n=0;n<queue.length&&!prev.has(last);n++){const key=queue[n],x=key%width,y=Math.floor(key/width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*width+nx;if(nx<0||nx>=width||ny<0||ny>=width||!grid.has(k)||prev.has(k))continue;prev.set(k,key);queue.push(k);}}
 if(!prev.has(last))return [to];const path=[to];for(let k=last;k!==first&&k!==-1;k=prev.get(k))path.unshift(grid.get(k));return path;
}
for(let run=0;run<count;run++){
 const s=createAdventure(91000+run,'pilot','Input Pilot'),p=s.players[0],a=s.adventure;let oldStage=-1,path=[],pointer=0,maxActors=0;
 for(let tick=0;tick<7300&&!s.ended;tick++){
  const goal=a.sites[Math.min(3,a.stage)];if(a.stage!==oldStage){path=route(p,goal);pointer=0;oldStage=a.stage;}
  while(pointer<path.length-1&&dist(p,path[pointer])<23)pointer++;
  const waypoint=path[pointer]??goal;let dx=waypoint.x-p.x,dy=waypoint.y-p.y;
  if(dist(p,goal)<50){dx=0;dy=0;}
  const enemies=s.players.filter(q=>q.role&&q.alive&&dist(p,q)<620&&lineOfSight(p,q)).sort((a,b)=>dist(p,a)-dist(p,b));const enemy=enemies[0];
  const warning=a.blasts.find(b=>b.team===1&&dist(p,b)<b.radius+30);if(warning){dx=p.x-warning.x||1;dy=p.y-warning.y||1;}
  const n=Math.hypot(dx,dy)||1,aim=enemy?Math.atan2(enemy.y-p.y,enemy.x-p.x):Math.atan2(dy,dx),slot=p.loadout[p.slot];
  let input={...emptyInput(),seq:tick+1,actionSeq:tick+1,mx:dx/n,my:dy/n,aim,fire:!!enemy&&!warning,reload:slot.mag===0||!enemy&&slot.mag<8,heal:p.hp<62&&(!enemy||dist(p,enemy)>300),grenade:!!enemy&&dist(p,enemy)>145&&dist(p,enemy)<310,dash:!!warning||!enemy&&dist(p,goal)>250};
  if(run%5===4)input={...emptyInput(),seq:tick+1,actionSeq:tick+1};
  stepAdventure(s,.05,{pilot:input});maxActors=Math.max(maxActors,s.players.length);
  if(tick%100===0){for(const q of s.players){if(![q.x,q.y,q.hp,q.armor,q.reserve].every(Number.isFinite)||q.reserve<0||q.loadout.some(w=>w.mag<0)){failures.push({seed:s.seed,tick,reason:'non-finite state or negative ammo'});break;}}}
 }
 if(!s.ended||s.winner===null||s.time>360.1||maxActors>32)failures.push({seed:s.seed,reason:'terminal state/bound failed',time:s.time,maxActors});
 rows.push({seed:s.seed,won:s.winner===0,stage:a.stage,time:+s.time.toFixed(2),defeats:p.defeats,hp:p.hp,bestCombo:a.bestCombo,maxActors});
 if((run+1)%100===0)console.log(JSON.stringify({completed:run+1,failures:failures.length,wins:rows.filter(r=>r.won).length}));
}
const wins=rows.filter(r=>r.won),times=wins.map(r=>r.time).sort((a,b)=>a-b);
const result={date:new Date().toISOString(),method:'20Hz input-only runs: 80% omniscient pilot with fixed navigation and ideal aim, 20% idle inputs. No health, movement or result overrides. Not a real-player win-rate estimate.',count,failures,wins:wins.length,winMedianSeconds:times[Math.floor(times.length/2)]??null,wallMs:Math.round(performance.now()-start),simulationSha256:createHash('sha256').update(readFileSync('game/simulation.ts')).update(readFileSync('game/adventure.ts')).digest('hex'),rows};
mkdirSync('evidence',{recursive:true});writeFileSync('evidence/adventure-soak.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,rows:undefined}));if(failures.length)process.exitCode=1;
