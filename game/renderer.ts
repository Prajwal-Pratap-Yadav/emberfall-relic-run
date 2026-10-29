import {WORLD,CENTER,RADIUS,PLACES,BUILDINGS,SOLIDS,WEAPONS,RARITY_COLORS} from './data.ts';
import {clamp,dist,angleDiff,type Snapshot,type Player,type GameEvent,type Vec} from './simulation.ts';
import {GameAudio} from './audio.ts';
type Entity=Snapshot['players'][number];
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;color:string;size:number};
export type RenderSettings={shake:number;quality:number;haptics:boolean;color:string};
/** A cached hand-drawn island plus culled dynamic sprites, lighting and particles. */
export class Renderer {
 canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;map:HTMLCanvasElement;mini:HTMLCanvasElement|null=null;audio:GameAudio;
 snapshot:Snapshot|null=null;entities=new Map<string,Entity>();camera={x:CENTER,y:CENTER};zoom=1;width=1;height=1;dpr=1;frame=0;last=0;fps=60;quality=1;shake=0;hit=0;damageAngle=0;damageFlash=0;seen=0;footsteps=new Map<string,number>();particles:Particle[]=[];numbers:{x:number;y:number;n:number;life:number}[]=[];tracers:{x:number;y:number;ex:number;ey:number;life:number;color:string}[]=[];
 settings:RenderSettings={shake:.55,quality:1,haptics:true,color:'#ffb56c'};predicted:Vec|null=null;pointer={x:0,y:0};
 rings:{x:number;y:number;radius:number;life:number;max:number;color:string}[]=[];
 constructor(canvas:HTMLCanvasElement,audio:GameAudio){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false})!;this.audio=audio;this.map=document.createElement('canvas');this.map.width=WORLD;this.map.height=WORLD;this.paintMap();this.resize()}
 resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.dpr=Math.min(devicePixelRatio||1,1.5)*this.quality;this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr)}
 paintMap(){
  const c=this.map.getContext('2d')!;c.fillStyle='#0b292c';c.fillRect(0,0,WORLD,WORLD);
  let rng=7429;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
  // Bathymetry, hand-cut coastline, warm rock shelf and moss interior.
  for(let i=5;i>=0;i--){c.beginPath();for(let k=0;k<=100;k++){const a=k/100*Math.PI*2,r=RADIUS+45+i*27+Math.sin(a*9)*16+Math.sin(a*17)*8,x=CENTER+Math.cos(a)*r,y=CENTER+Math.sin(a)*r;k?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fillStyle=['#7e8569','#3b6861','#245054','#1c454a','#153b41','#103238'][i];c.fill()}
  const ground=c.createRadialGradient(1100,900,50,CENTER,CENTER,RADIUS);ground.addColorStop(0,'#566854');ground.addColorStop(.6,'#425748');ground.addColorStop(1,'#69745a');c.beginPath();c.arc(CENTER,CENTER,RADIUS,0,Math.PI*2);c.fillStyle=ground;c.fill();
  c.save();c.beginPath();c.arc(CENTER,CENTER,RADIUS-10,0,Math.PI*2);c.clip();
  for(let i=0;i<10000;i++){const x=rand()*WORLD,y=rand()*WORLD;c.fillStyle=i%3===0?'#9b9a6b17':'#1b3d3025';c.fillRect(x,y,2+rand()*18,1+rand()*8)}
  // Original logistics roads with painted shoulders and worn center seams.
  for(const p of PLACES){c.beginPath();c.moveTo(CENTER,CENTER);c.bezierCurveTo(CENTER,p.y,p.x,CENTER,p.x,p.y);c.lineWidth=64;c.strokeStyle='#8d897050';c.stroke();c.lineWidth=44;c.strokeStyle='#555c50';c.stroke();c.lineWidth=1.5;c.strokeStyle='#bab48b66';c.setLineDash([18,25]);c.stroke();c.setLineDash([])}
  for(const p of PLACES){c.fillStyle='#333f39';c.fillRect(p.x-260,p.y-160,520,390);c.strokeStyle='#8b92744d';c.lineWidth=3;c.strokeRect(p.x-260,p.y-160,520,390);for(let i=0;i<5;i++){c.fillStyle='#adb59812';c.fillRect(p.x-220+i*95,p.y-145,45,290)}c.fillStyle='#c6d1ac66';c.font='600 15px system-ui';c.textAlign='center';c.fillText(p.name,p.x,p.y+218);c.fillStyle='#c4b38b';c.fillRect(p.x+217,p.y-145,10,95);c.fillStyle='#1d2d2a';c.fillRect(p.x+219,p.y-142,6,40)}
  for(const b of BUILDINGS){c.fillStyle='#10242177';c.fillRect(b.x+12,b.y+14,b.w,b.h);c.fillStyle=b.style===1?'#697269':'#7b7c65';c.fillRect(b.x,b.y,b.w,b.h);c.strokeStyle='#b0b09230';c.lineWidth=1;for(let y=b.y+15;y<b.y+b.h;y+=17){c.beginPath();c.moveTo(b.x,y);c.lineTo(b.x+b.w,y);c.stroke()}c.fillStyle='#3d5148';c.fillRect(b.x+20,b.y+20,26,18);c.fillStyle='#b4b7a54d';c.fillRect(b.x+22,b.y+20,22,3);c.fillStyle='#b1a778';c.fillRect(b.x+b.w-35,b.y+20,18,32);c.fillStyle='#101f2090';c.fillRect(b.x+b.w/2-21,b.y+b.h-5,42,8)}
  for(const b of SOLIDS){c.fillStyle='#0a202168';c.fillRect(b.x+8,b.y+10,b.w,b.h);if(b.kind==='rock'){c.fillStyle='#5f6d64';c.beginPath();c.ellipse(b.x+b.w/2,b.y+b.h/2,b.w*.63,b.h*.63,-.5,0,Math.PI*2);c.fill();c.fillStyle='#9ca590';c.beginPath();c.ellipse(b.x+b.w*.4,b.y+b.h*.35,b.w*.4,b.h*.35,-.5,0,Math.PI*2);c.fill()}else{c.fillStyle=b.kind==='crate'?'#a48956':'#313e3b';c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle=b.kind==='crate'?'#c0ae7b':'#a0a78d';c.fillRect(b.x,b.y,b.w,3);if(b.kind==='crate'){c.strokeStyle='#4d573d';c.lineWidth=3;c.strokeRect(b.x+4,b.y+5,b.w-8,b.h-10)}}}
  // Windswept canopy clusters keep top-down silhouettes readable.
  for(let i=0;i<240;i++){const x=rand()*WORLD,y=rand()*WORLD;if(PLACES.some(p=>Math.hypot(x-p.x,y-p.y)<370)||Math.hypot(x-CENTER,y-CENTER)>RADIUS-75)continue;const r=15+rand()*21;c.fillStyle='#061f2399';c.beginPath();c.ellipse(x+12,y+18,r*1.1,r*.75,.5,0,Math.PI*2);c.fill();for(let k=0;k<4;k++){c.fillStyle=['#24483c','#305544','#41634c','#5c7756'][k];c.beginPath();c.arc(x+Math.cos(k*2.4)*r*.35,y+Math.sin(k*2.4)*r*.35,r*(.75-k*.07),0,Math.PI*2);c.fill()}}
  c.restore();
  c.strokeStyle='#a0d8c20c';c.lineWidth=1;for(let i=0;i<100;i++){const x=rand()*WORLD,y=rand()*WORLD;if(Math.hypot(x-CENTER,y-CENTER)<RADIUS+80)continue;c.beginPath();c.ellipse(x,y,12+rand()*20,2,0,0,Math.PI);c.stroke()}
 }
 update(s:Snapshot){
  const first=!this.snapshot;this.snapshot=s;const valid=new Set(s.players.map(p=>p.id));for(const id of this.entities.keys())if(!valid.has(id))this.entities.delete(id);
  for(const p of s.players){const old=this.entities.get(p.id);const me=s.players.find(q=>q.id===s.me);if(old&&me&&p.id!==s.me&&p.alive&&p.phase==='ground'&&dist(old,p)>4&&dist(p,me)<240&&s.time-(this.footsteps.get(p.id)??0)>.38){this.audio.noise(.045,.09*(1-dist(p,me)/240),clamp((p.x-me.x)/220,-1,1),700);this.footsteps.set(p.id,s.time)}this.entities.set(p.id,old?{...p,x:old.x,y:old.y}:({...p}))}
  const me=s.players.find(p=>p.id===s.me);
  for(const e of s.events){if(e.id<=this.seen)continue;if((first&&s.time-e.time>.15)||((e.kind==='shot'||e.kind==='hit')&&s.time-e.time>.22)){this.seen=e.id;continue}this.event(e,me);this.seen=Math.max(this.seen,e.id)}
 }
 event(e:GameEvent,me:Entity|undefined){
  if(e.kind==='shot'){
   const a=e.angle??0,d=e.amount??350;this.tracers.push({x:e.x,y:e.y,ex:e.x+Math.cos(a)*d,ey:e.y+Math.sin(a)*d,life:.11,color:WEAPONS[e.weapon??0].color});
   this.burst(e.x+Math.cos(a)*25,e.y+Math.sin(a)*25,4,'#ffe2a1',60);
   if(me){const distance=dist(e,me);this.audio.shot(e.weapon??0,clamp((e.x-me.x)/450,-1,1),distance);if(e.from===me.id)this.shake=Math.max(this.shake,WEAPONS[e.weapon??0].recoil*65)}
  }
  if(e.kind==='hit'){
   this.burst(e.x,e.y,7,'#ffc97d',95);
   if(e.from===me?.id){this.hit=.2;this.numbers.push({x:e.x,y:e.y-20,n:e.amount??0,life:.85});this.audio.hit();if(this.settings.haptics)navigator.vibrate?.(8)}
   if(e.to===me?.id){this.damageFlash=.6;this.damageAngle=e.angle??0;this.shake=5;if(this.settings.haptics)navigator.vibrate?.([25,25,25])}
  }
  if(e.kind==='zone')this.audio.siren();if(e.kind==='revive')this.audio.pickup();
  if(e.kind==='dash'){const d=e.amount??140,a=e.angle??0;for(let n=0;n<8;n++)this.burst(e.x+Math.cos(a)*d*n/8,e.y+Math.sin(a)*d*n/8,3,'#91f5d5',35);if(e.from===me?.id)this.audio.dash();}
  if(e.kind==='blast'){this.burst(e.x,e.y,45,e.team===0?'#ffcd6e':'#ff735b',290);this.rings.push({x:e.x,y:e.y,radius:e.amount??110,life:.5,max:.5,color:e.team===0?'#ffcd6e':'#ff735b'});if(me&&dist(e,me)<800){this.shake=10;this.audio.blast(clamp((e.x-me.x)/450,-1,1));}}
  if(e.kind==='objective'&&e.from===me?.id)this.audio.pickup();
 }
 burst(x:number,y:number,count:number,color:string,velocity:number){if(this.quality<.7)count=Math.ceil(count/2);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,life=.15+Math.random()*.35;this.particles.push({x,y,vx:Math.cos(a)*velocity,vy:Math.sin(a)*velocity,life,max:life,color,size:1+Math.random()*3})}if(this.particles.length>250)this.particles.splice(0,this.particles.length-250)}
 toWorld(x:number,y:number){return{x:(x-this.width/2)/this.zoom+this.camera.x,y:(y-this.height/2)/this.zoom+this.camera.y}}
 draw(now:number){
  const rawDt=(now-this.last)/1000||.0167;const dt=Math.min(.06,rawDt);this.last=now;this.fps=this.fps*.95+(1/rawDt)*.05;this.frame++;
  if(this.frame%120===0&&this.settings.quality===0&&document.visibilityState==='visible'){let q=this.quality;if(this.fps<55)q=Math.max(.5,q*.8);else if(this.fps>59&&this.frame%960===0)q=Math.min(1,q+.05);if(Math.abs(q-this.quality)>.01){this.quality=q;this.resize()}}
  const s=this.snapshot,c=this.ctx;if(!s){c.fillStyle='#102728';c.fillRect(0,0,this.canvas.width,this.canvas.height);return}
  const target=s.players.find(p=>p.id===s.spectating)??s.players.find(p=>p.id===s.me);if(!target)return;
  for(const p of s.players){const e=this.entities.get(p.id)!;const f=1-Math.exp(-dt*14);e.x+=(p.x-e.x)*f;e.y+=(p.y-e.y)*f;e.angle+=angleDiff(e.angle,p.angle)*f}
  const self=this.entities.get(target.id)!;const pos=target.id===s.me&&this.predicted&&target.phase==='ground'?this.predicted:self;
  const airborne=target.phase==='plane',zoomTarget=airborne?Math.min(this.width,this.height)/WORLD*.91:clamp(Math.min(this.width/1000,this.height/640),.72,1.5)*(target.phase==='glide'?.7:1);
  this.zoom+=(zoomTarget-this.zoom)*(1-Math.exp(-dt*4));const cam=airborne?{x:CENTER,y:CENTER}:pos;this.camera.x+=(cam.x-this.camera.x)*(1-Math.exp(-dt*8));this.camera.y+=(cam.y-this.camera.y)*(1-Math.exp(-dt*8));
  this.shake=Math.max(0,this.shake-rawDt*25);this.hit=Math.max(0,this.hit-rawDt);this.damageFlash=Math.max(0,this.damageFlash-rawDt);const shake=this.shake*this.settings.shake;
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0a2428';c.fillRect(0,0,this.width,this.height);c.save();c.translate(this.width/2+(Math.random()-.5)*shake,this.height/2+(Math.random()-.5)*shake);c.scale(this.zoom,this.zoom);c.translate(-this.camera.x,-this.camera.y);
  c.drawImage(this.map,0,0);
  if(s.adventure)this.adventureWorld(c,s,now);
  const inView=(x:number,y:number,margin=80)=>Math.abs(x-this.camera.x)<this.width/this.zoom/2+margin&&Math.abs(y-this.camera.y)<this.height/this.zoom/2+margin;
  if(airborne){c.save();c.strokeStyle='#f8d4a888';c.lineWidth=4;c.setLineDash([15,20]);c.beginPath();c.moveTo(WORLD*.09,WORLD*.18);c.lineTo(WORLD*.91,WORLD*.82);c.stroke();c.setLineDash([]);c.fillStyle='#f1e7cc';c.textAlign='center';c.font='bold 29px system-ui';for(const p of PLACES)c.fillText(p.name,p.x,p.y-200);c.restore()}
  // Loot has physical depth, distinct tier halos, and readable shapes.
  for(const l of s.loot){if(!inView(l.x,l.y))continue;const color=RARITY_COLORS[l.tier];if(l.air){c.strokeStyle='#ffd18b88';c.lineWidth=2;c.beginPath();c.moveTo(l.x,l.y-170);c.lineTo(l.x,l.y);c.stroke();c.fillStyle='#ffce7755';c.fillRect(l.x-10,l.y-150,20,130)}
   const pulse=1+Math.sin(now*.003+l.id)*.12;c.fillStyle=color+'18';c.beginPath();c.ellipse(l.x,l.y,22*pulse,14*pulse,0,0,Math.PI*2);c.fill();c.save();c.translate(l.x,l.y);c.shadowColor=color;c.shadowBlur=9;
   if(l.kind==='weapon'){c.rotate(-.35);this.weapon(c,l.weapon,color,1.1)}else if(l.kind==='armor'){c.fillStyle=color;c.beginPath();c.moveTo(-10,-9);c.lineTo(10,-9);c.lineTo(8,8);c.lineTo(0,13);c.lineTo(-8,8);c.closePath();c.fill();c.fillStyle='#22423d';c.fillRect(-4,-6,8,12)}else if(l.kind==='heal'){c.fillStyle='#b1e9cb';c.fillRect(-9,-9,18,18);c.fillStyle='#315e4d';c.fillRect(-5,-2,10,4);c.fillRect(-2,-5,4,10)}else{c.fillStyle='#d5cba1';c.fillRect(-7,-7,14,14);c.fillStyle='#625c3f';c.fillRect(-3,-4,2,8);c.fillRect(1,-4,2,8)}c.restore();
  }
  // Enemy pings are squad-owned signals, not a view through the map.
  for(const e of s.events)if(e.kind==='ping'){const r=18+(s.time-e.time)*12;c.strokeStyle=e.amount===1?'#ff8e7e':'#b9efd8';c.lineWidth=2/this.zoom;c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();c.fillStyle='#eff3d9';c.font='12px system-ui';c.textAlign='center';c.fillText(e.label??'',e.x,e.y-25)}
  const entities=[...this.entities.values()].sort((a,b)=>a.y-b.y);
  for(const p of entities){if(!p.alive||p.phase==='plane'||!inView(p.x,p.y))continue;const actual=p.id===s.me&&this.predicted&&p.phase==='ground'?{...p,...this.predicted}:p;this.character(c,actual,p.team===target.team,p.id===s.me,now)}
  // Original gullwing carrier and parachute, drawn in the same projection.
  if(airborne){const f=clamp(s.time/12,0,1);c.save();c.translate(WORLD*(.09+.82*f),WORLD*(.18+.64*f));c.rotate(.65);c.fillStyle='#0d252b66';c.fillRect(-85,45,170,25);c.shadowColor='#ffb36b';c.shadowBlur=30;c.fillStyle='#e6e3c9';c.beginPath();c.moveTo(0,-85);c.lineTo(18,-15);c.lineTo(100,35);c.lineTo(100,50);c.lineTo(18,23);c.lineTo(13,70);c.lineTo(38,83);c.lineTo(-38,83);c.lineTo(-13,70);c.lineTo(-18,23);c.lineTo(-100,50);c.lineTo(-100,35);c.lineTo(-18,-15);c.closePath();c.fill();c.fillStyle='#faab64';c.fillRect(-8,-35,16,55);c.restore()}
  for(const t of this.tracers){t.life-=rawDt;c.globalAlpha=clamp(t.life/.11,0,1);c.strokeStyle=t.color;c.lineWidth=1.8;c.beginPath();c.moveTo(t.x,t.y);c.lineTo(t.ex,t.ey);c.stroke()}c.globalAlpha=1;this.tracers=this.tracers.filter(t=>t.life>0);
  for(const r of this.rings){r.life-=rawDt;const f=clamp(r.life/r.max,0,1);c.globalAlpha=f;c.lineWidth=4+f*9;c.strokeStyle=r.color;c.beginPath();c.arc(r.x,r.y,r.radius*(1-f*.7),0,Math.PI*2);c.stroke();c.fillStyle=r.color+'25';c.fill();}c.globalAlpha=1;this.rings=this.rings.filter(r=>r.life>0);
  for(const p of this.particles){p.life-=rawDt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9;c.globalAlpha=Math.max(0,p.life/p.max);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size)}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  for(const n of this.numbers){n.life-=rawDt;n.y-=dt*28;c.fillStyle='#fff0c5';c.strokeStyle='#233a32';c.lineWidth=3;c.textAlign='center';c.font='800 20px system-ui';c.globalAlpha=Math.min(1,n.life*3);c.strokeText(String(n.n),n.x,n.y);c.fillText(String(n.n),n.x,n.y)}c.globalAlpha=1;this.numbers=this.numbers.filter(n=>n.life>0);
  // Storm mask uses the real authoritative circle, not a cosmetic screen filter.
  if(!s.training){c.fillStyle='#4d66a844';c.beginPath();c.rect(-100,-100,WORLD+200,WORLD+200);c.arc(s.zone.x,s.zone.y,Math.max(0,s.zone.r),0,Math.PI*2,true);c.fill('evenodd');c.strokeStyle='#9ce4ff';c.lineWidth=3/this.zoom;c.shadowColor='#81dcff';c.shadowBlur=12;c.beginPath();c.arc(s.zone.x,s.zone.y,Math.max(0,s.zone.r),0,Math.PI*2);c.stroke();c.shadowBlur=0;c.strokeStyle='#e3f4c45c';c.lineWidth=1.5/this.zoom;c.setLineDash([8,10]);c.beginPath();c.arc(s.zone.nextX,s.zone.nextY,s.zone.nextR,0,Math.PI*2);c.stroke();c.setLineDash([])}
  c.restore();
  // Soft vignette and warm directional bounce lighting give the map a physical atmosphere.
  const light=c.createRadialGradient(this.width*.48,this.height*.42,50,this.width/2,this.height/2,this.width*.72);light.addColorStop(0,'#ffcf6d04');light.addColorStop(1,'#00151b6b');c.fillStyle=light;c.fillRect(0,0,this.width,this.height);
  if(s.adventure){
   // Drifting embers are cheap screen-space accents, never hidden collision hazards.
   for(let n=0;n<24;n++){const x=(n*137.3+now*.018)%this.width,y=(n*93.1-now*.025+this.height*100)%this.height;c.fillStyle=n%3?'#ffbb6650':'#ffe1a085';c.fillRect(x,y,n%3?1:2,3);}
   const site=s.adventure.sites[s.adventure.stage];if(site&&dist(pos,site)>110){const a=Math.atan2(site.y-pos.y,site.x-pos.x),x=this.width/2+Math.cos(a)*Math.min(this.width*.3,240),y=this.height/2+Math.sin(a)*Math.min(this.height*.25,155);c.save();c.translate(x,y);c.rotate(a);c.fillStyle=s.adventure.stage===3?'#a3f4c0':'#ffd083';c.beginPath();c.moveTo(13,0);c.lineTo(-7,-7);c.lineTo(-3,0);c.lineTo(-7,7);c.closePath();c.fill();c.restore();c.fillStyle='#ffdf9c';c.font='bold 11px system-ui';c.textAlign='center';c.fillText(Math.round(dist(pos,site))+'m',x,y+22);}
  }
  if(this.damageFlash){c.strokeStyle=`rgba(255,138,100,${this.damageFlash})`;c.lineWidth=9;c.strokeRect(5,5,this.width-10,this.height-10);c.save();c.translate(this.width/2,this.height/2);c.rotate(this.damageAngle);c.fillStyle='#ff9871';c.beginPath();c.moveTo(100,-12);c.lineTo(122,0);c.lineTo(100,12);c.fill();c.restore()}
  if(this.hit>0){c.strokeStyle='#fff2ca';c.lineWidth=2;const x=this.pointer.x||this.width/2,y=this.pointer.y||this.height/2;for(const [a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]]){c.beginPath();c.moveTo(x+a*6,y+b*6);c.lineTo(x+a*12,y+b*12);c.stroke()}}
  this.drawMini(s,target);
 }
 weapon(c:CanvasRenderingContext2D,kind:number,color:string,scale=1){c.save();c.scale(scale,scale);c.fillStyle='#142a29';c.fillRect(-14,-4,30,10);c.fillStyle=color;c.fillRect(-12,-4,18,6);c.fillStyle='#dedbba';c.fillRect(6,-2,kind===3?23:kind===4?13:18,3);c.fillStyle='#56665b';c.fillRect(-5,3,6,6);if(kind===5)c.fillRect(-8,5,16,7);if(kind===3)c.fillRect(-2,-8,8,5);c.restore()}
 adventureWorld(c:CanvasRenderingContext2D,s:Snapshot,now:number){
  const a=s.adventure!;c.save();
  // A ruined energy route ties each objective to a place in the world.
  c.strokeStyle='#e3ba6c25';c.lineWidth=3;c.setLineDash([7,14]);c.beginPath();a.sites.forEach((p,n)=>n?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);
  for(let n=0;n<a.sites.length;n++){
   const p=a.sites[n],active=n===a.stage,done=n<a.stage,color=n===3?'#98edbc':'#ffcb7d';
   c.save();c.translate(p.x,p.y);c.fillStyle='#1028279c';c.beginPath();c.arc(0,0,82,0,Math.PI*2);c.fill();c.strokeStyle=active?color:done?'#8de6bb55':'#b1bfa133';c.lineWidth=active?3:1;c.beginPath();c.arc(0,0,76,0,Math.PI*2);c.stroke();
   if(active){c.fillStyle=color+'0e';c.fill();c.lineWidth=5;c.strokeStyle=color;c.beginPath();c.arc(0,0,76,-Math.PI/2,-Math.PI/2+a.charge*Math.PI*2);c.stroke();c.strokeStyle=color+'55';c.lineWidth=1;c.beginPath();c.arc(0,0,88+Math.sin(now*.003)*4,0,Math.PI*2);c.stroke();}
   if(n===3){c.strokeStyle=color+'66';c.lineWidth=6;for(let k=0;k<4;k++){c.save();c.rotate(k*Math.PI/2);c.strokeRect(25,25,20,20);c.restore();}c.fillStyle=color;c.font='bold 26px system-ui';c.textAlign='center';c.fillText('H',0,10);}
   else{for(let k=0;k<4;k++){const angle=k*Math.PI/2+.4,x=Math.cos(angle)*102,y=Math.sin(angle)*102;c.fillStyle='#0c2124aa';c.fillRect(x-8,y-10,23,40);c.fillStyle='#718476';c.fillRect(x-12,y-18,18,37);c.fillStyle=active?color:'#9fac92';c.fillRect(x-12,y-18,18,4);}c.save();c.translate(0,-12+Math.sin(now*.003+n)*5);c.rotate(Math.PI/4);c.shadowColor=color;c.shadowBlur=active?24:5;c.fillStyle=done?'#6fa792':color;c.fillRect(-12,-12,24,24);c.fillStyle='#ffedd2';c.fillRect(-5,-5,10,10);c.restore();}
   c.fillStyle=active?color:'#b9c9ae88';c.font='bold 11px system-ui';c.textAlign='center';c.fillText(done?'SECURED':p.name,0,117);c.restore();
  }
  for(const b of a.blasts){const f=clamp((s.time-b.born)/(b.at-b.born),0,1),color=b.team===0?'#ffe0a0':'#ff775f';c.fillStyle=b.team===0?'#ffcd5b12':'#ff64412a';c.strokeStyle=color;c.lineWidth=2;c.setLineDash(b.team===0?[4,6]:[]);c.beginPath();c.arc(b.x,b.y,b.radius,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.lineWidth=4;c.beginPath();c.arc(b.x,b.y,b.radius*f,0,Math.PI*2);c.stroke();const x=b.start.x+(b.x-b.start.x)*f,y=b.start.y+(b.y-b.start.y)*f-Math.sin(f*Math.PI)*60;c.fillStyle=color;c.shadowBlur=12;c.shadowColor=color;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();c.shadowBlur=0;if(b.team!==0){c.fillStyle=color;c.font='bold 17px system-ui';c.textAlign='center';c.fillText('!',b.x,b.y+6);}}
  c.restore();
 }
 character(c:CanvasRenderingContext2D,p:Entity,ally:boolean,self:boolean,now:number){
  if(p.role==='warden'){this.warden(c,p,now);return;}
  c.save();c.translate(p.x,p.y);const glide=p.phase==='glide',alt=glide?p.alt*45:0;
  c.fillStyle='#071d1ea6';c.beginPath();c.ellipse(6,10,17+alt*.15,11+alt*.08,.5,0,Math.PI*2);c.fill();
  if(ally||self){c.strokeStyle=self?this.settings.color:'#88e5c3';c.lineWidth=2;c.globalAlpha=.6;c.beginPath();c.arc(0,0,21,0,Math.PI*2);c.stroke();c.globalAlpha=1}
  if(p.invuln>0){c.strokeStyle='#dbf1d080';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.arc(0,0,25,now*.002,now*.002+Math.PI*2);c.stroke();c.setLineDash([])}
  c.translate(0,-alt);c.rotate(p.angle);
  const color=self?this.settings.color:ally?'#83cfb1':p.role==='elite'?'#f4ad60':p.role?'#e2836a':'#d7bc93';
  // Scarf, pack, boots, articulated shoulder plates, ceramic helm and amber visor.
  c.fillStyle=color;c.beginPath();c.moveTo(-10,-2);c.lineTo(-28+Math.sin(now*.01)*4,3);c.lineTo(-15,9);c.closePath();c.fill();c.fillStyle='#253e3a';c.fillRect(-13,-11,15,22);c.fillStyle='#132927';c.fillRect(-6,-14,14,10);c.fillRect(-6,5,14,10);c.fillStyle=p.knocked?'#826b57':'#657a6a';c.beginPath();c.ellipse(0,0,12,p.knocked?8:13,0,0,Math.PI*2);c.fill();c.fillStyle=color;c.fillRect(1,-13,8,7);c.fillRect(1,6,8,7);
  if(p.loadout.length&&!p.knocked){c.translate(14,6);this.weapon(c,p.loadout[p.slot]?.kind??0,'#d6d9bf',.85);c.translate(-14,-6)}
  c.fillStyle='#e4e0c7';c.beginPath();c.arc(3,-1,9,0,Math.PI*2);c.fill();c.fillStyle='#213431';c.fillRect(7,-6,5,10);c.fillStyle='#ffb362';c.fillRect(10,-4,2,7);c.fillStyle='#fff0bc';c.fillRect(1,-6,4,2);c.rotate(-p.angle);
  if(glide){c.strokeStyle='#d6e4d27d';c.lineWidth=1;for(const x of[-29,29]){c.beginPath();c.moveTo(0,0);c.lineTo(x,-43);c.stroke()}c.fillStyle=self?'#dca566':'#9bbba6';c.beginPath();c.ellipse(0,-45,38,14,0,Math.PI,0);c.fill();c.strokeStyle='#ead1a2';c.lineWidth=2;c.beginPath();c.ellipse(0,-45,38,14,0,Math.PI,0);c.stroke()}
  if(ally||p.knocked||p.role){c.fillStyle='#0b2427dc';c.fillRect(-31,-36,62,6);c.fillStyle=p.role?'#f19b77':p.knocked?'#ffa77c':'#a8e5ba';c.fillRect(-30,-35,60*clamp(p.hp/(p.maxHp??100),0,1),4);c.font='600 10px system-ui';c.textAlign='center';c.fillStyle=p.knocked?'#ffd19f':'#edf0d9';c.fillText(p.knocked?'REVIVE':p.role?p.role.toUpperCase():p.bot?'BOT':p.name,0,-43)}
  c.restore();
 }
 warden(c:CanvasRenderingContext2D,p:Entity,now:number){c.save();c.translate(p.x,p.y);c.fillStyle='#071a1b88';c.beginPath();c.ellipse(10,17,46,32,0,0,Math.PI*2);c.fill();c.rotate(p.angle);c.fillStyle='#233631';c.fillRect(-30,-30,55,60);c.fillStyle='#95a28b';c.fillRect(-20,-38,34,20);c.fillRect(-20,18,34,20);c.fillStyle='#c6b28d';c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.fill();c.fillStyle='#3a514a';c.fillRect(-8,-21,22,42);c.shadowColor=p.hp<450?'#ff7751':'#ffce76';c.shadowBlur=20;c.fillStyle=p.hp<450?'#ff7751':'#ffce76';c.fillRect(14,-12,6,24);c.fillRect(-23,-34,17,7);c.fillRect(-23,27,17,7);c.shadowBlur=0;c.fillStyle='#203d36';c.fillRect(18,18,40,13);c.fillStyle='#d7bd8f';c.fillRect(35,17,25,5);c.rotate(-p.angle);c.strokeStyle='#ffc57b66';c.lineWidth=2;c.setLineDash([8,12]);c.beginPath();c.arc(0,0,50,now*.001,now*.001+Math.PI*2);c.stroke();c.setLineDash([]);c.font='bold 10px system-ui';c.textAlign='center';c.fillStyle='#ffdc9f';c.fillText('ASH WARDEN',0,-53);c.restore();}
 drawMini(s:Snapshot,me:Entity){const canvas=this.mini;if(!canvas)return;const c=canvas.getContext('2d')!;const w=canvas.width,scale=w/WORLD;c.clearRect(0,0,w,w);c.drawImage(this.map,0,0,w,w);c.fillStyle='#425fa044';c.fillRect(0,0,w,w);c.save();c.scale(scale,scale);if(s.adventure){for(let n=0;n<s.adventure.sites.length;n++){const site=s.adventure.sites[n];c.strokeStyle=n===s.adventure.stage?'#ffce82':n<s.adventure.stage?'#a2efb8':'#bac9a055';c.lineWidth=12;c.strokeRect(site.x-45,site.y-45,90,90);}}c.strokeStyle='#d1e8bc';c.lineWidth=12;c.beginPath();c.arc(s.zone.x,s.zone.y,s.zone.r,0,Math.PI*2);c.stroke();c.strokeStyle='#ffffb788';c.lineWidth=8;c.setLineDash([20,30]);c.beginPath();c.arc(s.zone.nextX,s.zone.nextY,s.zone.nextR,0,Math.PI*2);c.stroke();c.setLineDash([]);for(const p of s.players){if(!p.alive||p.team!==me.team)continue;c.fillStyle=p.id===s.me?'#ffc788':'#a9f0c8';c.beginPath();c.arc(p.x,p.y,p.id===s.me?30:20,0,Math.PI*2);c.fill()}for(const e of s.events)if(e.kind==='ping'){c.strokeStyle='#ffbd7e';c.lineWidth=10;c.strokeRect(e.x-25,e.y-25,50,50)}c.restore();}
}
