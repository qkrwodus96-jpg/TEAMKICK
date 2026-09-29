import {load,commit} from "@/lib/store";
import {gameReminders,iso,pushTargets} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
import {wakeDevices} from "@/lib/push";
import {cronAuthorized,cronReady} from "@/lib/cron";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});

// 예약 실행. cron-job.org 가 10분마다 부른다(GET·POST 모두 받는다).
// 지금 하는 일: 3시간 안에 시작하는 경기의 팀원·용병에게 "오늘 경기" 알림을 한 번 보낸다.
// 응답에는 숫자만 담는다(누구에게 보냈는지는 담지 않는다).
async function run(req:Request){
 try{
  await ensureSchema();
  if(!cronReady())return json({ok:false,error:"CRON_SECRET 이 없거나 16자보다 짧아요."},503);
  if(!await cronAuthorized(req))return json({ok:false,error:"unauthorized"},401);
  for(let attempt=0;attempt<4;attempt++){
   const now=Date.now();const {state,version}=await load();const after=structuredClone(state);
   const {sides}=gameReminders(after,now);
   if(!sides)return json({ok:true,at:iso(now),reminded:0,people:0});
   try{await commit(state,after,version)}
   catch(e){if(String(e).includes("revision_matches")||String(e).includes("CHECK constraint")){if(attempt<3)continue}throw e}
   const had=new Set(state.notifications.map(x=>x.id));
   const woken=pushTargets(after,after.notifications.filter(x=>!had.has(x.id)),now);
   const d=woken.length?await wakeDevices(woken).catch(e=>{console.error("TeamKick cron push",e);return null}):null;
   return json({ok:true,at:iso(now),reminded:sides,people:woken.length,sent:d?.sent??0,failed:d?.failed??0});
  }
  return json({ok:false,error:"busy"},409);
 }catch(e){console.error("TeamKick cron",e);return json({ok:false,error:"cron failed"},503)}
}
export const GET=run;
export const POST=run;
