import {revision} from "@/lib/store";
import {currentUser} from "@/lib/auth";
import {ensureSchema} from "@/lib/schema";

// 1.19 실시간 반영(사장님 요청 — "새로고침해야 보여서 불편"). 화면이 열려 있는 동안 7초마다 부른다(1.20: 15초 → 7초).
// 저장 번호(state_revision)만 돌려준다. 내용은 없다 — 바뀌었으면 화면이 /api/app 으로 자기 몫을 다시 읽는다.
export async function GET(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);
  if(!user)return Response.json({error:"먼저 로그인해주세요."},{status:401,headers:{"Cache-Control":"no-store"}});
  return Response.json({rev:await revision()},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"잠시 후 다시 시도해주세요."},{status:503,headers:{"Cache-Control":"no-store"}})}
}
