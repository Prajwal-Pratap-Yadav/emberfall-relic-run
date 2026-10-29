import {cleanName} from "../game/simulation.ts";
import {MAX_HUMANS} from "../game/data.ts";
type Profile={id:string;secret:string;name:string;xp:number;matches:number;wins:number;defeats:number;revives:number;daily:string;updated:number};
type Room={id:string;mode:number;state:string;version:number;updated:number;owner:string;lease:number;open_until:number;expires:number};
const json=(v:unknown,status=200,headers:Record<string,string>={})=>Response.json(v,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
const publicProfile=(p:Profile)=>({id:p.id,name:p.name,xp:p.xp,matches:p.matches,wins:p.wins,defeats:p.defeats,revives:p.revives,daily:JSON.parse(p.daily||"{}")});
async function body(request:Request){const bytes=await request.text();if(bytes.length>180000)throw Error("Payload too large");try{return JSON.parse(bytes)}catch{return {}}}
function guest(request:Request){const header=request.headers.get("X-Guest-Token");return header&&/^[a-f0-9-]{36}$/.test(header)?header:/(?:^|;\s*)ef_guest=([a-f0-9-]{36})/.exec(request.headers.get("Cookie")??"")?.[1]??""}
async function member(db:D1Database,room:string,id:string){return !!await db.prepare("SELECT 1 FROM inputs WHERE room=? AND player=?").bind(room,id).first()}
export async function handleApi(request:Request,db:D1Database,url:URL):Promise<Response>{
 const now=Date.now(),path=url.pathname;
 if(request.method!=="GET"&&request.method!=="POST")return json({error:"Method not allowed"},405);
 if(request.method==="POST"&&request.headers.get("Origin")&&request.headers.get("Origin")!==url.origin)return json({error:"Origin rejected"},403);
 if(path==="/api/health")return json({ok:true,transport:"peer-hosted-webrtc",tick:20,snapshots:10,combatants:64,maxHumans:MAX_HUMANS});
 const token=guest(request);let profile=token?await db.prepare("SELECT * FROM profiles WHERE secret=?").bind(token).first<Profile>():null;
 if(path==="/api/session"&&request.method==="POST"){
  const b=await body(request);const name=cleanName(b.name);if(b.fresh===true)profile=null;
  if(!profile){
   const count=await db.prepare("INSERT INTO limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind("guest:"+Math.floor(now/60000)).first<{count:number}>();
   if((count?.count??0)>150)return json({error:"The relay is full. Try training while it clears."},429);
   const id=crypto.randomUUID(),secret=crypto.randomUUID();
   await db.prepare("INSERT INTO profiles (id,secret,name,updated) VALUES (?,?,?,?)").bind(id,secret,name,now).run();
   profile={id,secret,name,xp:0,matches:0,wins:0,defeats:0,revives:0,daily:"{}",updated:now};
  }else if(b.name){profile.name=name;await db.prepare("UPDATE profiles SET name=? WHERE id=?").bind(name,profile.id).run()}
  return json({profile:publicProfile(profile),token:profile.secret},200,b.fresh?{}:{"Set-Cookie":`ef_guest=${profile.secret}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol==="https:"?"; Secure":""}`});
 }
 if(!profile)return json({error:"Guest session required"},401);
 const p=profile;
 if(path==="/api/profile")return json(publicProfile(p));
 // A database-backed budget works across isolates and stores guest identifiers only.
 const lim=await db.prepare("INSERT INTO limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(p.id+":"+Math.floor(now/10000)).first<{count:number}>();
 if((lim?.count??0)>80)return json({error:"Slow down for a moment."},429);
 if(path==="/api/party"&&request.method==="POST"){
  const b=await body(request);const mode=[1,2,4].includes(b.mode)?b.mode:4;
  const code=crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase();await db.prepare("INSERT INTO parties (code,mode,updated) VALUES (?,?,?)").bind(code,mode,now).run();
  return json({code,mode});
 }
 if(path==="/api/party"&&request.method==="GET"){
  const code=(url.searchParams.get("code")??"").toUpperCase();const party=await db.prepare("SELECT * FROM parties WHERE code=? AND updated>?").bind(code,now-86400000).first();return party?json(party):json({error:"That invite has expired. Create a new squad code."},404);
 }
 if(path==="/api/match"&&request.method==="POST"){
  const b=await body(request),mode=[1,2,4].includes(b.mode)?b.mode:4;const code=String(b.party??"").replace(/[^A-Z0-9]/gi,"").slice(0,6).toUpperCase();
  let r:Room|null=null;let party=code?await db.prepare("SELECT * FROM parties WHERE code=? AND updated>?").bind(code,now-86400000).first<{code:string;mode:number;room:string|null}>():null;
  if(code&&!party)return json({error:"Invite not found. Check the six-character code."},404);
  if(party?.room)r=await db.prepare("SELECT * FROM rooms WHERE id=? AND open_until>? AND expires>?").bind(party.room,now,now).first<Room>();
  if(!r&&!party)r=await db.prepare("SELECT r.* FROM rooms r WHERE mode=? AND open_until>? AND expires>? AND (SELECT COUNT(*) FROM inputs WHERE room=r.id)<? ORDER BY updated DESC LIMIT 1").bind(mode,now,now,MAX_HUMANS).first<Room>();
  if(!r){const id=crypto.randomUUID();r={id,mode:party?.mode??mode,state:"",version:0,updated:now,owner:p.id,lease:now+10000,open_until:now+60000,expires:now+720000};await db.prepare("INSERT INTO rooms (id,mode,state,updated,owner,lease,open_until,expires) VALUES (?,?,?,?,?,?,?,?)").bind(r.id,r.mode,"",now,p.id,r.lease,r.open_until,r.expires).run();if(party){const claimed=await db.prepare("UPDATE parties SET room=?,updated=? WHERE code=? AND (room IS NULL OR room=?)").bind(id,now,party.code,party.room??"").run();if(!claimed.meta.changes){const canonical=await db.prepare("SELECT r.* FROM rooms r JOIN parties p ON p.room=r.id WHERE p.code=?").bind(party.code).first<Room>();if(!canonical)return json({error:"The squad relay changed. Try again."},409);await db.prepare("DELETE FROM rooms WHERE id=? AND NOT EXISTS(SELECT 1 FROM inputs WHERE room=?)").bind(id,id).run();r=canonical}}}
  const existing=await member(db,r.id,p.id);
  if(!existing){const inserted=await db.prepare("INSERT INTO inputs (room,player,name,party,input,updated) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM inputs WHERE room=?)<? AND (SELECT COUNT(*) FROM inputs WHERE room=? AND party=?)<?").bind(r.id,p.id,p.name,party?.code??p.id,"{}",now,r.id,MAX_HUMANS,r.id,party?.code??p.id,r.mode).run();if(!inserted.meta.changes)return json({error:"That squad or flight is full. Create a fresh invite or find another flight."},409)}
  return json({id:r.id,mode:r.mode,host:r.owner,created:r.updated,isHost:r.owner===p.id,checkpoint:r.owner===p.id&&r.state?r.state:null});
 }
 const roomId=String(url.searchParams.get("room")??"");
 if(!roomId||!await member(db,roomId,p.id))return json({error:"Room membership required"},403);
 const room=await db.prepare("SELECT * FROM rooms WHERE id=? AND expires>?").bind(roomId,now).first<Room>();
 if(!room)return json({error:"This match has ended. Re-queue for another flight."},410);
 if(path==="/api/room"&&request.method==="GET"){
  await db.prepare("UPDATE inputs SET updated=? WHERE room=? AND player=?").bind(now,roomId,p.id).run();
  if(room.owner===p.id)await db.prepare("UPDATE rooms SET lease=? WHERE id=? AND owner=?").bind(now+12000,roomId,p.id).run();
  const members=await db.prepare("SELECT i.player id,i.name,i.party,i.updated,p.xp FROM inputs i JOIN profiles p ON p.id=i.player WHERE room=?").bind(roomId).all();
  const after=Math.max(0,Number(url.searchParams.get("after"))||0);
  const signals=await db.prepare("SELECT id,sender,data FROM signals WHERE room=? AND recipient=? AND id>? ORDER BY id LIMIT 80").bind(roomId,p.id,after).all();
  return json({id:room.id,mode:room.mode,host:room.owner,lease:room.lease,serverTime:now,members:members.results,signals:signals.results,checkpoint:room.owner===p.id?room.state:undefined});
 }
 if(path==="/api/signal"&&request.method==="POST"){
  const b=await body(request);if(typeof b.to!=="string"||!await member(db,roomId,b.to))return json({error:"Unknown peer"},400);
  if(p.id!==room.owner&&b.to!==room.owner)return json({error:"Star topology only"},403);
  const data=JSON.stringify(b.data);if(data.length>70000)return json({error:"Signal too large"},413);
  await db.prepare("INSERT INTO signals (room,sender,recipient,data,created) VALUES (?,?,?,?,?)").bind(roomId,p.id,b.to,data,now).run();return json({ok:true});
 }
 if(path==="/api/checkpoint"&&request.method==="POST"){
  if(p.id!==room.owner)return json({error:"Only the current host may checkpoint"},403);const b=await body(request);const data=JSON.stringify(b.state);
  if(data.length>170000||typeof b.state?.time!=="number"||!Array.isArray(b.state?.players)||b.state.players.length>64)return json({error:"Invalid checkpoint"},400);
  const result=await db.prepare("UPDATE rooms SET state=?,lease=?,version=version+1 WHERE id=? AND owner=?").bind(data,now+10000,roomId,p.id).run();
  // Bounded garbage collection, detached from combat. No personal identifiers beyond guest IDs.
  await db.batch([db.prepare("DELETE FROM signals WHERE created<?").bind(now-120000),db.prepare("DELETE FROM limits WHERE key IN (SELECT key FROM limits WHERE key NOT LIKE 'guest:%' AND CAST(substr(key,instr(key,':')+1) AS INTEGER)<? LIMIT 20)").bind(Math.floor(now/10000)-12)]);
  return json({ok:!!result.meta.changes});
 }
 if(path==="/api/elect"&&request.method==="POST"){
  const result=await db.prepare("UPDATE rooms SET owner=?,lease=? WHERE id=? AND lease<?").bind(p.id,now+12000,roomId,now).run();
  return json({elected:!!result.meta.changes,checkpoint:result.meta.changes?room.state:undefined});
 }
 if(path==="/api/reward"&&request.method==="POST"){
  if(p.id!==room.owner)return json({error:"Host attestation required"},403);const b=await body(request);if(!b.result||!Array.isArray(b.result.players))return json({error:"No result"},400);
  const profiles=await db.prepare("SELECT p.* FROM profiles p JOIN inputs i ON i.player=p.id WHERE i.room=?").bind(roomId).all<Profile>();
  for(const q of profiles.results){
   const player=b.result.players.find((x:{id:string})=>x.id===q.id);if(!player)continue;
   const old=await db.prepare("SELECT reward FROM results WHERE room=? AND player=?").bind(roomId,q.id).first<{reward:string}>();
   if(old){const prev=JSON.parse(old.reward);if(!prev.won&&b.result.winner===player.team){await db.batch([db.prepare("UPDATE profiles SET xp=xp+250,wins=wins+1 WHERE id=? AND EXISTS(SELECT 1 FROM results WHERE room=? AND player=? AND json_extract(reward,'$.won')=0)").bind(q.id,roomId,q.id),db.prepare("UPDATE results SET reward=json_set(reward,'$.won',1,'$.xp',json_extract(reward,'$.xp')+250) WHERE room=? AND player=? AND json_extract(reward,'$.won')=0").bind(roomId,q.id)])}continue;}
   const won=b.result.winner===player.team,seconds=Math.max(0,Math.min(600,Number(player.survived)||0)),defeats=Math.max(0,Math.min(63,Math.floor(player.defeats)||0)),revives=Math.max(0,Math.min(30,Math.floor(player.revives)||0));
   const xp=80+Math.floor(seconds/3)+defeats*35+revives*40+(won?250:0);const today=new Date(now).toISOString().slice(0,10);let daily=JSON.parse(q.daily||"{}");if(daily.day!==today)daily={day:today,matches:0,defeats:0,survival:0,claimed:[]};daily.matches++;daily.defeats+=defeats;daily.survival+=seconds;
   let bonus=0;for(const [key,target,reward]of[["matches",3,180],["defeats",5,220],["survival",300,200]]as const)if(daily[key]>=target&&!daily.claimed.includes(key)){daily.claimed.push(key);bonus+=reward}
   const reward=JSON.stringify({xp:xp+bonus,bonus,won,defeats,revives,seconds,placement:player.placement||1});
   await db.batch([db.prepare("INSERT OR IGNORE INTO results (room,player,reward) VALUES (?,?,?)").bind(roomId,q.id,reward),db.prepare("UPDATE profiles SET xp=xp+?,matches=matches+1,wins=wins+?,defeats=defeats+?,revives=revives+?,daily=? WHERE id=? AND EXISTS(SELECT 1 FROM results WHERE room=? AND player=? AND applied=0)").bind(xp+bonus,won?1:0,defeats,revives,JSON.stringify(daily),q.id,roomId,q.id),db.prepare("UPDATE results SET applied=1 WHERE room=? AND player=?").bind(roomId,q.id)]);
  }
  if(b.result.ended)await db.prepare("UPDATE rooms SET open_until=0 WHERE id=?").bind(roomId).run();return json({ok:true});
 }
 if(path==="/api/result")return json(await db.prepare("SELECT reward FROM results WHERE room=? AND player=?").bind(roomId,p.id).first()??{pending:true});
 return json({error:"Route not found"},404);
}
