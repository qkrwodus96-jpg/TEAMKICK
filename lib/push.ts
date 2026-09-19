import {env} from "cloudflare:workers";
import {AppError} from "./model";

// 기기 푸시(웹 푸시). 잠금화면까지 알림이 가게 한다.
//
// 내용은 실어 보내지 않는다(payload 없는 푸시). 두 가지 이유다.
// (1) 내용을 실으려면 기기별 키로 암호화(RFC 8291)해야 하는데, 이 개발 환경에서는
//     실제 푸시 서버로 보내볼 수 없어 암호화가 맞는지 확인할 방법이 없다.
// (2) 내용을 푸시 서버에 맡기지 않는 편이 개인정보에도 낫다.
// 대신 서비스 워커가 깨어나 `/api/app` 에서 최신 알림을 읽어 보여준다.

const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";
// 환경변수 이름이 사이트마다 다를 수 있어 흔한 이름을 모두 본다.
const publicKey=()=>setting("VAPID_PUBLIC_KEY")||setting("VAPID_PUBLIC")||setting("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
const privateKey=()=>setting("VAPID_PRIVATE_KEY")||setting("VAPID_PRIVATE");
const subject=()=>setting("VAPID_SUBJECT")||"mailto:jyp7296@naver.com";

export const pushReady=()=>!!publicKey()&&!!privateKey();
export const pushPublicKey=()=>publicKey();

const b64url=(b:ArrayBuffer|Uint8Array)=>{
 const bytes=b instanceof Uint8Array?b:new Uint8Array(b);
 let s="";for(const x of bytes)s+=String.fromCharCode(x);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const fromB64url=(v:string)=>{
 const pad=v.replace(/-/g,"+").replace(/_/g,"/");
 return Uint8Array.from(atob(pad+"=".repeat((4-pad.length%4)%4)),c=>c.charCodeAt(0));
};

// VAPID 개인키는 32바이트 원본(raw) 또는 PKCS#8 로 들어올 수 있다. 둘 다 받는다.
async function signingKey(){
 const raw=fromB64url(privateKey());
 if(raw.length===32){
  const pub=fromB64url(publicKey()); // 비압축 형식: 0x04 + X(32) + Y(32)
  if(pub.length!==65||pub[0]!==4)throw new AppError("푸시 공개키 형식을 확인해주세요.",500);
  return crypto.subtle.importKey("jwk",{kty:"EC",crv:"P-256",
   x:b64url(pub.slice(1,33)),y:b64url(pub.slice(33,65)),d:b64url(raw),ext:true},
   {name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
 }
 return crypto.subtle.importKey("pkcs8",raw as unknown as ArrayBuffer,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
}

// 푸시 서버에 "이 발송자가 맞다"를 증명하는 토큰. 받는 주소(origin)마다 따로 만든다.
export async function vapidToken(audience:string,now=Date.now()){
 const head=b64url(new TextEncoder().encode(JSON.stringify({typ:"JWT",alg:"ES256"})));
 const body=b64url(new TextEncoder().encode(JSON.stringify({
  aud:audience,exp:Math.floor(now/1000)+12*3600,sub:subject()})));
 const sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},await signingKey(),
  new TextEncoder().encode(head+"."+body));
 return head+"."+body+"."+b64url(sig);
}

export type Sub={id:string;endpoint:string};
function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}

export async function subscriptionsOf(accountId:string){
 return ((await db().prepare("SELECT id,endpoint FROM push_subs WHERE account_id=?").bind(accountId).all<Sub>()).results??[]) as Sub[];
}
export async function saveSubscription(accountId:string,input:{endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}}){
 const endpoint=String(input?.endpoint??"");
 const p256dh=String(input?.keys?.p256dh??""),auth=String(input?.keys?.auth??"");
 if(!/^https:\/\//.test(endpoint)||endpoint.length>800)throw new AppError("알림 구독 정보를 확인해주세요.");
 if(!p256dh||!auth)throw new AppError("알림 구독 정보를 확인해주세요.");
 // 같은 기기가 다시 구독하면 주인만 바꾼다. 기기를 물려주는 경우가 있다.
 await db().prepare("INSERT INTO push_subs(id,account_id,endpoint,p256dh,auth,at) VALUES(?,?,?,?,?,?) "+
  "ON CONFLICT(endpoint) DO UPDATE SET account_id=excluded.account_id,p256dh=excluded.p256dh,auth=excluded.auth,at=excluded.at")
  .bind(crypto.randomUUID(),accountId,endpoint,p256dh,auth,new Date().toISOString()).run();
}
export async function removeSubscription(accountId:string,endpoint:string){
 await db().prepare("DELETE FROM push_subs WHERE account_id=? AND endpoint=?").bind(accountId,String(endpoint??"")).run();
}
export async function forgetDevices(accountId:string){
 await db().prepare("DELETE FROM push_subs WHERE account_id=?").bind(accountId).run();
}

// 한 번에 보내는 양과 기다리는 시간을 묶어 둔다. 저장이 푸시 때문에 느려지면 안 된다.
export const MAX_DEVICES=20,TIMEOUT_MS=4000;

// 푸시 서버가 뭐라고 답했는지 남긴다. 예전에는 성공 여부(true/false)만 돌려줘서
// 안 올 때 원인을 알 수 없었다. 본문은 앞부분만 잘라 둔다.
export type SendResult={ok:boolean;status:number;detail:string;host:string};

async function sendOne(sub:Sub):Promise<SendResult>{
 const url=new URL(sub.endpoint);
 let res:Response;
 try{
  res=await fetch(sub.endpoint,{method:"POST",signal:AbortSignal.timeout(TIMEOUT_MS),headers:{
   // Content-Length 는 fetch 가 직접 정하는 값이라 여기서 넣어도 버려진다. 넣지 않는다.
   Authorization:"vapid t="+await vapidToken(url.origin)+", k="+publicKey(),
   TTL:"86400",Urgency:"normal"}});
 }catch(e){
  // 시간 초과나 연결 실패. 푸시 서버에 닿지도 못한 경우다.
  return {ok:false,status:0,detail:String(e instanceof Error?e.message:e).slice(0,200),host:url.host};
 }
 // 410/404 는 기기가 구독을 버렸다는 뜻이다. 그대로 두면 계속 실패한다.
 if(res.status===404||res.status===410)await db().prepare("DELETE FROM push_subs WHERE id=?").bind(sub.id).run();
 let detail="";
 if(!res.ok)detail=await res.text().then(t=>t.slice(0,200)).catch(()=>"");
 return {ok:res.ok,status:res.status,detail,host:url.host};
}

// 알림을 받은 사람들의 기기를 깨운다. 실패해도 저장은 이미 끝난 뒤라 되돌리지 않는다.
export async function wakeDevices(userIds:string[]){
 if(!pushReady()||!userIds.length)return {sent:0,failed:0,results:[] as SendResult[]};
 const seen=new Set(userIds);
 const subs:Sub[]=[];
 for(const id of seen){
  if(subs.length>=MAX_DEVICES)break;
  subs.push(...(await subscriptionsOf(id)).slice(0,MAX_DEVICES-subs.length));
 }
 const out=await Promise.allSettled(subs.map(sendOne));
 const results:SendResult[]=out.map(r=>r.status==="fulfilled"?r.value
  :{ok:false,status:0,detail:String(r.reason).slice(0,200),host:""});
 const sent=results.filter(r=>r.ok).length;
 // 실패한 것이 있으면 서버 기록에 이유를 남긴다. 예전에는 조용히 사라졌다.
 for(const r of results)if(!r.ok)console.error("TeamKick push 실패",r.host,r.status,r.detail);
 return {sent,failed:results.length-sent,results};
}

// 본인 기기로 보내는 시험 발송.
// 평소 알림은 **만든 사람 본인에게는 가지 않는다**(자기가 방금 한 일이라). 그래서 혼자
// 시험하면 푸시가 영영 안 온다. 이 함수만 그 규칙을 건너뛰고, 푸시 서버가 뭐라고
// 답했는지 그대로 돌려준다.
export async function testWake(accountId:string){
 if(!pushReady())throw new AppError("알림이 아직 설정되지 않았어요. 운영자가 푸시 키를 넣어야 해요.",503);
 const subs=(await subscriptionsOf(accountId)).slice(0,MAX_DEVICES);
 if(!subs.length)throw new AppError("이 계정에 등록된 기기가 없어요. 먼저 이 기기에서 알림을 켜주세요.",409);
 const out=await Promise.allSettled(subs.map(sendOne));
 const results:SendResult[]=out.map(r=>r.status==="fulfilled"?r.value
  :{ok:false,status:0,detail:String(r.reason).slice(0,200),host:""});
 for(const r of results)if(!r.ok)console.error("TeamKick push 시험 실패",r.host,r.status,r.detail);
 return {devices:subs.length,sent:results.filter(r=>r.ok).length,results};
}
