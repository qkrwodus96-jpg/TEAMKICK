import {currentUser} from "@/lib/auth";
import {AppError,setupIncomplete,SETUP_MESSAGE} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
import {pushReady,pushPublicKey,saveSubscription,removeSubscription,subscriptionsOf} from "@/lib/push";

export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});

// 브라우저가 구독을 만들려면 공개키가 필요하다. 공개키는 이름 그대로 공개해도 된다.
export async function GET(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);
  return json({ready:pushReady(),key:pushPublicKey(),
   devices:user?(await subscriptionsOf(user.userId)).length:0});
 }catch(e){return json({ready:false,key:"",devices:0,error:setupIncomplete(e)?SETUP_MESSAGE:undefined})}
}

export async function POST(req:Request){
 try{
  await ensureSchema();
  const origin=req.headers.get("origin");
  if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const user=await currentUser(req);
  if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const raw=await req.text();
  if(raw.length>4000)throw new AppError("입력 내용이 너무 커요.",413);
  let body:{action?:unknown;subscription?:{endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}};endpoint?:unknown};
  try{body=JSON.parse(raw)}catch{throw new AppError("입력 형식을 확인해주세요.")}
  if(body?.action==="subscribe"){
   if(!pushReady())throw new AppError("알림이 아직 설정되지 않았어요.",503);
   await saveSubscription(user.userId,body.subscription??{});
   return json({ok:true,devices:(await subscriptionsOf(user.userId)).length});
  }
  if(body?.action==="unsubscribe"){
   await removeSubscription(user.userId,String(body.endpoint??""));
   return json({ok:true,devices:(await subscriptionsOf(user.userId)).length});
  }
  throw new AppError("지원하지 않는 작업이에요.");
 }catch(e){
  console.error("TeamKick push",e instanceof AppError?e.message:e);
  return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:"알림 설정을 저장하지 못했어요."},
   e instanceof AppError?e.status:503);
 }
}
