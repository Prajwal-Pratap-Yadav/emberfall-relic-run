import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleApi} from '../worker/service.ts';
class Statement{
 values:SQLInputValue[]=[];db:DatabaseSync;sql:string;
 constructor(db:DatabaseSync,sql:string){this.db=db;this.sql=sql}
 bind(...values:SQLInputValue[]){this.values=values;return this}
 async first<T>(){return this.db.prepare(this.sql).get(...this.values) as T??null}
 async all<T>(){return{results:this.db.prepare(this.sql).all(...this.values)as T[]}}
 runSync(){const r=this.db.prepare(this.sql).run(...this.values);return{meta:{changes:Number(r.changes)},success:true}}
 async run(){return this.runSync()}
}
function database(){const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));return{sqlite,prepare(sql:string){return new Statement(sqlite,sql)},async batch(rows:Statement[]){sqlite.exec('BEGIN');try{const r=rows.map(s=>s.runSync());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}}}
async function call(db:ReturnType<typeof database>,path:string,token='',body?:unknown){const req=new Request('https://test.invalid/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://test.invalid','X-Guest-Token':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const response=await handleApi(req,db as unknown as D1Database,new URL(req.url));return{status:response.status,data:await response.json() as Record<string,unknown>}}
async function session(db:ReturnType<typeof database>,name:string){const r=await call(db,'session','',{name,fresh:true});return{token:r.data.token as string,profile:r.data.profile as{id:string;name:string}}}
test('real SQL service: guest identity, party matchmaking, host fencing and idempotent XP',async()=>{
 const db=database();const a=await session(db,'Cairn'),b=await session(db,'Moss'),stranger=await session(db,'Other');
 assert.notEqual(a.profile.id,b.profile.id);assert.equal((await call(db,'profile','invalid')).status,401);
 const party=await call(db,'party',a.token,{mode:4});const code=party.data.code as string;
 const r=await call(db,'match',a.token,{mode:4,party:code}),r2=await call(db,'match',b.token,{mode:4,party:code});assert.equal(r.status,200);assert.equal(r.data.id,r2.data.id);const id=r.data.id as string;
 assert.equal((await call(db,'room?room='+id,stranger.token)).status,403);
 assert.equal((await call(db,'checkpoint?room='+id,b.token,{state:{time:1,players:[]}})).status,403);
 const room=await call(db,'room?room='+id,a.token);assert.equal((room.data.members as unknown[]).length,2);
 assert.equal((await call(db,'signal?room='+id,b.token,{to:a.profile.id,data:{type:'offer'}})).status,200);
 const inbox=await call(db,'room?room='+id,a.token);assert.equal((inbox.data.signals as unknown[]).length,1);
 const result={winner:0,players:[{id:a.profile.id,team:0,survived:30,defeats:2,revives:0,placement:1}]};
 for(let n=0;n<3;n++)assert.equal((await call(db,'reward?room='+id,a.token,{result})).status,200);
 const profile=await call(db,'profile',a.token);assert.equal(profile.data.matches,1);assert.equal(profile.data.xp,410);assert.equal(profile.data.wins,1);
 db.sqlite.prepare('UPDATE rooms SET lease=0 WHERE id=?').run(id);const election=await call(db,'elect?room='+id,b.token,{});assert.equal(election.data.elected,true);
 assert.equal((await call(db,'checkpoint?room='+id,a.token,{state:{time:2,players:[]}})).status,403);assert.equal((await call(db,'checkpoint?room='+id,b.token,{state:{time:2,players:[]}})).status,200);
 db.sqlite.close();
});
test('real SQL service rejects cross-origin writes and enforces eight human seats',async()=>{const db=database();const a=await session(db,'A');let id='';for(let n=0;n<8;n++){const user=n===0?a:await session(db,'G'+n);const room=await call(db,'match',user.token,{mode:4});assert.equal(room.status,200);if(id)assert.equal(room.data.id,id);id=room.data.id as string}const extra=await session(db,'Extra');const next=await call(db,'match',extra.token,{mode:4});assert.equal(next.status,200);assert.notEqual(next.data.id,id);const req=new Request('https://test.invalid/api/party',{method:'POST',headers:{Origin:'https://evil.invalid'}});assert.equal((await handleApi(req,db as unknown as D1Database,new URL(req.url))).status,403);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM inputs WHERE room=?').get(id)?.n,8);db.sqlite.close()});

test('simultaneous invited players resolve one canonical room and respect squad size',async()=>{const db=database(),a=await session(db,'A'),b=await session(db,'B'),party=await call(db,'party',a.token,{mode:2});const [r1,r2]=await Promise.all([call(db,'match',a.token,{mode:2,party:party.data.code}),call(db,'match',b.token,{mode:2,party:party.data.code})]);assert.equal(r1.data.id,r2.data.id);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM rooms').get()?.n,1);const extra=await session(db,'C');assert.equal((await call(db,'match',extra.token,{mode:2,party:party.data.code})).status,409);db.sqlite.close()});
test('loss rewards apply once and a later squad win upgrades once',async()=>{const db=database(),a=await session(db,'A'),r=await call(db,'match',a.token,{mode:4});const player={id:a.profile.id,team:0,survived:30,defeats:2,revives:0,placement:5},path='reward?room='+r.data.id;await call(db,path,a.token,{result:{winner:null,ended:false,players:[player]}});for(let n=0;n<3;n++)await call(db,path,a.token,{result:{winner:0,ended:true,players:[player]}});const p=await call(db,'profile',a.token);assert.equal(p.data.xp,410);assert.equal(p.data.matches,1);assert.equal(p.data.wins,1);assert.equal(p.data.defeats,2);db.sqlite.close()});
