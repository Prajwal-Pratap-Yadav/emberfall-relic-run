/** Relic Run: a deterministic, local expedition built on the real combat simulation. */
import {CENTER,WEAPONS} from './data.ts';
import {createState,addHuman,step,emptyInput,move,blocked,random,clamp,dist,lineOfSight,angleDiff,applyDamage,emit,type State,type Input,type Player,type Vec} from './simulation.ts';

export const OBJECTIVES=[
 {title:'BREACH THE RELAY',detail:'Stand in the gold ring. Clear nearby raiders to secure the first relic.',action:'SECURING RELAY',seconds:6},
 {title:'RECOVER THE SUN CORE',detail:'Follow the gold marker to the ruins. Secure the second relic.',action:'RECOVERING CORE',seconds:7},
 {title:'DEFEAT THE WARDEN',detail:'Break its armor. Dash out of red danger zones. Grenades hit hard.',action:'WARDEN ACTIVE',seconds:1},
 {title:'HOLD FOR EXTRACTION',detail:'Reach the green landing pad and hold the ring for 8 seconds.',action:'EXTRACTING',seconds:8},
 {title:'RELICS SECURED',detail:'The coast remembers your name.',action:'MISSION COMPLETE',seconds:1},
] as const;

// Open clearings are verified against the same collision geometry used for movement.
export const SITES=[{x:CENTER-360,y:CENTER+240,name:'RELAY BREACH'},{x:CENTER+320,y:CENTER+40,name:'SUN CORE RUINS'},{x:CENTER+80,y:CENTER-360,name:'WARDEN ARENA'},{x:CENTER-400,y:CENTER-220,name:'EXTRACTION'}];
function openPoint(s:State,center:Vec,min:number,max:number):Vec{
 for(let n=0;n<100;n++){const a=random(s)*Math.PI*2,r=min+random(s)*(max-min),p={x:center.x+Math.cos(a)*r,y:center.y+Math.sin(a)*r};if(!blocked(p.x,p.y,22)&&Math.hypot(p.x-CENTER,p.y-CENTER)<1030)return p;}
 return {...center};
}
export function createAdventure(seed:number,id:string,name:string):State{
 const s=createState(seed,1,1,.4);const me=addHuman(s,id,name,id)!;
 Object.assign(me,{x:CENTER-440,y:CENTER+380,team:0,phase:'ground',alt:0,invuln:2,loadout:[{kind:2,tier:1,mag:24},{kind:1,tier:1,mag:30}],slot:0,armor:60,maxArmor:60,reserve:200,heals:3,lastAction:0});
 s.loot=s.loot.filter(l=>Math.hypot(l.x-CENTER,l.y-CENTER)<950);
 // Side paths reward exploration with all six weapon archetypes.
 for(let n=0;n<6;n++){const p=openPoint(s,SITES[n%3],85,170);s.loot.push({...p,id:s.lid++,kind:'weapon',weapon:n,tier:2,air:n===3});}
 s.adventure={stage:0,charge:0,sites:SITES.map(p=>({...p})),wave:0,nextWave:1.8,spawnId:0,dashReady:0,grenades:3,grenadeReady:0,abilitySeq:0,nextPulse:0,bossId:'',rewarded:[],combo:0,comboUntil:0,bestCombo:0,limit:360,blasts:[]};
 emit(s,{kind:'objective',x:me.x,y:me.y,from:id,label:'RELIC RUN · TWO CORES. ONE WAY OUT.'});return s;
}
function spawn(s:State,role:NonNullable<Player['role']>,center:Vec){
 const a=s.adventure!,id='raider-'+(++a.spawnId),base=s.players[0];
 const pos=role==='warden'?{...SITES[2]}:openPoint(s,center,300,430);
 const kind=role==='scout'?1:role==='elite'?4:role==='warden'?2:0;
 const hp={scout:48,raider:65,elite:130,warden:900}[role];
 // New actors copy only the fixed player schema; mutable inventory and vectors are independent.
 const p:Player={...base,...pos,id,name:role==='warden'?'THE ASH WARDEN':role==='elite'?'Relic enforcer':role==='scout'?'Coast runner':'Ash raider',team:1,bot:true,taken:false,role,maxHp:hp,hp,armor:role==='elite'?35:0,maxArmor:role==='elite'?35:0,alive:true,knocked:false,phase:'ground',alt:0,invuln:0,bleed:0,revive:0,loadout:[{kind,tier:0,mag:WEAPONS[kind].mag}],slot:0,reserve:240,heals:0,healing:0,reloading:0,cooldown:1.1,defeats:0,damage:0,revives:0,survived:0,seq:0,lastAction:s.time,seen:s.time+1.1,think:0,target:'',goal:{...center},personality:a.spawnId%4,spread:0,lastHit:-10,lastAttacker:'',deathTime:0,placement:0,lag:0};
 (p as Player&{actionSeq?:number}).actionSeq=0;s.players.push(p);if(role==='warden')a.bossId=id;return p;
}
function raiderInput(s:State,p:Player,me:Player,dt:number):Input{
 const i={...emptyInput(),seq:p.seq+1,actionSeq:p.seq+1};const d=dist(p,me),desired=Math.atan2(me.y-p.y,me.x-p.x);
 // Limited turn rate, deliberately imperfect aim and a visible wind-up keep encounters readable.
 const wobble=Math.sin(s.time*2+p.personality*2)*.095;
 i.aim=p.angle+clamp(angleDiff(desired+wobble,p.angle),-dt*3.8,dt*3.8);
 const sight=lineOfSight(p,me),range=p.role==='elite'?205:p.role==='scout'?205:290;
 i.fire=s.time>p.seen&&sight&&d<WEAPONS[p.loadout[0].kind].range*.83&&Math.abs(angleDiff(desired,i.aim))<.23&&Math.sin(s.time*2.5+p.personality)>.15;
 let heading=desired;if(sight&&d<range)heading+=Math.PI/2*(p.personality%2?1:-1);
 i.mx=Math.cos(heading);i.my=Math.sin(heading);
 if(blocked(p.x+i.mx*32,p.y+i.my*32)){heading+=(p.personality%2?1:-1)*1.35;i.mx=Math.cos(heading);i.my=Math.sin(heading);if(blocked(p.x+i.mx*32,p.y+i.my*32)){i.mx=-i.mx;i.my=-i.my;}}
 if(p.role==='warden'&&d<240){i.mx=0;i.my=0;}
 if(p.loadout[0].mag===0)i.reload=true;return i;
}
export function stepAdventure(s:State,dt:number,intents:Record<string,Input>={}){
 if(s.ended||!s.adventure)return;const a=s.adventure,me=s.players[0],input=intents[me.id]??emptyInput();
 const action=input.actionSeq??input.seq;
 if(me.alive&&action>a.abilitySeq){
  a.abilitySeq=action;
  if(input.dash&&s.time>=a.dashReady){
   const old={x:me.x,y:me.y},n=Math.hypot(input.mx,input.my),dx=n>.1?input.mx/n:Math.cos(input.aim),dy=n>.1?input.my/n:Math.sin(input.aim);
   // Small collision-tested substeps prevent a dash from teleporting through walls.
   for(let n=0;n<14;n++)move(me,dx,dy,.01,1100);
   a.dashReady=s.time+3.2;me.invuln=Math.max(me.invuln,.24);me.healing=0;
   emit(s,{kind:'dash',...old,from:me.id,angle:Math.atan2(me.y-old.y,me.x-old.x),amount:dist(old,me)});
  }
  if(input.grenade&&a.grenades>0&&s.time>=a.grenadeReady){
   // Throw intent includes aim only. Authority chooses the bounded landing point.
   const target={x:me.x+Math.cos(input.aim)*235,y:me.y+Math.sin(input.aim)*235};
   a.grenades--;a.grenadeReady=s.time+.7;a.blasts.push({...target,id:++s.eid,from:me.id,team:0,radius:115,at:s.time+.8,born:s.time,start:{x:me.x,y:me.y}});
  }
 }
 const inputs:Record<string,Input>={[me.id]:input};for(const p of s.players)if(p.role&&p.alive)inputs[p.id]=raiderInput(s,p,me,dt);
 // Relic Run stays under player control when idle; automatic takeover belongs to classic squads.
 me.lastAction=s.time;step(s,dt,inputs);
 if(!me.alive){s.ended=true;s.winner=1;s.endTime=s.time;return;}
 for(const b of a.blasts)if(s.time>=b.at){
  const source=s.players.find(p=>p.id===b.from);
  for(const p of s.players)if(p.alive&&p.team!==b.team&&dist(p,b)<b.radius&&lineOfSight(b,p))applyDamage(s,p,(b.team===0?155:50)*clamp(1-dist(p,b)/(b.radius*1.6),.35,1),source,4);
  emit(s,{kind:'blast',...b,amount:b.radius,from:b.from,team:b.team});
 }
 a.blasts=a.blasts.filter(b=>s.time<b.at);
 for(const p of s.players)if(p.role&&!p.alive&&!a.rewarded.includes(p.id)){
  a.rewarded.push(p.id);a.combo=s.time<a.comboUntil?a.combo+1:1;a.comboUntil=s.time+5;a.bestCombo=Math.max(a.bestCombo,a.combo);
  me.reserve=Math.min(240,me.reserve+14);me.hp=Math.min(100,me.hp+4);if(a.rewarded.length%4===0)a.grenades=Math.min(5,a.grenades+1);
  if(a.rewarded.length%3===0)s.loot.push({x:p.x,y:p.y,id:s.lid++,kind:'armor',tier:0,weapon:0});
 }
 if(s.time>=a.nextWave){
  a.wave++;a.nextWave=s.time+(a.stage===3?10:16);
  const alive=s.players.filter(p=>p.role&&p.alive).length;
  for(let n=0;n<Math.min(Math.max(0,10-alive),a.stage===0?3:a.stage===3?4:3);n++)spawn(s,a.wave%3===0&&n===0?'elite':n%2?'scout':'raider',me);
  emit(s,{kind:'objective',x:me.x,y:me.y,from:'director',label:`RAIDER WAVE ${a.wave} · KEEP MOVING`});
 }
 const site=a.sites[a.stage];
 if(a.stage===0||a.stage===1||a.stage===3){
  const contested=s.players.some(p=>p.role&&p.alive&&dist(p,site)<100);
  if(dist(me,site)<76&&!contested&&s.time-me.lastHit>.45)a.charge=Math.min(1,a.charge+dt/OBJECTIVES[a.stage].seconds);
  // Keep earned progress when forced out; returning should feel worthwhile.
  if(a.charge>=1){
   a.stage++;a.charge=0;me.hp=Math.min(100,me.hp+35);me.armor=Math.min(80,me.armor+40);me.maxArmor=Math.max(me.maxArmor,me.armor);me.reserve=240;me.heals=Math.min(6,me.heals+1);a.grenades=Math.min(5,a.grenades+2);
   for(const slot of me.loadout)slot.mag=WEAPONS[slot.kind].mag;me.reloading=0;
   emit(s,{kind:'objective',...site,from:me.id,label:a.stage===4?'EXTRACTION COMPLETE':a.stage===2?'THE ASH WARDEN HAS AWAKENED':'RELIC SECURED · SUPPLIES RESTORED'});
   if(a.stage===2){spawn(s,'warden',a.sites[2]);a.nextPulse=s.time+3;}
   if(a.stage===4){s.ended=true;s.winner=0;s.endTime=s.time;me.placement=1;}
  }
 }else if(a.stage===2){
  const boss=s.players.find(p=>p.id===a.bossId);
  if(boss&&!boss.alive){a.stage=3;a.charge=0;a.nextWave=s.time+1;me.hp=Math.min(100,me.hp+40);emit(s,{kind:'objective',x:me.x,y:me.y,from:me.id,label:'WARDEN DOWN · REACH EXTRACTION'});}
  else if(boss&&s.time>=a.nextPulse){
   a.nextPulse=s.time+(boss.hp<450?3.2:4.7);
   const target={x:me.x,y:me.y};a.blasts.push({...target,id:++s.eid,from:boss.id,team:1,radius:100,at:s.time+1.2,born:s.time,start:{x:boss.x,y:boss.y}});
   if(boss.hp<450){const flank={x:me.x+Math.cos(me.angle)*150,y:me.y+Math.sin(me.angle)*150};a.blasts.push({...flank,id:++s.eid,from:boss.id,team:1,radius:85,at:s.time+1.5,born:s.time,start:{x:boss.x,y:boss.y}});}
  }
 }
 if(s.time>=a.limit&&!s.ended){s.ended=true;s.winner=1;s.endTime=s.time;emit(s,{kind:'objective',x:me.x,y:me.y,from:'storm',label:'THE EXPEDITION WINDOW CLOSED'});}
 // Bound actor count and result bookkeeping during an idle six-minute run.
 s.players=s.players.filter(p=>!p.role||p.alive||s.time-p.deathTime<6);a.rewarded=a.rewarded.slice(-100);
}
