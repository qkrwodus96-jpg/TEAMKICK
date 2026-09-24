import {currentUser,accountExists,closeAccount,clearedCookie} from "@/lib/auth";
import {storageReady} from "@/lib/images";
import {placeSearchReady} from "@/lib/places";
import {mailReady} from "@/lib/mail";
import {load,commit} from "@/lib/store";
import {applyCommand,visibleState,AppError,iso,id,prune,setupIncomplete,SETUP_MESSAGE} from "@/lib/model";
import {checkOwnerCode} from "@/lib/owner-config";
import {ensureSchema} from "@/lib/schema";
import {kakaoReady} from "@/lib/kakao";
import {socialReady} from "@/lib/social";
import {emailSignupEnabled} from "@/lib/signup-policy";
import {wakeDevices,devicesAmong,pushReady} from "@/lib/push";
export const dynamic="force-dynamic";
const json=(x:any,status=200,cookie?:string)=>Response.json(x,{status,headers:cookie?{"Cache-Control":"no-store","Set-Cookie":cookie}:{"Cache-Control":"no-store"}});
export async function GET(req:Request){try{await ensureSchema();const user=await currentUser(req);if(!user)return json({user:null,mailReady:mailReady(),emailSignupEnabled:emailSignupEnabled(),kakaoReady:kakaoReady(),googleReady:socialReady("google"),naverReady:socialReady("naver")});const {state}=await load();const teamId=new URL(req.url).searchParams.get("team")??undefined;const token=new URL(req.url).searchParams.get("invite");const invite=state.invites.find(x=>x.id===token&&x.active&&Date.parse(x.expires)>Date.now());
 // 기록된 운영자의 계정이 사라졌으면 다시 등록할 수 있어야 한다. 그렇지 않으면 아무도 운영자가 될 수 없다.
 const ownerId=state.settings.find(x=>x.id==="owner")?.userId;
 const ownerMissing=!!ownerId&&ownerId!==user.userId&&!(await accountExists(ownerId));
 return json({storageReady:storageReady(),ownerMissing,placeSearchReady:placeSearchReady(),mailReady:mailReady(),emailSignupEnabled:emailSignupEnabled(),kakaoReady:kakaoReady(),googleReady:socialReady("google"),naverReady:socialReady("naver"),needsVerification:mailReady()&&!user.verified,invitedTeam:invite?.teamId??null,user:{id:user.userId,name:state.users.find(x=>x.id===user.userId)?.name??user.fullName??"팀원",provider:user.provider??"local"},...visibleState(state,user.userId,teamId)});}catch(e){console.error("TeamKick load",e);return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:"데이터를 불러오지 못했어요. 다시 시도해주세요."},e instanceof AppError?e.status:503)}}
export async function POST(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const raw=await req.text();if(raw.length>30000)throw new AppError("입력 내용이 너무 커요.",413);let c:any;try{c=JSON.parse(raw)}catch{throw new AppError("입력 형식을 확인해주세요.")}if(!c||typeof c!=="object"||!c.mutationId||typeof c.mutationId!=="string"||c.mutationId.length>100)throw new AppError("요청 정보를 확인해주세요.");
  const setup=c.type==="setupOwner"?await checkOwnerCode(c.code):false;
  // 저장 응답에 새 화면 상태를 함께 실어 보낸다. 그래야 화면이 저장 뒤에 다시
  // 읽어올 필요가 없다(왕복 두 번 -> 한 번). 명령에 팀이 없는 경우
  // (알림 읽음 처리 등) 화면이 보고 있던 팀을 viewTeam 으로 알려준다.
  // 명령의 대상 팀(c.teamId)이 먼저다. viewTeam 은 보는 기준일 뿐 권한과 무관하며,
  // visibleState 가 그 팀에 속하지 않은 사용자에게는 어차피 아무것도 주지 않는다.
  const seen=c.teamId||(typeof c.viewTeam==="string"&&c.viewTeam?c.viewTeam:undefined);
  for(let attempt=0;attempt<4;attempt++){
   const {state,version}=await load();const previous=state.receipts.find(x=>x.id===user.userId+":"+c.mutationId);if(previous)return json({ok:true,output:previous.output,...visibleState(state,user.userId,seen)});
   if(state.audit.filter(x=>x.actor===user.userId&&Date.parse(x.at)>Date.now()-60000).length>=40)throw new AppError("잠시 후 다시 시도해주세요.",429);
   const ownerId=state.settings.find(x=>x.id==="owner")?.userId;
   const ownerReset=c.type==="setupOwner"&&!!ownerId&&ownerId!==user.userId&&!(await accountExists(ownerId));
   const after=structuredClone(state);const output=applyCommand(after,{id:user.userId,name:user.fullName??state.users.find(x=>x.id===user.userId)?.name??"팀원",ownerSetup:setup,ownerReset,verified:!mailReady()||!!user.verified},c);
   after.receipts.push({id:user.userId+":"+c.mutationId,output,at:iso()});prune(after);
   try{
    await commit(state,after,version);
    if(c.type==="closeAccount"){await closeAccount(user.userId);return json({ok:true,closed:true},200,clearedCookie())}
    // 저장이 끝난 뒤에만 기기를 깨운다. 실패해도 저장을 되돌리지 않는다.
    // 이번 저장으로 새로 생긴 알림을 받은 사람만 대상이다.
    const had=new Set(state.notifications.map(x=>x.id));
    const woken=[...new Set(after.notifications.filter(x=>!had.has(x.id)&&x.userId!==user.userId).map(x=>String(x.userId)))];
    // 실제 알림도 시험 발송과 **똑같이 끝까지 기다린다.** 1.9.3~1.9.6 은 응답을 먼저 돌려주고
    // 나머지를 실행기(waitUntil)에 맡겼는데, 운영 호스트에서 그게 지켜지는지 확인할 방법이
    // 없었고 실제 알림만 안 왔다. 시험 발송은 끝까지 기다려서 늘 됐다. 저장이 조금 늦더라도
    // 확실히 보내는 쪽을 고른다(한 기기 최대 4초, 대개 1초 안).
    const delivery=woken.length?await wakeDevices(woken).catch(e=>{console.error("TeamKick push",e);return null}):null;
    // 알림이 몇 명에게 갔고, 폰 알림을 켠 사람이 몇 명이고, 푸시 서버가 몇 통을 받았는지(숫자만).
    // 실패가 있으면 첫 실패의 푸시 서버와 답(상태 번호)만 붙인다 — 누구인지는 담지 않는다.
    const bad=delivery?.results?.find(r=>!r.ok);
    const pushed=woken.length?{people:woken.length,withDevice:pushReady()?await devicesAmong(woken).catch(()=>-1):0,
     sent:delivery?.sent??0,failed:delivery?.failed??0,
     ...(bad?{reason:(bad.host||"푸시 서버")+" "+(bad.status||"응답 없음")}:{})}:undefined;
    return json({ok:true,output,...(pushed?{pushed}:{}),...visibleState(after,user.userId,seen)});
   }catch(e){if(String(e).includes("revision_matches")||String(e).includes("CHECK constraint")){if(attempt<3)continue;throw new AppError("다른 변경이 먼저 저장되었어요. 새로고침 후 다시 시도해주세요.",409)}throw e}
  }
 }catch(e){console.error("TeamKick mutation",e instanceof AppError?e.message:e);return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:"저장하지 못했어요. 입력 내용을 유지한 채 다시 시도해주세요."},e instanceof AppError?e.status:503)}
 return json({error:"저장 요청을 다시 시도해주세요."},409);
}
