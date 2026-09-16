import {currentUser} from "@/lib/auth";
import {load} from "@/lib/store";
import {AppError,setupIncomplete,SETUP_MESSAGE} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
import {exportAll,restoreAll,fileName,CONFIRM} from "@/lib/backup";

export const dynamic="force-dynamic";
const MAX_UPLOAD=8_000_000; // 백업 파일 상한. 이보다 크면 브라우저로 올릴 방법을 다시 생각해야 한다.
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});

// 백업은 서비스 운영자만 다룬다. 화면에서 숨기는 것으로는 부족하므로 서버에서 확인한다.
async function owner(req:Request){
 const user=await currentUser(req);
 if(!user)throw new AppError("먼저 로그인해주세요.",401);
 const {state}=await load();
 const ownerId=state.settings.find(x=>x.id==="owner")?.userId;
 if(!ownerId||ownerId!==user.userId)throw new AppError("서비스 운영자만 쓸 수 있어요.",403);
 return user;
}

function fail(e:unknown,fallback:string){
 console.error("TeamKick backup",e instanceof AppError?e.message:e);
 return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:fallback},e instanceof AppError?e.status:503);
}

export async function GET(req:Request){
 try{
  await ensureSchema();await owner(req);
  const body=JSON.stringify(await exportAll(),null,1);
  return new Response(body,{headers:{
   "Content-Type":"application/json; charset=utf-8",
   "Content-Disposition":'attachment; filename="'+fileName()+'"',
   "Cache-Control":"no-store",
  }});
 }catch(e){return fail(e,"백업 파일을 만들지 못했어요. 잠시 후 다시 시도해주세요.")}
}

export async function POST(req:Request){
 try{
  await ensureSchema();
  const origin=req.headers.get("origin");
  if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  await owner(req);
  const raw=await req.text();
  if(raw.length>MAX_UPLOAD)throw new AppError("백업 파일이 너무 커요. 도움을 받아 복원해야 해요.",413);
  let sent:{confirm?:unknown;file?:unknown};
  try{sent=JSON.parse(raw)}catch{throw new AppError("백업 파일을 읽지 못했어요.")}
  // 되돌릴 수 없는 작업이라 확인 문구를 직접 입력하게 한다.
  if(String(sent?.confirm??"").trim()!==CONFIRM)throw new AppError('복원하려면 "'+CONFIRM+'"을 그대로 입력해주세요.');
  return json({ok:true,...await restoreAll(sent?.file)});
 }catch(e){return fail(e,"복원하지 못했어요. 파일을 확인한 뒤 다시 시도해주세요.")}
}
