import {currentUser} from "@/lib/auth";
import {assertWritable} from "@/lib/migrate";
import {load} from "@/lib/store";
import {loadRoomState,loadSome} from "@/lib/store-some";
import {AppError,chatRoom,chatRooms,ensure,type State} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
import {listMessages,sendMessage,deleteMessage,findMessage,reportMessage,markRead,roomSummaries} from "@/lib/chat-server";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});
const failed=(e:unknown)=>{
 if(!(e instanceof AppError))console.error("TeamKick chat",e);
 return json({error:e instanceof AppError?e.message:"채팅을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요."},e instanceof AppError?e.status:503);
};
// 방에 들어갈 수 있는지는 매번 지금 상태로 다시 본다. 팀에서 나가거나 역할이 바뀌면 바로 막힌다.
// 1.17: 전체 상태 대신 그 방에 필요한 줄(팀·팀원·경기·신청)만 읽는다 — 4초마다 전체를 읽던 것이 느린 원인이었다.
// 줄만 읽어서 못 들어가면(오래된 줄의 scope 가 다른 경우 등) 전체를 한 번 더 읽어 확인한다.
async function room(userId:string,name:string){
 let state:State=await loadRoomState(name);let r=chatRoom(state,userId,name);
 if(!r){state=(await load()).state;r=chatRoom(state,userId,name)}
 ensure(r,"이 채팅방에 들어갈 수 없어요.",403);
 return {state,r:r!};
}
const info=(r:NonNullable<ReturnType<typeof chatRoom>>)=>({room:r.room,kind:r.kind,title:r.title,sub:r.sub,
 ...("request" in r?{request:r.request,otherTeamId:r.otherTeamId,homeTeamId:r.homeTeamId,canDecide:r.canDecide,gameId:r.gameId}:{}),
 ...(r.kind==="guest"&&"otherTeamId" in r?{otherTeamId:r.otherTeamId,gameId:r.gameId}:{})});

// GET ?room=…&after=… → 그 방 메시지 / room 없으면 내 방 목록(안 읽은 개수·마지막 메시지)
export async function GET(req:Request){
 try{
  await ensureSchema();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const url=new URL(req.url),name=url.searchParams.get("room")??"";
  if(!name){
   const {state}=await load();const rooms=chatRooms(state,user.userId);
   const sums=await roomSummaries(user.userId,rooms.map(x=>x.room),(state.users.find(x=>x.id===user.userId)?.blocked?.users??{}) as Record<string,unknown>);
   const list=rooms.map(x=>{
    const sm=sums[x.room]??{unread:0,last:null,readAt:""};let {unread,last}=sm;
    // 매칭 신청 메시지는 채팅 글이 아니라 신청에 들어 있다. 대화가 아직 없으면 그것을 마지막 글로 보여주고,
    // 모집 팀 주장이 아직 안 읽었으면 1 로 센다(1.17: "신청 메시지가 채팅함으로").
    if(x.request&&(!last||String(x.request.at)>last.at)){
     last={name:x.request.teamName,body:x.request.message||"매칭을 신청했어요.",at:String(x.request.at)};
     if(x.request.pending&&String(x.request.at)>sm.readAt)unread+=1;
    }
    return {room:x.room,kind:x.kind,title:x.title,sub:x.sub,unread,last,pending:!!x.request?.pending,hiddenAt:x.hiddenAt};
   })
   // 지운 방은 그 뒤 새 글이 없으면 보이지 않는다.
   .filter(x=>!x.hiddenAt||(x.last&&x.last.at>x.hiddenAt))
   .sort((a,b)=>String(b.last?.at??"").localeCompare(String(a.last?.at??"")));
   return json({rooms:list.map(x=>({room:x.room,kind:x.kind,title:x.title,sub:x.sub,unread:x.unread,last:x.last,pending:x.pending}))});
  }
  const {r}=await room(user.userId,name);
  const [rows,me]=await Promise.all([listMessages(r.room,url.searchParams.get("after")??""),loadSome([{kind:"users",ids:[user.userId]}])]);
  // 1.26 내가 차단한 사람의 메시지는 내용을 보내지 않는다(화면에는 "차단한 사용자의 메시지"로 접힌다).
  const hid=(me.users[0]?.blocked?.users??{}) as Record<string,unknown>;
  const readTo=[rows.at(-1)?.at??"","request" in r&&r.request?String(r.request.at):""].sort().at(-1)!;
  if(readTo)await markRead(user.userId,r.room,readTo);
  return json({room:info(r),
   messages:rows.map(x=>{const blocked=x.account_id!==user.userId&&!!hid[x.account_id];return {id:x.id,name:x.name,body:x.deleted||blocked?"":x.body,deleted:!!x.deleted,blocked,at:x.at,mine:x.account_id===user.userId}})});
 }catch(e){return failed(e)}
}

// POST {action:"send",room,body} · {action:"delete",id} · {action:"report",id,reason}
export async function POST(req:Request){
 try{
  await ensureSchema();await assertWritable();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const raw=await req.text();if(raw.length>6000)throw new AppError("입력 내용이 너무 커요.",413);
  let c:Record<string,unknown>;try{c=JSON.parse(raw)}catch{throw new AppError("입력 형식을 확인해주세요.")}
  const action=String(c.action??"");
  if(action==="send"){
   const {state,r}=await room(user.userId,String(c.room??""));
   // 1.26 경기·용병 대화방(다른 팀과의 대화)에서 상대가 나(또는 우리 팀)를 차단했으면 보내지 못한다. 차단 사실은 알리지 않는다.
   if(r.kind!=="team"){const others=r.members.filter(u=>u!==user.userId),mine=r.teamOf(user.userId);
    const rows=others.length?(await loadSome([{kind:"users",ids:others}])).users:[];
    if(rows.some(u=>u.blocked?.users?.[user.userId]||(mine&&u.blocked?.teams?.[mine])))throw new AppError("지금은 이 대화방에 메시지를 보낼 수 없어요.",403);}
   // 이름은 그 팀에서 쓰는 선수 이름으로(없으면 계정 이름). 상대 팀과의 대화에는 팀 이름을 붙인다.
   const tid=r.teamOf(user.userId);const member=state.members.find(x=>x.teamId===tid&&x.userId===user.userId&&x.status==="active");
   const team=state.teams.find(x=>x.id===tid);
   const name=(member?.name||user.fullName||"팀원")+((r.kind==="match"||r.kind==="guest")&&team?" · "+team.name:"");
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
