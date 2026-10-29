import asyncio,json,time,statistics,pathlib
from websockets.asyncio.client import connect
URL='wss://emberfall-squads.daintypear3.chatgpt.site/api/probe'
async def main():
 rows=[]
 async def client(i):
  started=time.perf_counter();
  async with connect(URL,origin='https://emberfall-squads.daintypear3.chatgpt.site',open_timeout=25) as ws:
   rows.append({'client':i,'open_ms':round((time.perf_counter()-started)*1000,2)})
   await ws.send(json.dumps({'op':'inc','t':time.time()*1000}))
   end=time.perf_counter()+18
   while time.perf_counter()<end:
    try:
     d=json.loads(await asyncio.wait_for(ws.recv(),timeout=3));d['client']=i
     if d.get('t'):d['rtt']=time.time()*1000-d['t']
     rows.append(d)
    except asyncio.TimeoutError:rows.append({'client':i,'timeout':True});break
 await asyncio.gather(client(0),client(1))
 ticks=[r for r in rows if r.get('type')=='tick'];rtts=[r['rtt'] for r in rows if 'rtt'in r]
 result={'connections':[r for r in rows if 'open_ms'in r],'isolates':list(set(r['isolate']for r in rows if'isolate'in r)),'ticks':len(ticks),'mean_gap':statistics.mean(r['gap']for r in ticks)if ticks else None,'max_gap':max((r['gap']for r in ticks),default=None),'mean_rtt':statistics.mean(rtts)if rtts else None,'shared_counter':max((r.get('sharedCounter',0)for r in rows),default=0),'timeouts':sum(bool(r.get('timeout'))for r in rows)}
 pathlib.Path('evidence/probe.json').write_text(json.dumps({'summary':result,'rows':rows},indent=2));print(json.dumps(result,indent=2))
asyncio.run(main())
