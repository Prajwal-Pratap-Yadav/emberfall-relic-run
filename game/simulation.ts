import {WORLD,CENTER,RADIUS,PLAYER_RADIUS,SPEED,CAPACITY,FLIGHT,WEAPONS,ZONES,SOLIDS,PLACES,BOT_NAMES} from "./data.ts";
export type Vec={x:number;y:number};
export type Input={seq:number;mx:number;my:number;aim:number;fire:boolean;actionSeq?:number;jump?:boolean;reload?:boolean;heal?:boolean;interact?:boolean;revive?:boolean;swap?:boolean;dash?:boolean;grenade?:boolean;ping?:number;px?:number;py?:number;lag?:number};
export type Slot={kind:number;tier:number;mag:number};
export type Player=Vec&{id:string;name:string;team:number;bot:boolean;taken:boolean;hp:number;armor:number;maxArmor:number;alive:boolean;knocked:boolean;bleed:number;revive:number;reviveLast?:number;angle:number;phase:"plane"|"glide"|"ground";alt:number;jumpAt:number;loadout:Slot[];slot:number;reserve:number;heals:number;healing:number;reloading:number;cooldown:number;invuln:number;defeats:number;damage:number;revives:number;survived:number;seq:number;lastAction:number;seen:number;think:number;target:string;goal:Vec;personality:number;spread:number;lastHit:number;lastAttacker:string;lastWeapon:number;deathTime:number;placement:number;lag:number;role?:"scout"|"raider"|"elite"|"warden";maxHp?:number;};
export type Loot=Vec&{id:number;kind:"weapon"|"armor"|"heal"|"ammo";weapon:number;tier:number;mag?:number;air?:boolean};
export type GameEvent=Vec&{id:number;kind:"shot"|"hit"|"defeat"|"knock"|"revive"|"ping"|"drop"|"zone"|"dash"|"blast"|"objective";from:string;to?:string;amount?:number;angle?:number;weapon?:number;team?:number;label?:string;time:number;};
export type Adventure={stage:number;charge:number;sites:(Vec&{name:string})[];wave:number;nextWave:number;spawnId:number;dashReady:number;grenades:number;grenadeReady:number;abilitySeq:number;nextPulse:number;bossId:string;rewarded:string[];combo:number;comboUntil:number;bestCombo:number;limit:number;blasts:(Vec&{id:number;from:string;team:number;radius:number;at:number;born:number;start:Vec})[];};
export type Zone={x:number;y:number;r:number;nextX:number;nextY:number;nextR:number;stage:number;closing:boolean;left:number;damage:number};
export type State={seed:number;rng:number;time:number;mode:number;players:Player[];loot:Loot[];events:GameEvent[];eid:number;lid:number;zone:Zone;centers:Vec[];winner:number|null;ended:boolean;endTime:number;nextDrop:number;difficulty:number;training:boolean;partyTeams:Record<string,number>;history:{t:number;positions:Record<string,Vec>}[];adventure?:Adventure;};
export const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angleDiff=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function random(s:State){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return(s.rng>>>0)/4294967296;}
export const emptyInput=():Input=>({seq:0,mx:0,my:0,aim:0,fire:false});
/** Deliberately constrained input protocol: no position, health, ammo or damage enters authority. */
export function sanitize(raw:unknown):Input|null{
 if(!raw||typeof raw!=="object")return null;const r=raw as Record<string,unknown>;
 if(!Number.isSafeInteger(r.seq)||Number(r.seq)<0||Number(r.seq)>1e12)return null;
 if(![r.mx,r.my,r.aim].every(v=>typeof v==="number"&&Number.isFinite(v)))return null;
 const i:Input={seq:Number(r.seq),mx:clamp(Number(r.mx),-1,1),my:clamp(Number(r.my),-1,1),aim:((Number(r.aim)%(Math.PI*2))+Math.PI*2)%(Math.PI*2),fire:r.fire===true};
 for(const k of ["jump","reload","heal","interact","revive","swap","dash","grenade"] as const)i[k]=r[k]===true;
 if(Number.isSafeInteger(r.actionSeq)&&Number(r.actionSeq)>=0)i.actionSeq=Number(r.actionSeq);
 if(Number.isInteger(r.ping)&&Number(r.ping)>=0&&Number(r.ping)<4){i.ping=Number(r.ping);i.px=clamp(Number(r.px)||0,0,WORLD);i.py=clamp(Number(r.py)||0,0,WORLD)}
 return i;
}
export function cleanName(value:unknown){
 const name=String(value??"").normalize("NFKC").replace(/[^a-zA-Z0-9 _-]/g,"").replace(/\s+/g," ").trim().slice(0,16);
 const collapsed=name.toLowerCase().replace(/[ _-]/g,"").replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e").replace(/4/g,"a").replace(/5/g,"s");
 return !name||/(fuck|shit|nigg|nazi|hitler|fagg|cunt|rape|porn|admin|moderator)/.test(collapsed)?"Pathfinder":name;
}
// Geometry is immutable. Pre-index expanded bounds so prediction and authority query the same small set.
const collisionGrid=new Map<string,typeof SOLIDS>();
for(const b of SOLIDS)for(let x=Math.floor((b.x-24)/128);x<=Math.floor((b.x+b.w+24)/128);x++)for(let y=Math.floor((b.y-24)/128);y<=Math.floor((b.y+b.h+24)/128);y++){
 const key=x+','+y;const cells=collisionGrid.get(key)??[];cells.push(b);collisionGrid.set(key,cells);
}
export function blocked(x:number,y:number,r=PLAYER_RADIUS){
 if((x-CENTER)**2+(y-CENTER)**2>(RADIUS-r)**2)return true;
 const candidates=r<=24?(collisionGrid.get(Math.floor(x/128)+','+Math.floor(y/128))??[]):SOLIDS;
 return candidates.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
}
/** Axis-separated circle / rectangle collision, shared verbatim by local prediction. */
export function move(p:Vec,mx:number,my:number,dt:number,speed=SPEED){
 const n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n}
 const x=clamp(p.x+mx*speed*dt,60,WORLD-60),y=clamp(p.y+my*speed*dt,60,WORLD-60);
 if(!blocked(x,p.y))p.x=x;if(!blocked(p.x,y))p.y=y;
}
/** Slab intersection gives the first wall along a ray, never tunnelling through thin cover. */
export function rayRect(x:number,y:number,dx:number,dy:number,b:{x:number;y:number;w:number;h:number}){
 let lo=0,hi=Infinity;
 for(const [p,d,min,max] of [[x,dx,b.x,b.x+b.w],[y,dy,b.y,b.y+b.h]]){
  if(Math.abs(d)<1e-9){if(p<min||p>max)return Infinity;continue}
  let a=(min-p)/d,c=(max-p)/d;if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return Infinity;
 }return lo;
}
export function wallDistance(x:number,y:number,angle:number,range:number){let best=range;const dx=Math.cos(angle),dy=Math.sin(angle);for(const b of SOLIDS){if(b.x>x+range||b.x+b.w<x-range||b.y>y+range||b.y+b.h<y-range)continue;best=Math.min(best,rayRect(x,y,dx,dy,b))}return best;}
export function lineOfSight(a:Vec,b:Vec){const d=dist(a,b);return wallDistance(a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x),d)>=d-1;}
function safePoint(s:State,around?:Vec,radius=150):Vec{
 for(let n=0;n<120;n++){const a=random(s)*Math.PI*2,r=Math.sqrt(random(s))*(around?radius:RADIUS*.85),x=(around?.x??CENTER)+Math.cos(a)*r,y=(around?.y??CENTER)+Math.sin(a)*r;if(!blocked(x,y,20))return{x,y}}
 return{x:CENTER,y:CENTER+150};
}
function player(s:State,i:number):Player{
 const pos=safePoint(s);return{...pos,id:`b${i}`,name:BOT_NAMES[i%BOT_NAMES.length]+" "+(Math.floor(i/BOT_NAMES.length)+1),team:Math.floor(i/s.mode),bot:true,taken:false,hp:100,armor:0,maxArmor:0,alive:true,knocked:false,bleed:0,revive:0,angle:0,phase:"plane",alt:1,jumpAt:1+random(s)*9,loadout:[],slot:0,reserve:100,heals:2,healing:0,reloading:0,cooldown:0,invuln:0,defeats:0,damage:0,revives:0,survived:0,seq:0,lastAction:0,seen:0,think:0,target:"",goal:pos,personality:i%4,spread:0,lastHit:-10,lastAttacker:"",lastWeapon:0,deathTime:0,placement:0,lag:0};
}
export function createState(seed=1,mode=1,count=CAPACITY,difficulty=0,training=false):State{
 const s:State={seed,rng:seed||1,time:0,mode,players:[],loot:[],events:[],eid:0,lid:0,zone:{x:CENTER,y:CENTER,r:RADIUS+10,nextX:CENTER,nextY:CENTER,nextR:ZONES[0].r,stage:0,closing:false,left:55,damage:1},centers:[{x:CENTER,y:CENTER}],winner:null,ended:false,endTime:0,nextDrop:125,difficulty:clamp(difficulty,0,1),training,partyTeams:{},history:[]};
 for(let i=0;i<6;i++){const prev=s.centers[i],margin=(i===0?RADIUS+10:ZONES[i-1].r)-ZONES[i].r,a=random(s)*6.28,r=random(s)*margin*.52;s.centers.push({x:prev.x+Math.cos(a)*r,y:prev.y+Math.sin(a)*r})}
 for(let i=0;i<count;i++)s.players.push(player(s,i));
 for(let i=0;i<175;i++){const place=PLACES[i%PLACES.length];const p=safePoint(s,i<125?place:undefined,210);const roll=random(s);s.loot.push({...p,id:s.lid++,kind:roll<.52?"weapon":roll<.69?"armor":roll<.84?"heal":"ammo",weapon:Math.floor(random(s)*6),tier:roll<.08?3:roll<.25?2:roll<.53?1:0})}
 return s;
}
export function addHuman(s:State,id:string,name:string,party:string,parties:Record<string,number>={}){
 s.partyTeams??={};let existing=s.players.find(p=>p.id===id);if(existing){s.partyTeams[party]??=existing.team;return existing}
 let team=s.partyTeams[party]??parties[party];let candidate:Player|undefined;
 if(team!==undefined)candidate=s.players.find(p=>p.team===team&&p.bot&&!p.taken&&p.alive);
 if(!candidate){candidate=s.players.find(p=>p.bot&&!p.taken&&p.alive&&(!s.players.some(q=>q.team===p.team&&!q.bot)));if(!candidate)return null;team=candidate.team;parties[party]=team;s.partyTeams[party]=team}
 candidate.id=id;candidate.name=cleanName(name);candidate.bot=false;candidate.taken=true;candidate.lastAction=s.time;
 if(s.time>FLIGHT+4){const ally=s.players.find(p=>p.team===candidate!.team&&p.alive&&!p.knocked&&p.id!==id);const point=safePoint(s,ally??{x:s.zone.x,y:s.zone.y},70);Object.assign(candidate,point,{hp:100,armor:30,maxArmor:30,phase:"ground",alt:0,invuln:4});if(!candidate.loadout.length)candidate.loadout=[{kind:0,tier:0,mag:14}]}
 return candidate;
}
export function emit(s:State,event:Omit<GameEvent,"id"|"time">){s.events.push({...event,id:++s.eid,time:s.time});}
export function zoneAt(s:State,time=s.time):Zone{
 if(s.adventure)return{x:CENTER,y:CENTER,r:1100,nextX:CENTER,nextY:CENTER,nextR:1100,stage:Math.min(5,s.adventure.stage+1),closing:false,left:s.adventure.limit-time,damage:8};
 if(s.training)return{x:CENTER,y:CENTER,r:RADIUS+10,nextX:CENTER,nextY:CENTER,nextR:RADIUS+10,stage:0,closing:false,left:60-time,damage:0};
 let t=Math.max(0,time-FLIGHT),prevR=RADIUS+10;
 for(let i=0;i<ZONES.length;i++){const z=ZONES[i],start=s.centers[i],end=s.centers[i+1];if(t<z.hold+z.shrink){const f=clamp((t-z.hold)/z.shrink,0,1);return{x:start.x+(end.x-start.x)*f,y:start.y+(end.y-start.y)*f,r:prevR+(z.r-prevR)*f,nextX:end.x,nextY:end.y,nextR:z.r,stage:i,closing:t>=z.hold,left:t<z.hold?z.hold-t:z.hold+z.shrink-t,damage:z.damage}}t-=z.hold+z.shrink;prevR=z.r}
 const end=s.centers[6];return{x:end.x,y:end.y,r:0,nextX:end.x,nextY:end.y,nextR:0,stage:5,closing:true,left:0,damage:30};
}
export function eliminate(s:State,p:Player,attacker?:Player){
 if(!p.alive)return;p.alive=false;p.knocked=false;p.hp=0;p.deathTime=s.time;
 const teams=new Set(s.players.filter(q=>q.alive).map(q=>q.team));p.placement=teams.size+(!teams.has(p.team)?1:0);
 if(attacker&&attacker.team!==p.team)attacker.defeats++;
 emit(s,{kind:"defeat",x:p.x,y:p.y,from:attacker?.id??"storm",to:p.id,weapon:p.lastWeapon,label:`${attacker?.name??"The storm"} defeated ${p.name}`});
 for(const slot of p.loadout)s.loot.push({x:p.x+(random(s)-.5)*25,y:p.y+(random(s)-.5)*25,id:s.lid++,kind:"weapon",weapon:slot.kind,tier:slot.tier,mag:slot.mag});
 if(p.heals)s.loot.push({x:p.x+18,y:p.y,id:s.lid++,kind:"heal",weapon:0,tier:0});
}
export function applyDamage(s:State,p:Player,amount:number,attacker?:Player,weapon=0,zone=false){
 if(!p.alive||p.invuln>0||!Number.isFinite(amount)||amount<=0||attacker?.team===p.team)return 0;
 const absorbed=zone?0:Math.min(p.armor,amount*.6);p.armor-=absorbed;const dealt=amount-absorbed;p.hp-=dealt;p.lastHit=s.time;p.healing=0;p.revive=0;p.lastAttacker=attacker?.id??"storm";p.lastWeapon=weapon;
 if(attacker)attacker.damage+=dealt;
 if(!zone)emit(s,{kind:"hit",x:p.x,y:p.y,from:attacker?.id??"",to:p.id,amount:Math.round(dealt),weapon,angle:attacker?Math.atan2(attacker.y-p.y,attacker.x-p.x):0});
 if(p.hp<=0){if(!p.knocked&&s.mode>1&&s.players.some(q=>q.id!==p.id&&q.team===p.team&&q.alive&&!q.knocked)){p.knocked=true;p.hp=40;p.bleed=28;p.revive=0;emit(s,{kind:"knock",x:p.x,y:p.y,from:attacker?.id??"storm",to:p.id,label:`${p.name} needs a revive`})}else eliminate(s,p,attacker)}
 return dealt;
}
export function shoot(s:State,p:Player,aim:number,lag=0){
 const slot=p.loadout[p.slot];if(!slot||slot.mag<=0||p.cooldown>0||p.reloading>0||p.healing>0||p.knocked||p.phase!=="ground")return false;
 const w=WEAPONS[slot.kind];slot.mag--;p.cooldown=p.role?Math.max(w.interval,{scout:.25,raider:.6,elite:1.2,warden:.4}[p.role]):w.interval;p.spread=Math.min(.2,p.spread+w.recoil);p.invuln=0;
 const end=wallDistance(p.x,p.y,aim,w.range);
 emit(s,{kind:"shot",x:p.x,y:p.y,from:p.id,angle:aim,amount:end,weapon:slot.kind});
 const historical=lag>0?s.history.reduce<typeof s.history[number]|undefined>((best,h)=>Math.abs(h.t-(s.time-lag))<Math.abs((best?.t??-999)-(s.time-lag))?h:best,undefined):undefined;
 for(let pellet=0;pellet<w.pellets;pellet++){
  const a=aim+(random(s)-.5)*2*(w.spread+p.spread*.4),dx=Math.cos(a),dy=Math.sin(a),max=wallDistance(p.x,p.y,a,w.range);
  let hit:Player|undefined,best=max;
  for(const q of s.players){if(!q.alive||q.team===p.team||q.phase!=="ground"||dist(p,q)>w.range+40)continue;const pos=historical?.positions[q.id]??q;const vx=pos.x-p.x,vy=pos.y-p.y,along=vx*dx+vy*dy,side=Math.abs(vx*dy-vy*dx);if(along>0&&along<best&&side<PLAYER_RADIUS+2){const entry=along-Math.sqrt((PLAYER_RADIUS+2)**2-side**2);if(entry<best){best=entry;hit=q}}}
  if(hit){const falloff=slot.kind===4?clamp(1-best/600,.4,1):clamp(1-best/(w.range*3),.66,1);applyDamage(s,hit,w.damage*(1+slot.tier*.12)*falloff*(p.role ? .6 : 1),p,slot.kind)}
 }
 return true;
}
export function pickup(s:State,p:Player,explicit=false){
 let best:Loot|undefined,d=45;
 for(const l of s.loot){const n=dist(p,l);if(n<d&&(l.kind!=="weapon"||explicit||!p.loadout.length)){best=l;d=n}}
 if(!best)return false;
 if(best.kind==="weapon"){
  const slot={kind:best.weapon,tier:best.tier,mag:best.mag??WEAPONS[best.weapon].mag};
  if(p.loadout.length<2){p.loadout.push(slot);p.slot=p.loadout.length-1}else{const old=p.loadout[p.slot];if(old.kind===slot.kind&&old.tier>=slot.tier)return false;p.loadout[p.slot]=slot;s.loot.push({x:p.x+38,y:p.y,id:s.lid++,kind:"weapon",weapon:old.kind,tier:old.tier,mag:old.mag})}p.reloading=0;
 }else if(best.kind==="armor"){const v=40+best.tier*20;if(v<=p.armor)return false;p.maxArmor=v;p.armor=v}
 else if(best.kind==="heal"){if(p.heals>=6)return false;p.heals++}else{if(p.reserve>=240)return false;p.reserve=Math.min(240,p.reserve+50)}
 s.loot=s.loot.filter(l=>l.id!==best!.id);return true;
}
export function revive(s:State,p:Player,dt:number){
 if(p.knocked||!p.alive)return false;
 const ally=s.players.find(q=>q.team===p.team&&q.alive&&q.knocked&&dist(p,q)<62&&lineOfSight(p,q));if(!ally)return false;
 ally.revive+=dt;ally.reviveLast=s.time;ally.bleed+=dt; // Bleed pauses while a teammate channels.
 if(ally.revive>=4){ally.knocked=false;ally.hp=45;ally.bleed=0;ally.revive=0;ally.invuln=1;p.revives++;emit(s,{kind:"revive",x:ally.x,y:ally.y,from:p.id,to:ally.id,label:`${p.name} revived ${ally.name}`})}return true;
}
function botInput(s:State,p:Player,dt:number):Input{
 const i=emptyInput();i.seq=p.seq+1;i.aim=p.angle;
 if(s.training)return i;
 if(p.phase==="plane"){i.jump=s.time>=p.jumpAt;return i}
 if(p.phase==="glide"){const dx=p.goal.x-p.x,dy=p.goal.y-p.y,d=Math.hypot(dx,dy)||1;i.mx=dx/d;i.my=dy/d;return i}
 if(p.knocked){const ally=s.players.find(q=>q.team===p.team&&q.alive&&!q.knocked);if(ally){const d=dist(p,ally)||1;i.mx=(ally.x-p.x)/d;i.my=(ally.y-p.y)/d}return i}
 p.think-=dt;
 if(p.think<=0){p.think=.25+random(s)*.18;p.target="";let nearest=360+(s.difficulty*100);
  for(const q of s.players){if(!q.alive||q.team===p.team||q.phase!=="ground"||q.invuln>0)continue;const d=dist(p,q);if(d<nearest&&lineOfSight(p,q)){p.target=q.id;nearest=d}}
  if(p.target&&p.seen===0)p.seen=s.time+.35+random(s)*(.55-s.difficulty*.3);if(!p.target)p.seen=0;
 }
 const enemy=s.players.find(q=>q.id===p.target&&q.alive);
 const ally=s.players.find(q=>q.team===p.team&&q.alive&&q.knocked&&dist(p,q)<380);
 let goal=p.goal;
 const outside=dist(p,s.zone)>s.zone.r-90;
 if(outside)goal={x:s.zone.nextX,y:s.zone.nextY};
 else if(ally&&!enemy){goal=ally;if(dist(p,ally)<55){i.revive=true;return i}}
 else if(enemy){
  const d=dist(p,enemy),w=WEAPONS[p.loadout[p.slot]?.kind??0];const desired=Math.atan2(enemy.y-p.y,enemy.x-p.x)+(Math.sin(s.time*2.7+p.personality*3)*(.24-s.difficulty*.14));i.aim=p.angle+clamp(angleDiff(desired,p.angle),-dt*(1.8+s.difficulty*2),dt*(1.8+s.difficulty*2));
  i.fire=s.time>p.seen&&d<w.range&&lineOfSight(p,enemy)&&p.loadout.length>0&&Math.sin(s.time*(1.2+s.difficulty*.5)+p.personality*3)>(.90-s.difficulty*.52);
  if(d<160&&p.personality!==2)goal={x:p.x-(enemy.x-p.x),y:p.y-(enemy.y-p.y)};else if(d>270)goal=enemy;else goal={x:p.x+Math.cos(i.aim+Math.PI/2)*60,y:p.y+Math.sin(i.aim+Math.PI/2)*60};
 }else{
  if(!p.loadout.length||random(s)<.04){let near=300;for(const l of s.loot){if((!p.loadout.length&&l.kind!=="weapon")||(p.loadout.length&&l.kind!=="armor"))continue;const d=dist(p,l);if(d<near){near=d;goal=l}}}
  if(dist(p,goal)<45||s.time%10<dt){goal=safePoint(s,{x:s.zone.nextX,y:s.zone.nextY},Math.max(30,s.zone.r*.7));p.goal=goal}
 }
 let dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy)||1;i.mx=dx/d;i.my=dy/d;
 if(blocked(p.x+i.mx*35,p.y+i.my*35)){const a=Math.atan2(dy,dx)+(p.personality%2?1:-1)*1.25;i.mx=Math.cos(a);i.my=Math.sin(a);if(blocked(p.x+i.mx*35,p.y+i.my*35)){i.mx=-Math.cos(a);i.my=-Math.sin(a)}}
 if(!enemy)i.aim=Math.atan2(i.my,i.mx);
 i.interact=p.loadout.length<2||s.loot.some(l=>l.kind==="weapon"&&dist(p,l)<45&&(l.tier>(p.loadout[p.slot]?.tier??-1)||(p.loadout[p.slot]?.mag===0&&(l.mag??WEAPONS[l.weapon].mag)>0)));if(p.loadout.length&&p.loadout[p.slot].mag===0)i.reload=true;if(p.hp<55&&p.heals>0&&!enemy)i.heal=true;
 return i;
}
function land(s:State,p:Player){
 p.phase="ground";p.alt=0;const point=blocked(p.x,p.y)?safePoint(s,p,70):p; p.x=point.x;p.y=point.y;p.invuln=3;
 if(p.bot){const kind=Math.floor(random(s)*3);p.loadout=[{kind,tier:random(s)<.15?1:0,mag:WEAPONS[kind].mag}];p.armor=30;p.maxArmor=30}
 else{s.loot.push({id:s.lid++,x:p.x+18,y:p.y+10,kind:"weapon",weapon:2,tier:0},{id:s.lid++,x:p.x-25,y:p.y+15,kind:"armor",weapon:0,tier:0},{id:s.lid++,x:p.x+5,y:p.y-28,kind:"heal",weapon:0,tier:0})}
}
export function step(s:State,dt:number,intents:Record<string,Input>={}){
 if(s.ended)return;s.time+=dt;s.events=s.events.filter(e=>s.time-e.time<5).slice(-256);
 const previousStage=s.zone.stage,previousClosing=s.zone.closing;s.zone=zoneAt(s);
 if(s.zone.stage!==previousStage||s.zone.closing!==previousClosing)emit(s,{kind:"zone",x:s.zone.x,y:s.zone.y,from:"storm",label:s.zone.closing?"The storm is moving":"New safe zone marked"});
 if(s.time>=s.nextDrop&&!s.training&&!s.adventure){const p=safePoint(s,{x:s.zone.nextX,y:s.zone.nextY},Math.max(20,s.zone.nextR*.6));s.loot.push({...p,id:s.lid++,kind:"weapon",weapon:3+Math.floor(random(s)*3),tier:3,air:true},{x:p.x+30,y:p.y,id:s.lid++,kind:"armor",weapon:0,tier:3,air:true});emit(s,{kind:"drop",...p,from:"supply",label:"Relic supply has landed"});s.nextDrop+=130}
 for(const p of s.players){
  if(!p.alive)continue;p.survived=s.time;
  const provided=intents[p.id];const takeover=!p.bot&&s.time-p.lastAction>2;p.taken=takeover;
  const i=s.adventure&&provided?provided:(p.bot||takeover)?botInput(s,p,dt):(provided??emptyInput());
  if(provided&&!p.bot)p.lastAction=s.time;
  p.lag=clamp(i.lag??0,0,.15);p.angle=Number.isFinite(i.aim)?i.aim:p.angle;p.cooldown=Math.max(0,p.cooldown-dt);p.invuln=Math.max(0,p.invuln-dt);p.spread=Math.max(0,p.spread-dt*.12);
  const actionId=i.actionSeq??i.seq;
  const newAction=actionId>((p as Player&{actionSeq?:number}).actionSeq??0);
  (p as Player&{actionSeq?:number}).actionSeq=Math.max((p as Player&{actionSeq?:number}).actionSeq??0,actionId);p.seq=Math.max(p.seq,i.seq);
  if(p.phase==="plane"){
   const f=clamp(s.time/FLIGHT,0,1);p.x=WORLD*(.09+f*.82);p.y=WORLD*(.18+f*.64);
   if(i.jump||s.time>=FLIGHT){p.phase="glide";p.alt=1;p.goal=safePoint(s,p,250)}continue;
  }
  if(p.phase==="glide"){p.alt=Math.max(0,p.alt-dt/4);move(p,i.mx,i.my,dt,SPEED*1.6);if(p.alt<=0)land(s,p);continue}
  if(p.knocked){p.bleed-=dt;if(p.bleed<=0){eliminate(s,p,s.players.find(q=>q.id===p.lastAttacker));continue}}
  if(s.training&&s.time>60){s.ended=true;s.winner=s.players[0]?.team??0;s.endTime=s.time;break}
  if(!p.knocked&&p.reloading>0){p.reloading=Math.max(0,p.reloading-dt);if(p.reloading===0){const slot=p.loadout[p.slot];if(slot){const refill=Math.min(WEAPONS[slot.kind].mag-slot.mag,p.reserve);slot.mag+=refill;p.reserve-=refill}}}
  if(!p.knocked&&p.healing>0){p.healing=Math.max(0,p.healing-dt);if(p.healing===0){p.hp=Math.min(100,p.hp+50);p.heals--}}
  const slot=p.loadout[p.slot];const speed=p.knocked?44:(p.role?({scout:132,raider:105,elite:88,warden:60}[p.role]):SPEED*(s.adventure?1.18:1))*(slot?WEAPONS[slot.kind].move:1)*(p.healing>0?.72:1);
  if(!i.revive)move(p,i.mx,i.my,dt,speed);
  if(!p.knocked){
   const reviving=i.revive?revive(s,p,dt):false;
   if(i.reload&&newAction&&slot&&p.reloading===0&&slot.mag<WEAPONS[slot.kind].mag&&p.reserve>0)p.reloading=WEAPONS[slot.kind].reload;
   if(i.heal&&newAction&&p.hp<100&&p.heals>0&&p.healing===0&&p.reloading===0)p.healing=3;
   if(i.swap&&newAction&&p.loadout.length>1){p.slot=1-p.slot;p.reloading=0}
   if(i.ping!==undefined&&newAction&&s.time-p.lastHit>.0)emit(s,{kind:"ping",x:i.px??p.x,y:i.py??p.y,from:p.id,team:p.team,amount:i.ping,label:["Loot here","Enemy spotted","Going here","Need help"][i.ping]});
   pickup(s,p,!!i.interact&&newAction);
   if(i.fire&&!reviving)shoot(s,p,p.angle,p.lag);
  }
  if(dist(p,s.zone)>s.zone.r)applyDamage(s,p,s.zone.damage*dt,undefined,0,true);
 }
 for(const p of s.players)if(p.knocked&&s.time-(p.reviveLast??-10)>dt*1.5)p.revive=0;
 // No squad may stay alive only because all of its members are knocked.
 for(const p of s.players)if(p.alive&&p.knocked&&!s.players.some(q=>q.team===p.team&&q.alive&&!q.knocked))eliminate(s,p,s.players.find(q=>q.id===p.lastAttacker));
 if(!s.training&&!s.adventure&&s.time>FLIGHT+5){const alive=s.players.filter(p=>p.alive),teams=[...new Set(alive.map(p=>p.team))];if(teams.length<=1){s.ended=true;s.winner=teams[0]??[...s.players].sort((a,b)=>b.deathTime-a.deathTime||b.defeats-a.defeats||a.id.localeCompare(b.id))[0]?.team??0;s.endTime=s.time;for(const p of alive)p.placement=1}}
 // A zero-radius storm has a deterministic tie-break, never a forever room or a draw.
 if(!s.training&&!s.adventure&&s.time>570&&!s.ended){const sorted=s.players.filter(p=>p.alive).sort((a,b)=>(b.hp+b.armor)-(a.hp+a.armor)||a.id.localeCompare(b.id));const winner=sorted[0]?.team??0;for(const p of sorted)if(p.team!==winner)eliminate(s,p);s.ended=true;s.winner=winner;s.endTime=s.time}
 if(Math.floor(s.time*20)%2===0){const positions:Record<string,Vec>={};for(const p of s.players)if(p.alive)positions[p.id]={x:p.x,y:p.y};s.history.push({t:s.time,positions});s.history=s.history.filter(h=>s.time-h.t<=.2)}
 s.loot=s.loot.slice(-350);
}
export function snapshot(s:State,id:string,ack=0){
 const me=s.players.find(p=>p.id===id)??s.players[0];const spectate=!me?.alive?s.players.find(p=>p.team===me?.team&&p.alive)??s.players.find(p=>p.alive):me;
 const center=spectate??me??{x:CENTER,y:CENTER};
 return{time:s.time,seed:s.seed,mode:s.mode,zone:s.zone,ended:s.ended,winner:s.winner,endTime:s.endTime,training:s.training,adventure:s.adventure?{...s.adventure,rewarded:undefined,boss:s.players.find(p=>p.id===s.adventure?.bossId)?{hp:s.players.find(p=>p.id===s.adventure?.bossId)!.hp,maxHp:900,alive:s.players.find(p=>p.id===s.adventure?.bossId)!.alive}:undefined}:undefined,ack,me:me?.id,spectating:spectate?.id,
  players:s.players.filter(p=>p.id===id||p.team===me?.team||(p.alive&&dist(p,center)<900&&(p.phase!=="ground"||lineOfSight(center,p)))).map(p=>({...p,goal:undefined,target:undefined,think:undefined,seen:undefined,jumpAt:undefined})),
  loot:s.loot.filter(l=>dist(l,center)<800),events:s.events.filter(e=>e.team===me?.team||(e.kind==="defeat"||e.kind==="zone"||e.kind==="drop")||dist(e,center)<1000),
  alive:s.players.filter(p=>p.alive).length,teams:new Set(s.players.filter(p=>p.alive).map(p=>p.team)).size,humans:s.players.filter(p=>!p.bot).length,bots:s.players.filter(p=>p.bot).length,
  team:s.players.filter(p=>p.team===me?.team).map(p=>({id:p.id,name:p.name,bot:p.bot,alive:p.alive,hp:p.hp,knocked:p.knocked,taken:p.taken})),};
}
export type Snapshot=ReturnType<typeof snapshot>;
