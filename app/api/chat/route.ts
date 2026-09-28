import {currentUser} from "@/lib/auth";
import {load} from "@/lib/store";
import {AppError,chatRoom,chatRooms,ensure} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
import {listMessages,sendMessage,deleteMessage,findMessage,reportMessage,markRead,roomSummaries} from "@/lib/chat-server";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});
const failed=(e:unknown)=>{
 if(!(e instanceof AppError))console.error("TeamKick chat",e);
 return json({error:e instanceof AppError?e.message:"채팅을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요."},e instanceof AppError?e.status:503);
};
// 방에 들어갈 수 있는지는 매번 지금 상태(state)로 다시 본다. 팀에서 나가거나 역할이 바뀌면 바로 막힌다.
async function room(userId:string,name:string){
 const {state}=await load();const r=chatRoom(state,userId,name);ensure(r,"이 채팅방에 들어갈 수 없어요.",403);
 return {state,r:r!};
}

// GET ?room=…&after=… → 그 방 메시지 / room 없으면 내 방 목록(안 읽은 개수·마지막 메시지)
export async function GET(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const url=new URL(req.url),name=url.searchParams.get("room")??"";
  if(!name){
   const {state}=await load();const rooms=chatRooms(state,user.userId);
   const sums=await roomSummaries(user.userId,rooms.map(x=>x.room));
   return json({rooms:rooms.map(x=>({...x,...sums[x.room]}))});
  }
  const {r}=await room(user.userId,name);
  const rows=await listMessages(r.room,url.searchParams.get("after")??"");
  if(rows.length)await markRead(user.userId,r.room,rows[rows.length-1].at);
  return json({room:{room:r.room,kind:r.kind,title:r.title,sub:r.sub},
   messages:rows.map(x=>({id:x.id,name:x.name,body:x.deleted?"":x.body,deleted:!!x.deleted,at:x.at,mine:x.account_id===user.userId}))});
 }catch(e){return failed(e)}
}

// POST {action:"send",room,body} · {action:"delete",id} · {action:"report",id,reason}
export async function POST(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const raw=await req.text();if(raw.length>6000)throw new AppError("입력 내용이 너무 커요.",413);
  let c:Record<string,unknown>;try{c=JSON.parse(raw)}catch{throw new AppError("입력 형식을 확인해주세요.")}
  const action=String(c.action??"");
  if(action==="send"){
   const {state,r}=await room(user.userId,String(c.room??""));
   // 이름은 그 팀에서 쓰는 선수 이름으로(없으면 계정 이름). 상대 팀과의 대화에는 팀 이름을 붙인다.
   const tid=r.teamOf(user.userId);const member=state.members.find(x=>x.teamId===tid&&x.userId===user.userId&&x.status==="active");
   const team=state.teams.find(x=>x.id===tid);
   const name=(member?.name||user.fullName||"팀원")+(r.kind==="match"&&team?" · "+team.name:"");
   const row=await sendMessage(r.room,user.userId,name,String(c.body??""));
   await markRead(user.userId,r.room,row.at);
   return json({ok:true,message:{id:row.id,name:row.name,body:row.body,deleted:false,at:row.at,mine:true}});
  }
  if(action==="delete"){await deleteMessage(String(c.id??""),user.userId);return json({ok:true})}
  if(action==="report"){
   const msg=await findMessage(String(c.id??""));ensure(msg,"메시지를 찾을 수 없어요.",404);
   await room(user.userId,msg!.room);ensure(msg!.account_id!==user.userId,"내 메시지는 신고할 수 없어요.");
   await reportMessage(msg!,user.userId,String(c.reason??""));
   return json({ok:true,room:msg!.room,excerpt:msg!.body.slice(0,60)});
  }
  throw new AppError("지원하지 않는 작업이에요.");
 }catch(e){return failed(e)}
}
