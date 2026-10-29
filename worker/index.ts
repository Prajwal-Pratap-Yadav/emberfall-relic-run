import handler from "vinext/server/fetch-handler";
import { cleanName } from "../game/simulation.ts";
import { MAX_HUMANS } from "../game/data.ts";
import { handleApi } from "./service.ts";
export default {
 async fetch(request:Request,env:{DB:D1Database},ctx:ExecutionContext){
  const url=new URL(request.url);
  if(url.pathname.startsWith("/api/")){
   try{return await handleApi(request,env.DB,url)}catch(e){console.error("Emberfall service error",e instanceof Error?e.message:"unknown");return Response.json({error:"The relay is busy. Try again in a moment."},{status:503,headers:{"Cache-Control":"no-store"}})}
  }
  return handler.fetch(request,env,ctx);
 }
};
