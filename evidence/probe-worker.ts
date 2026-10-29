import handler from "vinext/server/fetch-handler";
import { DurableObject } from "cloudflare:workers";
export class LiveRoom extends DurableObject {
  async fetch(request:Request) {
    const value=(await this.ctx.storage.get<number>("counter")??0)+1;
    await this.ctx.storage.put("counter",value);
    return Response.json({durable:true,value});
  }
}
let isolate = "";
const peers = new Set<WebSocket>();
let sharedCounter = 0;
const started = Date.now();
export default {
  async fetch(request: Request, env: Record<string, unknown> & {DB:D1Database}, ctx: ExecutionContext) {
    isolate ||= crypto.randomUUID();
    const url = new URL(request.url);
    if(url.pathname==="/api/durable-probe") {
      const rooms=env.ROOMS as DurableObjectNamespace|undefined;
      if(!rooms)return Response.json({durable:false,bindings:Object.keys(env)},{status:501});
      return rooms.get(rooms.idFromName("shared-probe")).fetch(request);
    }
    if (url.pathname === "/api/probe") {
      if (request.headers.get("Upgrade") !== "websocket") return Response.json({ isolate, sharedCounter, uptime: Date.now() - started, bindings: Object.keys(env), durableObjects: !!env.ROOMS });
      const pair = new WebSocketPair(); const server = pair[1]; server.accept(); peers.add(server);
      let ticks = 0; let previous = Date.now();
      const interval = setInterval(() => { const now = Date.now(); try { server.send(JSON.stringify({ type: "tick", isolate, ticks: ++ticks, gap: now - previous, peers: peers.size, sharedCounter })); } catch { clearInterval(interval); peers.delete(server); } previous = now; }, 50);
      server.addEventListener("message", event => {
        let input: {t?:number;op?:string} = {}; try { input = JSON.parse(String(event.data)); } catch { return; }
        if (input.op === "inc") sharedCounter++;
        const payload = JSON.stringify({ type: "echo", isolate, t: input.t, sharedCounter, peers: peers.size });
        for (const peer of peers) { try { peer.send(payload); } catch { peers.delete(peer); } }
      });
      server.addEventListener("close", () => { clearInterval(interval); peers.delete(server); });
      server.addEventListener("error", () => { clearInterval(interval); peers.delete(server); });
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (url.pathname === "/api/shared-probe") {
      await env.DB.prepare("INSERT OR IGNORE INTO probe (id,value,joins,updated,payload) VALUES ('live',0,0,0,?)").bind("s".repeat(48000)).run();
      if (request.headers.get("Upgrade") !== "websocket") return Response.json(await env.DB.prepare("SELECT value,joins,updated,length(payload) bytes FROM probe WHERE id='live'").first());
      const pair = new WebSocketPair();const server=pair[1];server.accept();
      await env.DB.prepare("UPDATE probe SET joins=joins+1 WHERE id='live'").run();
      let closed=false,busy=false;
      const interval=setInterval(async()=>{if(closed||busy)return;busy=true;const begin=Date.now();try{
        await env.DB.prepare("UPDATE probe SET value=value+1,updated=? WHERE id='live' AND updated<?").bind(begin,begin-48).run();
        const row=await env.DB.prepare("SELECT * FROM probe WHERE id='live'").first();
        server.send(JSON.stringify({type:"shared",isolate,value:row?.value,joins:row?.joins,at:row?.updated,db_ms:Date.now()-begin,bytes:String(row?.payload).length}));
      }catch(e){try{server.send(JSON.stringify({error:String(e)}))}catch{closed=true;clearInterval(interval)}}finally{busy=false}},50);
      server.addEventListener("message",e=>{try{const d=JSON.parse(String(e.data));server.send(JSON.stringify({type:"pong",t:d.t}))}catch{}});
      server.addEventListener("close",()=>{closed=true;clearInterval(interval)});
      return new Response(null,{status:101,webSocket:pair[0]});
    }
    if (url.pathname === "/probe") return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><title>Emberfall live transport probe</title><style>body{background:#0b1719;color:#edeee3;font:16px system-ui;padding:40px}button{padding:18px;background:#ffae65;border:0;border-radius:4px;font-weight:bold}pre{white-space:pre-wrap}</style><h1>EMBERFALL · live hosting probe</h1><p>Two independent WebSockets. One shared counter. 20 Hz timer.</p><button id="start">Run 15-second transport test</button><pre id="out">Ready</pre><script>let sockets=[],stats={};start.onclick=()=>{sockets.forEach(s=>s.close());stats={ticks:0,gaps:[],rtts:[],isolates:[],counter:0,opened:0};sockets=[0,1].map(i=>{const s=new WebSocket(location.origin.replace('http','ws')+'/api/probe');s.onopen=()=>{stats.opened++;s.send(JSON.stringify({op:'inc',t:Date.now()}))};s.onmessage=e=>{const d=JSON.parse(e.data);if(!stats.isolates.includes(d.isolate))stats.isolates.push(d.isolate);if(d.type==='tick'){stats.ticks++;stats.gaps.push(d.gap)}else{if(d.t)stats.rtts.push(Date.now()-d.t);stats.counter=d.sharedCounter}out.textContent=JSON.stringify({...stats,gaps:undefined,rtts:undefined,meanGap:stats.gaps.reduce((a,b)=>a+b,0)/stats.gaps.length,maxGap:Math.max(...stats.gaps),meanRTT:stats.rtts.reduce((a,b)=>a+b,0)/stats.rtts.length},null,2)};return s});setTimeout(()=>{sockets.forEach(s=>s.send(JSON.stringify({op:'inc',t:Date.now()})));},14000);setTimeout(()=>{sockets.forEach(s=>s.close());out.textContent+='\\nCompleted. Sockets closed.'},15000)};</script>`, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" } });
    return handler.fetch(request, env, ctx);
  },
};
