import {currentUser,accountExists,closeAccount,clearedCookie} from "@/lib/auth";
import {storageReady} from "@/lib/images";
import {placeSearchReady} from "@/lib/places";
import {mailReady} from "@/lib/mail";
import {load,commit} from "@/lib/store";
import {applyCommand,visibleState,AppError,iso,id,setupIncomplete,SETUP_MESSAGE,errorHint} from "@/lib/model";
import {OWNER_SETUP_HASH} from "@/lib/owner-config";
import {ensureSchema} from "@/lib/schema";
import {kakaoReady} from "@/lib/kakao";
export const dynamic="force-dynamic";
const json=(x:any,status=200,cookie?:string)=>Response.json(x,{status,headers:cookie?{"Cache-Control":"no-store","Set-Cookie":cookie}:{"Cache-Control":"no-store"}});
export async function GET(req:Request){try{await ensureSchema();const user=await currentUser(req);if(!user)return json({user:null,mailReady:mailReady(),kakaoReady:kakaoReady()});const {state}=await load();const teamId=new URL(req.url).searchParams.get("team")??undefined;const token=new URL(req.url).searchParams.get("invite");const invite=state.invites.find(x=>x.id===token&&x.active&&Date.parse(x.expires)>Date.now());return json({storageReady:storageReady(),placeSearchReady:placeSearchReady(),mailReady:mailReady(),kakaoReady:kakaoReady(),needsVerification:mailReady()&&!user.verified,invitedTeam:invite?.teamId??null,user:{id:user.userId,name:state.users.find(x=>x.id===user.userId)?.name??user.fullName??"팀원"},...visibleState(state,user.userId,teamId)});}catch(e){console.error("TeamKick load",e);return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:"데이터를 불러오지 못했어요. 다시 시도해주세요."},e instanceof AppError?e.status:503)}}
export async function POST(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const raw=await req.text();if(raw.length>30000)throw new AppError("입력 내용이 너무 커요.",413);let c:any;try{c=JSON.parse(raw)}catch{throw new AppError("입력 형식을 확인해주세요.")}if(!c||typeof c!=="object"||!c.mutationId||typeof c.mutationId!=="string"||c.mutationId.length>100)throw new AppError("요청 정보를 확인해주세요.");
  let setup=false;if(c.type==="setupOwner"){const b=new TextEncoder().encode(String(c.code??""));const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",b))).map(x=>x.toString(16).padStart(2,"0")).join("");setup=digest===OWNER_SETUP_HASH;}
  for(let attempt=0;attempt<4;attempt++){
   const {state,version}=await load();const previous=state.receipts.find(x=>x.id===user.userId+":"+c.mutationId);if(previous)return json({ok:true,output:previous.output,...visibleState(state,user.userId,c.teamId)});
   if(state.audit.filter(x=>x.actor===user.userId&&Date.parse(x.at)>Date.now()-60000).length>=40)throw new AppError("잠시 후 다시 시도해주세요.",429);
   const ownerId=state.settings.find(x=>x.id==="owner")?.userId;
   const ownerReset=c.type==="setupOwner"&&!!ownerId&&ownerId!==user.userId&&!(await accountExists(ownerId));
   const after=structuredClone(state);const output=applyCommand(after,{id:user.userId,name:user.fullName??state.users.find(x=>x.id===user.userId)?.name??"팀원",ownerSetup:setup,ownerReset,verified:!mailReady()||!!user.verified},c);
   after.receipts.push({id:user.userId+":"+c.mutationId,output,at:iso()});after.receipts=after.receipts.filter(x=>Date.parse(x.at)>Date.now()-7*864e5);
   try{await commit(state,after,version);if(c.type==="closeAccount"){await closeAccount(user.userId);return json({ok:true,closed:true},200,clearedCookie())}return json({ok:true,output,...visibleState(after,user.userId,c.teamId)});}catch(e){if(String(e).includes("revision_matches")||String(e).includes("CHECK constraint")){if(attempt<3)continue;throw new AppError("다른 변경이 먼저 저장되었어요. 새로고침 후 다시 시도해주세요.",409)}throw e}
  }
 }catch(e){console.error("TeamKick mutation",e instanceof AppError?e.message:e);return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:"저장하지 못했어요. 입력 내용을 유지한 채 다시 시도해주세요."+errorHint(e)},e instanceof AppError?e.status:503)}
 return json({error:"저장 요청을 다시 시도해주세요."},409);
}
