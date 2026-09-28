import {env} from "cloudflare:workers";
import {AppError,ensure,id,iso} from "./model";

// 채팅 메시지 저장(D1 chat_messages). 누가 어느 방에 들어갈 수 있는지는 model.chatRoom 이 정하고,
// 이 파일은 그 확인이 끝난 뒤의 읽기·쓰기만 한다.
const db=()=>{const d=(env as unknown as {DB?:D1Database}).DB;if(!d)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return d};
export const MAX_BODY=1000;
const KEEP_TEAM=365*864e5,KEEP_MATCH=60*864e5,KEEP_REPORT=90*864e5;
export type ChatRow={id:string;room:string;account_id:string;name:string;body:string;at:string;deleted:number};

export async function listMessages(room:string,after="",limit=60){
 const rows=after
  ?(await db().prepare(`SELECT id,room,account_id,name,body,at,deleted FROM chat_messages WHERE room=? AND at>? ORDER BY at ASC LIMIT ?`).bind(room,after,limit).all<ChatRow>()).results
  :(await db().prepare(`SELECT id,room,account_id,name,body,at,deleted FROM chat_messages WHERE room=? ORDER BY at DESC LIMIT ?`).bind(room,limit).all<ChatRow>()).results.reverse();
 return rows??[];
}

// 1분에 20개까지. 넘으면 잠깐 막는다(도배 방지).
export async function sendMessage(room:string,accountId:string,name:string,raw:string,now=Date.now()){
 const body=String(raw??"").replace(/\r\n?/g,"\n").trim();
 ensure(body.length>0,"보낼 내용을 적어주세요.");ensure(body.length<=MAX_BODY,"메시지는 1,000자까지 보낼 수 있어요.");
 const recent=await db().prepare(`SELECT COUNT(*) AS n FROM chat_messages WHERE account_id=? AND at>?`).bind(accountId,iso(now-60e3)).first<{n:number}>();
 ensure((recent?.n??0)<20,"메시지를 너무 빨리 보내고 있어요. 잠시 뒤 다시 보내주세요.",429);
 const row:ChatRow={id:id(),room,account_id:accountId,name:String(name||"팀원").slice(0,30),body,at:iso(now),deleted:0};
 await db().prepare(`INSERT INTO chat_messages (id,room,account_id,name,body,at,deleted) VALUES (?,?,?,?,?,?,0)`).bind(row.id,row.room,row.account_id,row.name,row.body,row.at).run();
 await cleanup(now).catch(e=>console.error("TeamKick chat cleanup",e));
 return row;
}

// 내 메시지만 지울 수 있다. 지운 자리는 "삭제된 메시지"로만 남는다(내용은 지운다).
export async function deleteMessage(messageId:string,accountId:string){
 const row=await db().prepare(`SELECT id,account_id,deleted FROM chat_messages WHERE id=?`).bind(messageId).first<{id:string;account_id:string;deleted:number}>();
 ensure(row,"메시지를 찾을 수 없어요.",404);ensure(row!.account_id===accountId,"내가 보낸 메시지만 지울 수 있어요.",403);
 await db().prepare(`UPDATE chat_messages SET deleted=1, body='' WHERE id=?`).bind(messageId).run();
}

export async function findMessage(messageId:string){
 return db().prepare(`SELECT id,room,account_id,name,body,at,deleted FROM chat_messages WHERE id=?`).bind(messageId).first<ChatRow>();
}

// 신고: 운영자가 볼 수 있게 신고 시점의 내용을 남긴다. 같은 사람이 같은 메시지를 두 번 신고하면 한 번만.
export async function reportMessage(msg:ChatRow,reporter:string,reason:string,now=Date.now()){
 const key=msg.id+":"+reporter;
 await db().prepare(`INSERT OR IGNORE INTO chat_reports (id,message_id,room,reporter,author,body,reason,at) VALUES (?,?,?,?,?,?,?,?)`)
  .bind(key,msg.id,msg.room,reporter,msg.account_id,msg.body.slice(0,MAX_BODY),String(reason??"").slice(0,200),iso(now)).run();
}

export async function markRead(accountId:string,room:string,at:string){
 await db().prepare(`INSERT INTO chat_reads (id,account_id,room,at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET at=excluded.at WHERE excluded.at>chat_reads.at`)
  .bind(accountId+"|"+room,accountId,room,at).run();
}

// 방마다 안 읽은 개수(내가 보낸 것 제외, 99까지)와 마지막 메시지.
export async function roomSummaries(accountId:string,rooms:string[]){
 const out:Record<string,{unread:number;last:{name:string;body:string;at:string}|null}>={};
 for(const room of rooms.slice(0,40)){
  const read=await db().prepare(`SELECT at FROM chat_reads WHERE id=?`).bind(accountId+"|"+room).first<{at:string}>();
  const unread=await db().prepare(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM chat_messages WHERE room=? AND at>? AND account_id<>? AND deleted=0 LIMIT 99)`).bind(room,read?.at??"",accountId).first<{n:number}>();
  const last=await db().prepare(`SELECT name,body,at,deleted FROM chat_messages WHERE room=? ORDER BY at DESC LIMIT 1`).bind(room).first<{name:string;body:string;at:string;deleted:number}>();
  out[room]={unread:unread?.n??0,last:last?{name:last.name,body:last.deleted?"삭제된 메시지":last.body.slice(0,60),at:last.at}:null};
 }
 return out;
}

// 보관 기간이 지난 것은 보낼 때 함께 지운다. 따로 예약 실행이 없어도 쌓이지 않는다.
export async function cleanup(now=Date.now()){
 await db().prepare(`DELETE FROM chat_messages WHERE room LIKE 'team:%' AND at<?`).bind(iso(now-KEEP_TEAM)).run();
 await db().prepare(`DELETE FROM chat_messages WHERE room LIKE 'match:%' AND at<?`).bind(iso(now-KEEP_MATCH)).run();
 await db().prepare(`DELETE FROM chat_reports WHERE at<?`).bind(iso(now-KEEP_REPORT)).run();
}

// 탈퇴: 그 사람이 보낸 메시지와 읽음 기록을 지운다.
export async function forgetChat(accountId:string){
 await db().prepare(`DELETE FROM chat_messages WHERE account_id=?`).bind(accountId).run();
 await db().prepare(`DELETE FROM chat_reads WHERE account_id=?`).bind(accountId).run();
}
