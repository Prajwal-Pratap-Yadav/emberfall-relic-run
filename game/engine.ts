import {Renderer,type RenderSettings} from './renderer.ts';
import {MatchNetwork} from './network.ts';
import {GameAudio} from './audio.ts';
import {move,dist,lineOfSight,angleDiff,clamp,emptyInput,type Input,type Snapshot,type Vec} from './simulation.ts';
import {SPEED,WEAPONS} from './data.ts';
export type Settings={sound:boolean;music:boolean;shake:number;quality:number;haptics:boolean;autoFire:boolean;assist:boolean;practiceAutopilot:boolean;color:string};
export class GameEngine {
 renderer:Renderer;network:MatchNetwork;audio:GameAudio;settings:Settings;keys=new Set<string>();pointer={x:0,y:0};fire=false;touchFire=false;stickMove={x:0,y:0};stickAim:{x:number;y:number}|null=null;seq=0;actionSeq=0;action:Partial<Input>={};snap:Snapshot|null=null;prediction:Vec|null=null;pending:{input:Input;dt:number}[]=[];frame=0;last=0;sent=0;hudAt=0;paused=false;closed=false;onHud:(s:Snapshot)=>void;onMenu:()=>void;onPing:()=>void;
 listeners:{type:string;fn:EventListener;target:EventTarget}[]=[];
 fireTapped=false;
 constructor(canvas:HTMLCanvasElement,network:MatchNetwork,audio:GameAudio,settings:Settings,onHud:(s:Snapshot)=>void,onMenu:()=>void,onPing:()=>void){
  this.network=network;this.audio=audio;this.settings=settings;this.onHud=onHud;this.onMenu=onMenu;this.onPing=onPing;this.renderer=new Renderer(canvas,audio);this.setSettings(settings);
  this.listen(window,'keydown',((e:KeyboardEvent)=>{if((e.target as HTMLElement)?.tagName==='INPUT')return;const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();if(e.repeat)return;this.keys.add(key);if(key==='escape'){this.keys.clear();this.fire=false;this.onMenu()}if(this.paused)return;if(key==='q')this.onPing();if(key==='e')this.act('interact');if(key==='r')this.act('reload');if(key==='h')this.act('heal');if(key==='1'||key==='2')this.act('swap');if(key==='shift'||key===' '&&this.snap?.adventure)this.act('dash');if(key==='g')this.act('grenade');if(key===' '&&!this.snap?.adventure)this.act('jump')}) as EventListener);
  this.listen(window,'keyup',((e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase())})as EventListener);
  this.listen(window,'blur',()=>{this.keys.clear();this.fire=false;this.touchFire=false;this.stickMove={x:0,y:0}});
  this.listen(window,'resize',()=>this.renderer.resize());
  this.listen(canvas,'pointermove',((e:PointerEvent)=>{if(e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();this.pointer={x:e.clientX-r.left,y:e.clientY-r.top};this.renderer.pointer=this.pointer})as EventListener);
  this.listen(canvas,'pointerdown',((e:PointerEvent)=>{if(e.pointerType==='touch')return;audio.unlock();if(e.button===0){this.fire=true;this.fireTapped=true;}if(e.button===2)this.onPing()})as EventListener);
  this.listen(window,'pointerup',()=>{this.fire=false});this.listen(canvas,'contextmenu',e=>e.preventDefault());
  this.last=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t));
 }
 listen(target:EventTarget,type:string,fn:EventListener){target.addEventListener(type,fn);this.listeners.push({target,type,fn})}
 setSettings(s:Settings){this.settings=s;this.renderer.settings={shake:s.shake,quality:s.quality,haptics:s.haptics,color:s.color};this.renderer.quality=s.quality===2?.7:1;this.renderer.resize();this.audio.set(s.sound,s.music)}
 receive(s:Snapshot){
  this.snap=s;this.renderer.update(s);const me=s.players.find(p=>p.id===s.me);
  if(me){this.seq=Math.max(this.seq,me.seq);this.actionSeq=Math.max(this.actionSeq,(me as typeof me&{actionSeq?:number}).actionSeq??0);this.pending=this.pending.filter(p=>p.input.seq>me.seq);const corrected={x:me.x,y:me.y};for(const p of this.pending)move(corrected,p.input.mx,p.input.my,p.dt,SPEED*(s.adventure?1.18:1)*(me.loadout[me.slot]?WEAPONS[me.loadout[me.slot].kind].move:1));if(!this.prediction||dist(corrected,this.prediction)>7)this.prediction=corrected;else{this.prediction.x+=(corrected.x-this.prediction.x)*.3;this.prediction.y+=(corrected.y-this.prediction.y)*.3}}
 }
 act(key:'jump'|'reload'|'heal'|'swap'|'interact'|'dash'|'grenade',extra:Partial<Input>={}){this.actionSeq++;this.action={[key]:true,...extra};this.audio.unlock()}
 ping(kind:number){this.actionSeq++;const me=this.snap?.players.find(p=>p.id===this.snap?.me);const world=this.renderer.toWorld(this.pointer.x||this.renderer.width/2,this.pointer.y||this.renderer.height/2);this.action={ping:kind,px:kind===3?me?.x:world.x,py:kind===3?me?.y:world.y}}
 input():Input{
  const me=this.snap?.players.find(p=>p.id===this.snap?.me);let mx=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'))+this.stickMove.x,my=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'))+this.stickMove.y;
  const world=this.renderer.toWorld(this.pointer.x||this.renderer.width/2+100,this.pointer.y||this.renderer.height/2);const pos=this.prediction??me??{x:0,y:0};let aim=this.stickAim?Math.atan2(this.stickAim.y,this.stickAim.x):Math.atan2(world.y-pos.y,world.x-pos.x);let fire=this.fire||this.touchFire||this.fireTapped;
  if(me&&this.snap&&(this.settings.assist||this.settings.autoFire)){let target:typeof me|undefined,best=.18;for(const q of this.snap.players){if(!q.alive||q.team===me.team||q.phase!=='ground'||!lineOfSight(me,q))continue;const a=Math.atan2(q.y-pos.y,q.x-pos.x),d=Math.abs(angleDiff(a,aim));if(d<best&&dist(me,q)<WEAPONS[me.loadout[me.slot]?.kind??0].range){best=d;target=q}}if(target){const a=Math.atan2(target.y-pos.y,target.x-pos.x);if(this.settings.assist)aim+=angleDiff(a,aim)*.3;if(this.settings.autoFire&&Math.abs(angleDiff(a,aim))<.1)fire=true}}
  if(this.paused){mx=0;my=0;fire=false}
  return{...emptyInput(),...this.action,seq:++this.seq,actionSeq:this.actionSeq,mx:clamp(mx,-1,1),my:clamp(my,-1,1),aim,fire,interact:this.keys.has('e')||this.action.interact,revive:this.keys.has('f')||this.keys.has('revive')};
 }
 loop(now:number){
  if(this.closed)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;
  if(now-this.sent>=50){const i=this.input();this.network.input(i);this.fireTapped=false;this.pending.push({input:i,dt:.05});this.pending=this.pending.slice(-30);this.sent=now}
  const me=this.snap?.players.find(p=>p.id===this.snap?.me);const moving=this.keys.size>0||Math.hypot(this.stickMove.x,this.stickMove.y)>.1;
  if(me&&this.prediction&&me.alive&&me.phase==='ground'&&!this.paused){const i=this.pending[this.pending.length-1]?.input;if(i){const speed=me.knocked?44:SPEED*(this.snap?.adventure?1.18:1)*(me.loadout[me.slot]?WEAPONS[me.loadout[me.slot].kind].move:1)*(me.healing>0?.72:1);if(!i.revive)move(this.prediction,i.mx,i.my,dt,speed)}}
  this.renderer.predicted=this.prediction;this.renderer.draw(now);
  if(this.snap&&me){this.audio.update(this.snap.time,me.hp,this.snap.zone.stage,moving&&me.phase==='ground');if(now-this.hudAt>120){this.onHud(this.snap);this.hudAt=now}}
  this.frame=requestAnimationFrame(t=>this.loop(t));
 }
 close(){this.closed=true;cancelAnimationFrame(this.frame);for(const {target,type,fn}of this.listeners)target.removeEventListener(type,fn);this.listeners=[]}
}
