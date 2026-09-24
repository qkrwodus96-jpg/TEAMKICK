import {env} from "cloudflare:workers";
// 이름으로 꺼내지 않고 통째로 받는다. 오래된 실행기에 waitUntil 이 없으면 이름으로
// 꺼내는 순간 서버 전체가 뜨지 않는다. 통째로 받으면 없을 때 undefined 일 뿐이다.
import * as workers from "cloudflare:workers";
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

// 알림을 받을 사람들 중 **폰 알림을 켜 둔 사람이 몇 명인지**만 센다(누구인지는 돌려주지
// 않는다). 주장이 공지를 올리고 "몇 명 폰에 갔는지" 알 수 있게 한다. 예전에는 알림함에만
// 쌓이고 폰에는 아무도 안 갔는데도 알 방법이 없었다.
export async function devicesAmong(userIds:string[]){
 const ids=[...new Set(userIds.map(String))].slice(0,100);
 if(!ids.length)return 0;
 const row=await db().prepare("SELECT COUNT(DISTINCT account_id) AS n FROM push_subs WHERE account_id IN ("+ids.map(()=>"?").join(",")+")")
  .bind(...ids).first<{n:number}>();
 return Number(row?.n??0);
}
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
export type SendResult={ok:boolean;status:number;detail:string;host:string;ms:number;via?:string};

type Attempt={res?:Response;error?:string;ms:number;host:string};
async function post(endpoint:string,timeout:number):Promise<Attempt>{
 const url=new URL(endpoint);
 // 서명은 시간 제한을 걸기 **전에** 만든다. 예전에는 제한 시간이 먼저 흐르기 시작한
 // 뒤에 서명을 만들어, 서명에 든 시간까지 제한 시간에서 깎였다.
 const auth="vapid t="+await vapidToken(url.origin)+", k="+publicKey();
 const began=Date.now();
 try{
  const res=await fetch(endpoint,{method:"POST",signal:AbortSignal.timeout(timeout),
   // 내용 없는 푸시다. 길이 0 인 본문을 분명히 실어 둔다(`Content-Length: 0`).
   // 참고: 운영과 같은 실행기(workerd)로 확인해 보니 본문을 빼도 길이 0 이 붙었다.
   // 그러니 2026-09-24 의 "응답 없음" 은 이것 때문이 아니다 — 아래 우회를 보라.
   body:new Uint8Array(0),
   // 사람이 바로 봐야 하는 알림이라 high 로 보낸다. normal 이면 안드로이드가 절전(Doze)
   // 중일 때 FCM 이 전달을 미룬다 — 서버에선 "보냈어요" 인데 폰에는 안 뜨는 모양이 된다
   // (사장님 갤럭시, 2026-09-24). RFC 8030 의 값: very-low / low / normal / high.
   headers:{Authorization:auth,TTL:"86400",Urgency:"high"}});
  return {res,ms:Date.now()-began,host:url.host};
 }catch(e){
  return {error:String(e instanceof Error?e.message:e).slice(0,160),ms:Date.now()-began,host:url.host};
 }
}

// 크롬(안드로이드)이 주는 푸시 주소가 `https://jmt17.google.com/fcm/send/<토큰>` 모양일
// 때가 있다. 뒤쪽 `/fcm/send/<토큰>` 이 같으면 `fcm.googleapis.com` 도 같은 곳이다.
// 사장님 갤럭시에서 jmt17.google.com 이 "응답 없음 · 시간 초과" 로 떨어졌다(2026-09-24).
// 한쪽에 닿지 못하면 다른 쪽으로 한 번 더 보낸다.
export const FCM_ORIGIN="https://fcm.googleapis.com";
export const fcmAlias=(endpoint:string)=>{
 try{
  const u=new URL(endpoint);
  return u.origin!==FCM_ORIGIN&&u.hostname.endsWith(".google.com")&&u.pathname.startsWith("/fcm/send/")?FCM_ORIGIN+u.pathname:"";
 }catch{return ""}
};

async function sendOne(sub:Sub,timeout=TIMEOUT_MS):Promise<SendResult>{
 const first=await post(sub.endpoint,timeout);
 let got=first,via="";
 if(!first.res){
  // 닿지도 못했을 때만 우회한다. 푸시 서버가 거절(4xx)했으면 우회해도 같다.
  const alias=fcmAlias(sub.endpoint);
  if(alias){const second=await post(alias,timeout);if(second.res){got=second;via=second.host}}
 }
 if(!got.res)return {ok:false,status:0,detail:first.error??"",host:first.host,ms:first.ms};
 const res=got.res;
 // 410/404 는 기기가 구독을 버렸다는 뜻이다. 그대로 두면 계속 실패한다.
 // 다만 우회 주소에서 받은 답이면 확신할 수 없으니 지우지 않는다.
 if(!via&&(res.status===404||res.status===410))await db().prepare("DELETE FROM push_subs WHERE id=?").bind(sub.id).run();
 let detail="";
 if(!res.ok)detail=await res.text().then(t=>t.slice(0,200)).catch(()=>"");
 return {ok:res.ok,status:res.status,detail,host:first.host,ms:got.ms,...(via?{via}:{})};
}

