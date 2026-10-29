import {addHuman,createState,step,snapshot,sanitize,emptyInput,cleanName,type Input,type State,type Snapshot} from "./simulation.ts";
import {CAPACITY,TICK,CENTER} from "./data.ts";
import {createAdventure,stepAdventure} from './adventure.ts';
export type Profile={id:string;name:string;xp:number;matches:number;wins:number;defeats:number;revives:number;daily:{day?:string;matches?:number;defeats?:number;survival?:number;claimed?:string[]}};
export type Member={id:string;name:string;party:string;updated:number;xp:number};
type Peer={id:string;pc:RTCPeerConnection;state:RTCDataChannel|null;control:RTCDataChannel|null;generation:string;ice:RTCIceCandidateInit[];localCandidates:number;remoteCandidates:number;lastInput:number;lastSeq:number;lastPing:number;lag:number;created:number;};
type ApiReply={profile:Profile;token?:string;id:string;mode:number;host:string;code:string;checkpoint?:string;lease:number;members:Member[];signals:{id:number;sender:string;data:string}[];elected:boolean;serverTime:number;error?:string};
export async function api<T=ApiReply>(path:string,data?:unknown):Promise<T>{
 const token=sessionStorage.getItem('ef_token');
 const r=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:{...(token?{'X-Guest-Token':token}:{}),...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
 let result;try{result=await r.json()}catch{throw Error('The relay did not respond. Try again.')}
 if(!result||typeof result!=='object')throw Error('Invalid relay response.');
 if(!r.ok)throw Error(('error' in result&&typeof result.error==='string')?result.error:'The relay is busy.');return result as T;
}
export class MatchNetwork {
 profile:Profile;room='';mode=4;practiceSeed=0;adventure=false;paused=false;host='';partyCode='';earlyIce=new Map<string,RTCIceCandidateInit[]>();members:Member[]=[];peers=new Map<string,Peer>();sim:State|null=null;intents:Record<string,Input>={};arrivals:Record<string,number>={};parties:Record<string,number>={};
 onSnapshot:(s:Snapshot)=>void;onStatus:(s:string)=>void;onEnd:(s:Snapshot)=>void;
 timer:ReturnType<typeof setInterval>|null=null;polling=false;pollAt=0;after=0;closed=false;local=false;training=false;tickAt=0;snapshotAt=0;checkpointAt=0;rewarded=false;reportedDeaths=new Set<string>();lastSnapshot=0;lastStateTime=-1;backup:State|null=null;lastSentSeq=0;lastHostInput=emptyInput();migrationAt=0;startedAt=0;stats={rtt:0,bytes:0,snapshots:0,dropped:0,tickMs:0,sentSignals:0,receivedSignals:0,lastError:""};
 constructor(p:Profile,onSnapshot:(s:Snapshot)=>void,onStatus:(s:string)=>void,onEnd:(s:Snapshot)=>void){this.profile=p;this.onSnapshot=onSnapshot;this.onStatus=onStatus;this.onEnd=onEnd}
 async start(mode:number,party='',training=false,local=false,adventure=false){
  this.startedAt=performance.now();this.mode=mode;this.partyCode=party;this.training=training;this.adventure=adventure;this.local=training||local||adventure;this.closed=false;
  if(this.local){this.host=this.profile.id;this.members=[{id:this.profile.id,name:this.profile.name,party:this.profile.id,updated:Date.now(),xp:this.profile.xp}];this.becomeHost();this.onStatus(adventure?'Relic Run · solo expedition':training?'Training · local':'Solo practice · bots only')}
  else{
   this.onStatus('Finding your flight…');
   const saved=sessionStorage.getItem('ef_active');let response;
   if(saved){try{const old=JSON.parse(saved);if(Date.now()-old.at<650000){const r=await api('room?room='+encodeURIComponent(old.id));if(r){response={id:r.id,mode:r.mode,host:r.host,checkpoint:r.checkpoint};this.members=r.members}}}catch{sessionStorage.removeItem('ef_active')}}
   if(!response)response=await api('match',{mode,party});
   this.room=response.id;this.mode=response.mode;this.host=response.host;sessionStorage.setItem('ef_active',JSON.stringify({id:this.room,at:Date.now()}));
   if(this.host===this.profile.id){this.becomeHost(response.checkpoint);this.onStatus('Peer host · flight ready')}else this.onStatus('Connecting to the squad host…');
   void this.poll();
  }
  this.tickAt=performance.now();this.timer=setInterval(()=>this.loop(),25);
 }
 becomeHost(checkpoint?:string){
  this.host=this.profile.id;
  if(this.adventure){this.sim=createAdventure(this.practiceSeed||crypto.getRandomValues(new Uint32Array(1))[0],this.profile.id,this.profile.name);this.tickAt=performance.now();return;}
  if(checkpoint){try{this.sim=JSON.parse(checkpoint)}catch{this.sim=null}}
  if(!this.sim&&this.backup)this.sim=this.backup;
  if(!this.sim)this.sim=createState(this.local&&this.practiceSeed?this.practiceSeed:crypto.getRandomValues(new Uint32Array(1))[0],this.mode,this.training?16:CAPACITY,Math.min(1,this.profile.xp/5000),this.training);
  const me=addHuman(this.sim,this.profile.id,this.profile.name,this.members.find(m=>m.id===this.profile.id)?.party??(this.partyCode||this.profile.id),this.parties);
  if(this.training&&me){this.sim.time=0;me.phase='ground';me.x=CENTER;me.y=CENTER+140;me.alt=0;me.hp=75;me.invuln=999;me.loadout=[{kind:2,tier:1,mag:24}];me.armor=40;me.maxArmor=40;for(let i=0;i<this.sim.players.length;i++){const p=this.sim.players[i];if(p.bot){p.phase='ground';p.alt=0;p.x=CENTER-400+(i%8)*110;p.y=CENTER-220+Math.floor(i/8)*80;p.loadout=[];p.invuln=0;p.hp=60;p.goal={x:p.x,y:p.y}}}}
  this.tickAt=performance.now();this.checkpointAt=0;
 }
 async poll(){
  if(this.closed||this.local||this.polling||!this.room)return;this.polling=true;this.pollAt=performance.now();
  try{
   const d=await api(`room?room=${encodeURIComponent(this.room)}&after=${this.after}`);this.members=d.members;
   if(d.host!==this.host){if(this.sim&&d.host!==this.profile.id){this.backup=this.sim;this.sim=null}for(const peer of this.peers.values())peer.pc.close();this.peers.clear();this.host=d.host;this.lastStateTime=-1;if(this.host===this.profile.id)this.becomeHost(d.checkpoint);this.onStatus('Squad host recovered · reconnecting')}
   if(this.host===this.profile.id){
    if(!this.sim)this.becomeHost(d.checkpoint);
    if(this.sim&&this.sim.time<20)this.sim.difficulty=Math.min(1,this.members.reduce((v,m)=>v+m.xp,0)/Math.max(1,this.members.length)/5000);
    for(const m of this.members){const known=this.sim?.players.find(p=>p.id===m.id);if(known)this.parties[m.party]=known.team}
    for(const m of this.members)if(m.id!==this.profile.id&&d.serverTime-m.updated<60000){const peer=this.peers.get(m.id);if(!peer||peer.pc.connectionState==='failed'||peer.pc.connectionState==='closed'||(peer.pc.connectionState!=='connected'&&performance.now()-peer.created>30000)){void this.offer(m.id).catch(e=>{this.stats.lastError=e instanceof Error?e.message:'Offer failed'})}}
   }else if(d.serverTime>d.lease&&performance.now()-this.lastSnapshot>6000&&performance.now()-this.migrationAt>5000){
    this.migrationAt=performance.now();const election=await api('elect?room='+this.room,{});if(election.elected){this.becomeHost(election.checkpoint);for(const peer of this.peers.values())peer.pc.close();this.peers.clear();this.onStatus('Host recovered · your device leads the squad')}
   }
   for(const signal of d.signals){this.stats.receivedSignals++;this.after=Math.max(this.after,signal.id);try{await this.receiveSignal(signal.sender,JSON.parse(signal.data))}catch(e){this.stats.lastError=e instanceof Error?e.message:'Signal rejected';if(!this.sim)this.onStatus('Peer handshake: '+this.stats.lastError)}}
  }catch(e){this.stats.lastError=e instanceof Error?e.message:'Relay poll failed';if(!this.sim&&performance.now()-this.lastSnapshot>12000)this.onStatus(e instanceof Error?e.message:'Relay reconnecting…')}
  finally{this.polling=false}
 }
 async signal(to:string,data:unknown){try{await api('signal?room='+this.room,{to,data});this.stats.sentSignals++}catch(e){this.stats.lastError=e instanceof Error?e.message:'Signal could not be delivered'}}
 makePeer(id:string,generation:string,initiator:boolean){
  const old=this.peers.get(id);if(old)old.pc.close();
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],bundlePolicy:'max-bundle'});
  const peer:Peer={id,pc,state:null,control:null,generation,ice:[],localCandidates:0,remoteCandidates:0,lastInput:0,lastSeq:-1,lastPing:0,lag:0,created:performance.now()};this.peers.set(id,peer);
  let queued:RTCIceCandidateInit[]=[];let iceTimer:ReturnType<typeof setTimeout>|null=null;
  pc.onicecandidate=e=>{if(!e.candidate)return;peer.localCandidates++;queued.push(e.candidate.toJSON());if(!iceTimer)iceTimer=setTimeout(()=>{if(!this.closed&&this.peers.get(id)===peer)void this.signal(id,{type:'ice',generation,candidates:queued});queued=[];iceTimer=null},120)};
  pc.onicecandidateerror=e=>{this.stats.lastError='Connection candidate gathering failed ('+e.errorCode+'). This browser or network may block direct peers.'};
  pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==='complete'&&!peer.localCandidates)this.stats.lastError='This browser supplied no connection candidates. Solo practice is available.'};
  pc.ondatachannel=e=>this.channel(peer,e.channel);
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected'){this.onStatus(this.host===this.profile.id?'Peer host · squad connected':'Peer connected · live');if(this.sim){const m=this.members.find(m=>m.id===id);if(m)addHuman(this.sim,id,m.name,m.party,this.parties)}}else if(pc.connectionState==='failed')this.onStatus('Peer connection failed · retrying relay. Strict NAT may block this flight.')};
  if(initiator){this.channel(peer,pc.createDataChannel('state',{ordered:false,maxRetransmits:0}));this.channel(peer,pc.createDataChannel('control',{ordered:true}))}
  return peer;
 }
 channel(peer:Peer,channel:RTCDataChannel){
  if(channel.label==='state')peer.state=channel;else peer.control=channel;
  channel.onopen=()=>{if(this.sim){const m=this.members.find(m=>m.id===peer.id);if(m)addHuman(this.sim,peer.id,m.name,m.party,this.parties)}this.onStatus(this.host===this.profile.id?'Peer host · squad connected':'Live · connected to squad host')};
  channel.onmessage=e=>{if(typeof e.data!=='string'||e.data.length>180000)return;this.stats.bytes+=e.data.length;let d;try{d=JSON.parse(e.data)}catch{return}
   if(d.type==='input'&&this.sim){const i=sanitize(d.input);if(!i||i.seq<=peer.lastSeq)return;const now=performance.now();if(now-peer.lastInput<20)return;peer.lastSeq=i.seq;peer.lastInput=now;i.lag=Math.min(.15,peer.lag);this.intents[peer.id]=i;this.arrivals[peer.id]=now}
   if(d.type==='snapshot'&&!this.sim&&peer.id===this.host){if(d.state.time<=this.lastStateTime){this.stats.dropped++;return}this.lastStateTime=d.state.time;this.lastSnapshot=performance.now();this.stats.snapshots++;this.onSnapshot(d.state);if(d.state.ended)this.finish(d.state)}
   if(d.type==='ping'){this.send(peer.control,{type:'pong',at:d.at})}
   if(d.type==='pong'){const rtt=Math.max(0,performance.now()-d.at);peer.lag=Math.min(.15,rtt/2000);this.stats.rtt=Math.round(rtt)}
  };
 }
 async rtc<T>(promise:Promise<T>,label:string):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),3000)})])}finally{if(timer)clearTimeout(timer)}}
 async offer(id:string){const generation=crypto.randomUUID();const peer=this.makePeer(id,generation,true);const offer=await this.rtc(peer.pc.createOffer(),'Offer creation');await this.rtc(peer.pc.setLocalDescription(offer),'Local offer');void this.signal(id,{type:'offer',generation,sdp:offer})}
 async receiveSignal(id:string,d:{type:string;generation:string;sdp:RTCSessionDescriptionInit;candidates:RTCIceCandidateInit[]}){
  if(d.type==='offer'&&id===this.host&&this.host!==this.profile.id){const peer=this.makePeer(id,d.generation,false);await this.rtc(peer.pc.setRemoteDescription(d.sdp),'Remote description');for(const c of [...(this.earlyIce.get(id+'/'+d.generation)??[]),...peer.ice])try{await peer.pc.addIceCandidate(c);peer.remoteCandidates++}catch{}this.earlyIce.delete(id+'/'+d.generation);peer.ice=[];const answer=await this.rtc(peer.pc.createAnswer(),'Answer creation');await this.rtc(peer.pc.setLocalDescription(answer),'Local answer');void this.signal(id,{type:'answer',generation:d.generation,sdp:answer});return}
  const peer=this.peers.get(id);if(!peer||peer.generation!==d.generation){if(d.type==='ice')this.earlyIce.set(id+'/'+d.generation,[...(this.earlyIce.get(id+'/'+d.generation)??[]),...d.candidates].slice(-20));return;}
  if(d.type==='answer'&&peer.pc.signalingState==='have-local-offer'){await this.rtc(peer.pc.setRemoteDescription(d.sdp),'Remote description');for(const c of peer.ice){await peer.pc.addIceCandidate(c);peer.remoteCandidates++}peer.ice=[]}
  if(d.type==='ice'){for(const c of d.candidates){if(peer.pc.remoteDescription)try{await peer.pc.addIceCandidate(c);peer.remoteCandidates++}catch{}else peer.ice.push(c)}}
 }
 send(channel:RTCDataChannel|null,data:unknown){if(channel?.readyState!=='open')return;try{if(channel.bufferedAmount>160000){this.stats.dropped++;return}channel.send(JSON.stringify(data))}catch{this.stats.dropped++}}
 input(raw:Input){
  const i=sanitize(raw);if(!i)return;this.lastSentSeq=i.seq;this.lastHostInput=i;
  if(this.sim){this.intents[this.profile.id]=i;this.arrivals[this.profile.id]=performance.now()}
  else this.send(this.peers.get(this.host)?.state??null,{type:'input',input:i});
 }
 loop(){
  if(this.closed)return;const now=performance.now();
  if(this.paused&&this.adventure){this.tickAt=now;return;}
  if(!this.local&&now-this.pollAt>850)void this.poll();
  if(this.sim){
   const begin=performance.now();let count=0;
   while(now-this.tickAt>=TICK*1000&&count<40){
    const inputs:Record<string,Input>={};for(const [id,i] of Object.entries(this.intents))if(now-(this.arrivals[id]??0)<350)inputs[id]=i;
    if(this.sim.adventure)stepAdventure(this.sim,TICK,inputs);else step(this.sim,TICK,inputs);this.tickAt+=TICK*1000;count++;
   }
   if(now-this.tickAt>2000)this.tickAt=now;
   this.stats.tickMs=performance.now()-begin;
   if(now-this.snapshotAt>=100){
    this.snapshotAt=now;const own=snapshot(this.sim,this.profile.id,this.sim.players.find(p=>p.id===this.profile.id)?.seq??0);this.onSnapshot(own);this.stats.snapshots++;
    for(const peer of this.peers.values())this.send(peer.state,{type:'snapshot',state:snapshot(this.sim,peer.id,this.sim.players.find(p=>p.id===peer.id)?.seq??0)});
    if(!this.local){const dead=this.sim.players.filter(p=>!p.bot&&!p.alive&&!this.reportedDeaths.has(p.id));if(dead.length){for(const p of dead)this.reportedDeaths.add(p.id);void api('reward?room='+this.room,{result:{winner:null,ended:false,players:dead.map(p=>({id:p.id,team:p.team,defeats:p.defeats,revives:p.revives,survived:p.survived,placement:p.placement}))}}).catch(()=>{for(const p of dead)this.reportedDeaths.delete(p.id)})}}
    if(this.sim.ended)this.finish(own);
   }
   if(!this.local&&now-this.checkpointAt>4000){this.checkpointAt=now;const state={...this.sim,events:[],history:[]};for(const peer of this.peers.values())this.send(peer.control,{type:'ping',at:now});void api('checkpoint?room='+this.room,{state}).catch(()=>{})}
  }else if(now-this.lastSnapshot>1000){if(!this.lastSnapshot&&now-this.startedAt>12000&&!this.stats.lastError)this.onStatus('Direct connection is taking too long. Solo practice is ready.');const peer=this.peers.get(this.host);if(peer&&now-peer.lastPing>2000){this.send(peer.control,{type:'ping',at:now});peer.lastPing=now}}
 }
 finish(s:Snapshot){
  if(this.rewarded)return;this.rewarded=true;sessionStorage.removeItem('ef_active');
  if(!this.local&&this.sim)void api('reward?room='+this.room,{result:{winner:this.sim.winner,ended:true,players:this.sim.players.map(p=>({id:p.id,team:p.team,defeats:p.defeats,revives:p.revives,survived:p.survived,placement:p.placement}))}}).catch(()=>{});
  this.onEnd(s);
 }
 close(leave=false){this.closed=true;if(this.timer)clearInterval(this.timer);for(const p of this.peers.values())p.pc.close();this.peers.clear();this.earlyIce.clear();if(leave)sessionStorage.removeItem('ef_active')}
}
