import {revision,scopeToken} from "@/lib/store";
import {currentUserCached} from "@/lib/auth";
import {ensureSchema} from "@/lib/schema";

// 1.19 실시간 반영(사장님 요청 — "새로고침해야 보여서 불편"). 화면이 열려 있는 동안 주기적으로 부른다.
// 저장 번호만 돌려준다. 내용은 없다 — 바뀌었으면 화면이 /api/app 으로 자기 몫을 다시 읽는다.
// 1.24: ?s=pub,t:<팀>,u:<나> 처럼 범위를 주면 그 범위들의 번호만 이어서 돌려준다(token).
// 다른 팀의 투표·공지 때문에 내 화면이 다시 읽지 않는다. 번호뿐이라 범위를 화면이 정해도 새는 것은 없다.
// 다만 남의 계정 범위(u:)는 볼 이유가 없으니 내 것만 받는다.
export async function GET(req:Request){
 try{
  await ensureSchema();
  const user=await currentUserCached(req);
  if(!user)return Response.json({error:"먼저 로그인해주세요."},{status:401,headers:{"Cache-Control":"no-store"}});
  const raw=new URL(req.url).searchParams.get("s");
  if(raw!=null){
   const scopes=raw.split(",").filter(x=>x==="pub"||x.startsWith("t:")||x==="u:"+user.userId);
   scopes.push("u:"+user.userId);
   return Response.json({token:await scopeToken(scopes)},{headers:{"Cache-Control":"no-store"}});
  }
  return Response.json({rev:await revision()},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"잠시 후 다시 시도해주세요."},{status:503,headers:{"Cache-Control":"no-store"}})}
}