// 푸시는 **보통은 응답 전에 끝낸다**(대개 1초 안에 끝난다). 오래 걸리면 그때만 실행기의
// waitUntil 에 맡기고 응답을 돌려준다 — 저장이 푸시 때문에 몇 초씩 멈추지 않게.
// 뒤로 넘기기만 하던 1.9.3~1.9.5 는 운영 실행기에서 waitUntil 이 실제로 지켜지는지 확인할
// 수 없었다. 먼저 기다려 두면 waitUntil 이 없거나 안 지켜져도 보통의 알림은 나간다.
export async function afterResponse(p:Promise<unknown>,cap=1500):Promise<void>{
 const wu=(workers as unknown as {waitUntil?:(p:Promise<unknown>)=>void}).waitUntil;
 const handed=typeof wu==="function"&&(()=>{try{wu(p);return true}catch{return false}})();
 if(!handed){await p;return}
 let timer:ReturnType<typeof setTimeout>|undefined;
 await Promise.race([p.then(()=>undefined,()=>undefined),new Promise<void>(r=>{timer=setTimeout(r,cap)})]);
 if(timer)clearTimeout(timer);
}

// 푸시 서버까지 길이 뚫려 있는지 따로 본다. "응답 없음" 이 **우리 요청 모양 때문**인지
// **이 서버가 밖으로 못 나가서**인지 가려 준다. 주소를 GET 으로 두드려 보고
// 몇 초 만에 무슨 답이 오는지만 본다(내용은 쓰지 않는다).
async function reach(host:string){
 const began=Date.now();
 try{
  const r=await fetch("https://"+host+"/",{method:"GET",redirect:"manual",signal:AbortSignal.timeout(5000)});
  return host+" 연결됨 "+r.status+" ("+(Date.now()-began)+"ms)";
 }catch(e){
  return host+" 연결 안 됨 ("+(Date.now()-began)+"ms · "+String(e instanceof Error?e.message:e).slice(0,60)+")";
 }
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
 // `subs.map(sendOne)` 으로 넘기면 안 된다 — map 이 주는 순번(0,1,2…)이 제한 시간 자리로
 // 들어가 첫 기기가 0ms 만에 끊긴다(1.9.3~1.9.5 의 회귀, 테스트가 지킨다).
 const out=await Promise.allSettled(subs.map(x=>sendOne(x)));
 const results:SendResult[]=out.map(r=>r.status==="fulfilled"?r.value
  :{ok:false,status:0,detail:String(r.reason).slice(0,200),host:"",ms:0});
 const sent=results.filter(r=>r.ok).length;
 // 실패한 것이 있으면 서버 기록에 이유를 남긴다. 예전에는 조용히 사라졌다.
 for(const r of results)if(!r.ok)console.error("TeamKick push 실패",r.host,r.status,r.detail);
 return {sent,failed:results.length-sent,results};
}

// 본인 기기로 보내는 시험 발송.
// 평소 알림은 **만든 사람 본인에게는 가지 않는다**(자기가 방금 한 일이라). 그래서 혼자
// 시험하면 푸시가 영영 안 온다. 이 함수만 그 규칙을 건너뛰고, 푸시 서버가 뭐라고
// 답했는지 그대로 돌려준다.
// 시험 발송은 평소보다 오래 기다린다. 느리지만 되는 것과 아예 안 되는 것을 가리려면
// 제한 시간이 넉넉해야 한다. 평소 발송(4초)은 저장을 늦추지 않도록 그대로 둔다.
export const TEST_TIMEOUT_MS=8000;
export async function testWake(accountId:string,only?:string){
 if(!pushReady())throw new AppError("알림이 아직 설정되지 않았어요. 운영자가 푸시 키를 넣어야 해요.",503);
 let subs=(await subscriptionsOf(accountId)).slice(0,MAX_DEVICES);
 if(!subs.length)throw new AppError("이 계정에 등록된 기기가 없어요. 먼저 이 기기에서 알림을 켜주세요.",409);
 // 화면이 자기 기기 주소를 알려 주면 그 기기로만 보낸다. 없으면 예전처럼 전부.
 if(only){
  subs=subs.filter(x=>x.endpoint===only);
  if(!subs.length)throw new AppError("이 기기는 아직 등록돼 있지 않아요. 알림을 껐다가 다시 켜주세요.",409);
 }
 const out=await Promise.allSettled(subs.map(x=>sendOne(x,TEST_TIMEOUT_MS)));
 const results:SendResult[]=out.map(r=>r.status==="fulfilled"?r.value
  :{ok:false,status:0,detail:String(r.reason).slice(0,200),host:"",ms:0});
 for(const r of results)if(!r.ok)console.error("TeamKick push 시험 실패",r.host,r.status,r.detail);
 // 푸시 서버에 닿지도 못했으면 길이 뚫려 있는지 함께 본다.
 let probe:string[]=[];
 const unreached=[...new Set(results.filter(r=>r.status===0&&r.host).map(r=>r.host))];
 if(unreached.length)probe=await Promise.all([...unreached,"fcm.googleapis.com","www.google.com"].map(reach));
 return {devices:subs.length,sent:results.filter(r=>r.ok).length,results,probe};
}
