import { clamp } from "./simulation.ts";
/** Every sound is synthesized locally. No audio files, sampling or network calls. */
export class GameAudio {
 ctx:AudioContext|null=null;master:GainNode|null=null;enabled=true;music=true;lastBeat=0;lastStep=0;lastMusic=0;
 unlock(){try{if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.32;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-18;this.master.connect(limiter);limiter.connect(this.ctx.destination)}void this.ctx.resume()}catch{/* Silent gameplay remains available when the browser denies sound. */}}
 set(on:boolean,music:boolean){this.enabled=on;this.music=music;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(on?.32:0,this.ctx.currentTime,.08)}
 tone(f:number,duration:number,volume=.1,pan=0,type:OscillatorType="sine",end?:number){
  const c=this.ctx;if(!c||!this.master||!this.enabled)return;const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=type;o.frequency.setValueAtTime(f,c.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(10,end),c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);p.pan.value=clamp(pan,-1,1);o.connect(g);g.connect(p);p.connect(this.master);o.start();o.stop(c.currentTime+duration+.02);
 }
 noise(duration:number,volume:number,pan=0,low=1500){
  const c=this.ctx;if(!c||!this.master||!this.enabled)return;const b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=b.getChannelData(0);let noise=0;for(let i=0;i<data.length;i++){noise=(noise+(Math.random()*2-1)*.5)/1.5;data[i]=noise*(1-i/data.length)}const source=c.createBufferSource(),g=c.createGain(),p=c.createStereoPanner(),filter=c.createBiquadFilter();source.buffer=b;g.gain.value=volume;p.pan.value=clamp(pan,-1,1);filter.type="lowpass";filter.frequency.value=low;source.connect(filter);filter.connect(g);g.connect(p);p.connect(this.master);source.start();
 }
 shot(kind:number,pan:number,distance:number){const v=clamp(1-distance/1100,.03,1);this.noise(kind===4?.19:.09,v*.48,pan,kind===3?900:2600);this.tone(kind===3?150:kind===1?300:210,.12,.22*v,pan,"triangle",45)}
 hit(){this.tone(1150,.05,.2,0,"sine",700)}
 pickup(){this.tone(520,.11,.08);this.tone(780,.16,.07)}
 blast(pan=0){this.noise(.5,.7,pan,650);this.tone(95,.45,.4,pan,'sawtooth',24)}
 dash(){this.noise(.18,.22,0,3200);this.tone(180,.16,.1,0,'triangle',750)}
 siren(){this.tone(260,.9,.1,0,"sine",620);this.tone(390,1.1,.055,0,"triangle",220)}
 win(){[330,415,494,660].forEach((f,i)=>setTimeout(()=>this.tone(f,1,.15,0,"triangle"),i*120))}
 update(time:number,hp:number,stage:number,moving:boolean){
  if(hp>0&&hp<30&&time-this.lastBeat>.7){this.tone(62,.14,.18);setTimeout(()=>this.tone(53,.18,.13),160);this.lastBeat=time}
  if(moving&&time-this.lastStep>.36){this.noise(.045,.055,0,450);this.lastStep=time}
  if(this.music&&time-this.lastMusic>(stage>3?.65:1.3)){const notes=[82.41,110,123.47,98];this.tone(notes[Math.floor(time/(stage>3?.65:1.3))%4],1.4,.027,0,"sine");if(stage>2)this.tone(164.82,.2,.025,0,"triangle");this.lastMusic=time}
 }
 close(){if(this.ctx)void this.ctx.close();this.ctx=null}
}
