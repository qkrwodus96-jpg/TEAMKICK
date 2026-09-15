import {env} from "cloudflare:workers";
import {AppError,ensure,iso,id} from "./model";
import {sendMail,mailReady} from "./mail";

// 자체 회원가입 인증. 비밀번호는 PBKDF2-HMAC-SHA256으로만 저장하고 원문은 남기지 않는다.
// Cloudflare Workers 는 PBKDF2 반복을 10만 회로 제한한다(초과하면 NotSupportedError).
// Node 는 제한이 없어 로컬 테스트만으로는 이 문제를 잡지 못한다.
// 그래서 10만 회를 여러 번 이어 붙여 OWASP 권고 작업량(600,000)을 맞춘다.
// 각 회차의 결과를 다음 회차의 입력으로 넣으므로 병렬로 줄일 수 없다.
export const ROUND_ITERATIONS=100000; // Workers 상한. 넘기지 않는다.
const ROUNDS=6;
const SESSION_DAYS=30;
export const COOKIE="teamkick_session";
const LOCK_AFTER=10,LOCK_MINUTES=15;

function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}

const encode=(v:string)=>new TextEncoder().encode(v);
const toBase64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const fromBase64=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const toHex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");

async function derive(password:Uint8Array<ArrayBuffer>|string,salt:Uint8Array<ArrayBuffer>,iterations:number,rounds:number){
 let material:Uint8Array<ArrayBuffer>=typeof password==="string"?encode(password) as Uint8Array<ArrayBuffer>:password;
 for(let round=0;round<rounds;round++){
  const key=await crypto.subtle.importKey("raw",material,"PBKDF2",false,["deriveBits"]);
  material=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},key,256));
 }
 return material;
}

// 저장 형식: pbkdf2$<회차당 반복>x<회차 수>$<소금>$<해시>
// 예전 형식(pbkdf2$<반복>$...)도 계속 확인할 수 있게 둔다.
export async function hashPassword(password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return "pbkdf2$"+ROUND_ITERATIONS+"x"+ROUNDS+"$"+toBase64(salt)+"$"+toBase64(await derive(password,salt,ROUND_ITERATIONS,ROUNDS));
}

export async function verifyPassword(password:string,stored:string){
 const [scheme,work,salt,expected]=String(stored).split("$");
 if(scheme!=="pbkdf2"||!salt||!expected)return false;
 const [iterationText,roundText]=String(work).split("x");
 const iterations=Number(iterationText),rounds=roundText?Number(roundText):1;
 if(!Number.isFinite(iterations)||!Number.isFinite(rounds))return false;
 const actual=await derive(password,fromBase64(salt),iterations,rounds);
 const target=fromBase64(expected);
 if(actual.length!==target.length)return false;
 let diff=0;for(let i=0;i<actual.length;i++)diff|=actual[i]^target[i];
 return diff===0; // 길이·내용 비교 시간을 일정하게 유지한다
}

type Credentials={email?:unknown;password?:unknown;name?:unknown;agree?:unknown;adult?:unknown};
type AccountRow={id:string;name:string;password:string;failures:number;locked_until:string|null};
type SessionRow={id:string;name:string;expires:string;verified_at:string|null};
const hashToken=async(token:string)=>toHex(await crypto.subtle.digest("SHA-256",encode(token)));

// 남용 제한. 같은 접속 주소에서 짧은 시간에 반복되는 요청을 막는다.
// 접속 주소 원문은 저장하지 않고 해시만 두며, 제한 시간이 지나면 지운다.
// 값은 실사용을 보고 조정할 수 있게 한곳에 모아 둔다.
// 국내 통신사는 여러 사용자가 같은 주소를 쓴다(CGNAT). 같은 장소에서 팀원이
// 한꺼번에 가입하는 상황도 있어 가입은 넉넉히 둔다. 실패한 시도도 함께 센다.
export const LIMITS={signup:{max:30,minutes:60},login:{max:20,minutes:15},forgot:{max:5,minutes:60},verify:{max:5,minutes:60}};
export type LimitName=keyof typeof LIMITS;
// Cloudflare 가 넣어주는 접속 주소. 클라이언트가 보낸 헤더는 믿지 않는다.
export const clientKey=(req:Request)=>req.headers.get("cf-connecting-ip")??"";

export async function limit(name:LimitName,client:string,now=Date.now()){
 if(!client)return; // 주소를 알 수 없으면 계정 단위 보호(잠금·재발송 제한)에 맡긴다
 const {max,minutes}=LIMITS[name];
 const key=name+":"+await hashToken(client);
 const row=await db().prepare("SELECT count,reset_at FROM rate_limits WHERE id=?").bind(key).first<{count:number;reset_at:string}>();
 if(row&&Date.parse(row.reset_at)>now){
  ensure(Number(row.count)<max,"요청이 너무 잦아요. 잠시 후 다시 시도해주세요.",429);
  await db().prepare("UPDATE rate_limits SET count=count+1 WHERE id=?").bind(key).run();
  return;
 }
 // 새 구간을 열 때 지난 기록을 함께 지운다. 오래된 접속 주소 해시를 남겨두지 않는다.
 await db().prepare("DELETE FROM rate_limits WHERE reset_at<=?").bind(iso(now)).run();
 await db().prepare("INSERT INTO rate_limits(id,count,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=1,reset_at=excluded.reset_at")
  .bind(key,iso(now+minutes*60000)).run();
}

export const normalizeEmail=(v:unknown)=>String(v??"").trim().toLowerCase();
export function checkEmail(v:unknown){
 const email=normalizeEmail(v);
 ensure(email.length<=200&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),"이메일 주소를 확인해주세요.");
 return email;
}
export function checkPassword(v:unknown){
 const password=String(v??"");
 ensure(password.length>=8&&password.length<=200,"비밀번호는 8자 이상으로 입력해주세요.");
 return password;
}
export function checkName(v:unknown){
 const name=String(v??"").trim();
 ensure(name.length>0&&name.length<=30,"이름을 확인해주세요.");
 return name;
}

function cookieValue(header:string|null,name:string){
 for(const part of (header??"").split(";")){
  const raw=part.trim();
  if(raw.startsWith(name+"="))return raw.slice(name.length+1);
 }
 return "";
}

const maxAge=SESSION_DAYS*24*3600;
export const sessionCookie=(token:string)=>COOKIE+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge;
export const clearedCookie=()=>COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

async function startSession(accountId:string,now=Date.now()){
 const token=toBase64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 await db().prepare("INSERT INTO sessions(id,account_id,expires,at) VALUES(?,?,?,?)")
  .bind(await hashToken(token),accountId,iso(now+maxAge*1000),iso(now)).run();
 return token;
}

export async function signUp(input:Credentials,origin="",now=Date.now()){
 const email=checkEmail(input.email),name=checkName(input.name),password=checkPassword(input.password);
 ensure(input.agree===true,"이용약관과 개인정보 수집·이용에 동의해주세요.");
 ensure(input.adult===true,"만 14세 이상만 가입할 수 있어요.");
 const existing=await db().prepare("SELECT id FROM accounts WHERE email=?").bind(email).first();
 ensure(!existing,"이미 가입된 이메일이에요. 로그인해주세요.",409);
 const account={id:id(),email,name,password:await hashPassword(password),agreedAt:iso(now),at:iso(now)};
 try{
  await db().prepare("INSERT INTO accounts(id,email,name,password,failures,locked_until,agreed_at,at) VALUES(?,?,?,?,0,NULL,?,?)")
   .bind(account.id,account.email,account.name,account.password,account.agreedAt,account.at).run();
 }catch(e){
  if(String(e).includes("UNIQUE"))throw new AppError("이미 가입된 이메일이에요. 로그인해주세요.",409);
  throw e;
 }
 // 메일 발송이 준비되어 있을 때만 확인 메일을 보낸다. 보내지 못해도 가입은 되돌리지 않고,
 // 보냈는지 여부를 그대로 돌려줘 화면이 사실과 다르게 안내하지 않도록 한다.
 let verificationSent=false;
 if(origin&&mailReady()){
  try{await sendVerification(account.id,account.email,account.name,origin,now);verificationSent=true}
  catch(e){console.error("TeamKick verify mail",e instanceof AppError?e.message:e)}
 }
 return {user:{userId:account.id,fullName:account.name},token:await startSession(account.id,now),verificationSent};
}

export async function signIn(input:Credentials,now=Date.now()){
 const email=normalizeEmail(input.email),password=String(input.password??"");
 const row=await db().prepare("SELECT id,name,password,failures,locked_until FROM accounts WHERE email=?").bind(email).first<AccountRow>();
 const failed="이메일 또는 비밀번호를 확인해주세요."; // 가입 여부를 응답으로 구분해주지 않는다
 if(!row)throw new AppError(failed,401);
 if(row.locked_until&&Date.parse(row.locked_until)>now)
  throw new AppError("로그인 시도가 많아 잠시 잠겼어요. "+LOCK_MINUTES+"분 후 다시 시도해주세요.",429);
 if(!await verifyPassword(password,row.password)){
  const failures=Number(row.failures??0)+1;
  const locked=failures>=LOCK_AFTER?iso(now+LOCK_MINUTES*60000):null;
  await db().prepare("UPDATE accounts SET failures=?,locked_until=? WHERE id=?").bind(locked?0:failures,locked,row.id).run();
  throw new AppError(failed,401);
 }
 if(Number(row.failures??0)>0||row.locked_until)
  await db().prepare("UPDATE accounts SET failures=0,locked_until=NULL WHERE id=?").bind(row.id).run();
 return {user:{userId:row.id,fullName:row.name},token:await startSession(row.id,now)};
}

export async function signOut(req:Request){
 const token=cookieValue(req.headers.get("cookie"),COOKIE);
 if(token)await db().prepare("DELETE FROM sessions WHERE id=?").bind(await hashToken(token)).run();
}

export async function currentUser(req:Request,now=Date.now()){
 const token=cookieValue(req.headers.get("cookie"),COOKIE);
 if(!token)return null;
 const row=await db().prepare(
  "SELECT a.id AS id, a.name AS name, a.verified_at AS verified_at, s.expires AS expires FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.id=?"
 ).bind(await hashToken(token)).first<SessionRow>();
 if(!row)return null;
 if(Date.parse(row.expires)<=now){await db().prepare("DELETE FROM sessions WHERE id=?").bind(await hashToken(token)).run();return null}
 return {userId:row.id,fullName:row.name,verified:!!row.verified_at};
}

export async function accountExists(accountId:string){
 return !!await db().prepare("SELECT id FROM accounts WHERE id=?").bind(accountId).first();
}

// 탈퇴. 로그인 수단과 세션을 지운다. 팀 활동 기록은 model 의 closeAccount 가 먼저 정리한다.
export async function closeAccount(accountId:string){
 await db().prepare("DELETE FROM sessions WHERE account_id=?").bind(accountId).run();
 await db().prepare("DELETE FROM email_verifications WHERE account_id=?").bind(accountId).run();
 await db().prepare("DELETE FROM accounts WHERE id=?").bind(accountId).run();
}

// 이메일 실재 확인. 토큰 원문은 메일로만 나가고 서버에는 해시만 남긴다.
const VERIFY_HOURS=24,VERIFY_COOLDOWN_MINUTES=3;
type VerifyRow={id:string;account_id:string;expires:string;used:number;at:string};

async function sendVerification(accountId:string,email:string,name:string,origin:string,now:number){
 const token=toBase64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const id=await hashToken(token);
 await db().prepare("INSERT INTO email_verifications(id,account_id,expires,used,at) VALUES(?,?,?,0,?)")
  .bind(id,accountId,iso(now+VERIFY_HOURS*3600000),iso(now)).run();
 const link=origin+"/?verify="+encodeURIComponent(token);
 try{
  await sendMail(email,"팀킥 이메일 확인",
   name+"님, 아래 주소를 눌러 이메일을 확인해주세요.\n\n"+link+
   "\n\n이 주소는 "+VERIFY_HOURS+"시간 동안만, 한 번만 쓸 수 있어요.\n본인이 가입한 것이 아니면 이 메일은 무시해주세요.");
 }catch(e){
  // 보내지 못한 토큰을 남겨두면 재발송 간격 제한에 걸려 다시 보낼 수 없게 된다.
  await db().prepare("DELETE FROM email_verifications WHERE id=?").bind(id).run();
  throw e;
 }
}

// 확인 메일 다시 보내기. 이미 확인했거나 없는 계정이면 조용히 끝낸다.
export async function resendVerification(accountId:string,origin:string,now=Date.now()){
 ensure(mailReady(),"메일 발송이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",503);
 const account=await db().prepare("SELECT id,email,name,verified_at,provider FROM accounts WHERE id=?")
  .bind(accountId).first<{id:string;email:string;name:string;verified_at:string|null;provider:string}>();
 if(!account||account.verified_at||account.provider==="kakao")return false;
 const recent=await db().prepare("SELECT at FROM email_verifications WHERE account_id=? AND used=0 AND expires>? ORDER BY at DESC")
  .bind(account.id,iso(now)).first<{at:string}>();
 if(recent&&now-Date.parse(recent.at)<VERIFY_COOLDOWN_MINUTES*60000)return false; // 연달아 보내지 않는다
 await sendVerification(account.id,account.email,account.name,origin,now);
 return true;
}

export async function verifyEmail(input:{token?:unknown},now=Date.now()){
 const token=String(input.token??"");
 const expired="확인 링크가 만료되었거나 이미 사용되었어요. 다시 받아주세요.";
 ensure(token,expired,400);
 const row=await db().prepare("SELECT id,account_id,expires,used,at FROM email_verifications WHERE id=?")
  .bind(await hashToken(token)).first<VerifyRow>();
 ensure(row&&!row.used&&Date.parse(row.expires)>now,expired,400);
 await db().prepare("UPDATE accounts SET verified_at=? WHERE id=?").bind(iso(now),row!.account_id).run();
 await db().prepare("UPDATE email_verifications SET used=1 WHERE id=?").bind(row!.id).run();
}

// 카카오 로그인으로 들어온 사람. 이메일과 비밀번호를 쓰지 않는다.
// 이메일 열은 비울 수 없으므로 배달되지 않는 주소(.invalid)를 넣어 자리만 채우고,
// provider 로 구분해 그 주소로는 어떤 메일도 보내지 않는다.
// 이 주소가 카카오 아이디마다 하나씩만 나오기 때문에, 같은 사람이 두 계정을 갖는 일을
// email 의 UNIQUE 제약이 막아준다. 형식을 바꿀 때 이 성질을 함께 지켜야 한다.
const kakaoPlaceholder=(kakaoId:string)=>"kakao-"+kakaoId+"@teamkick.invalid";

export async function signInWithKakao(kakaoId:string,nickname:string,now=Date.now()){
 ensure(kakaoId,"카카오 정보를 가져오지 못했어요. 다시 시도해주세요.",503);
 const existing=await db().prepare("SELECT id,name FROM accounts WHERE kakao_id=?").bind(kakaoId).first<{id:string;name:string}>();
 if(existing)return {user:{userId:existing.id,fullName:existing.name},token:await startSession(existing.id,now)};
 const account={id:id(),email:kakaoPlaceholder(kakaoId),name:checkName(nickname)};
 try{
  // 카카오가 이미 본인을 확인했으므로 확인 완료로 둔다. 비밀번호는 비워 어떤 값과도 맞지 않는다.
  await db().prepare("INSERT INTO accounts(id,email,name,password,failures,locked_until,agreed_at,verified_at,provider,kakao_id,at) VALUES(?,?,?,'',0,NULL,?,?, 'kakao',?,?)")
   .bind(account.id,account.email,account.name,iso(now),iso(now),kakaoId,iso(now)).run();
 }catch(e){
  if(String(e).includes("UNIQUE")){
   const again=await db().prepare("SELECT id,name FROM accounts WHERE kakao_id=?").bind(kakaoId).first<{id:string;name:string}>();
   if(again)return {user:{userId:again.id,fullName:again.name},token:await startSession(again.id,now)};
  }
  throw e;
 }
 return {user:{userId:account.id,fullName:account.name},token:await startSession(account.id,now)};
}

// 비밀번호 재설정. 토큰 원문은 메일로만 나가고 서버에는 해시만 남긴다.
const RESET_MINUTES=60,RESET_COOLDOWN_MINUTES=3;
type ResetRow={id:string;account_id:string;expires:string;used:number;at:string};

export async function requestPasswordReset(input:{email?:unknown},origin:string,now=Date.now()){
 const email=normalizeEmail(input.email);
 ensure(mailReady(),"메일 발송이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",503);
 const account=await db().prepare("SELECT id,name,provider FROM accounts WHERE email=?").bind(email).first<{id:string;name:string;provider:string}>();
 // 가입 여부를 응답으로 알려주지 않는다. 없는 주소면 조용히 끝낸다.
 // 카카오로 들어온 계정은 실제 메일 주소가 없으므로 보내지 않는다.
 if(!account||account.provider==="kakao")return;
 const recent=await db().prepare("SELECT at FROM password_resets WHERE account_id=? AND used=0 AND expires>? ORDER BY at DESC")
  .bind(account.id,iso(now)).first<{at:string}>();
 if(recent&&now-Date.parse(recent.at)<RESET_COOLDOWN_MINUTES*60000)return; // 연달아 보내지 않는다
 const token=toBase64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 await db().prepare("INSERT INTO password_resets(id,account_id,expires,used,at) VALUES(?,?,?,0,?)")
  .bind(await hashToken(token),account.id,iso(now+RESET_MINUTES*60000),iso(now)).run();
 const link=origin+"/?reset="+encodeURIComponent(token);
 await sendMail(email,"팀킥 비밀번호 재설정",
  account.name+"님, 아래 주소에서 비밀번호를 새로 정할 수 있어요.\n\n"+link+
  "\n\n이 주소는 "+RESET_MINUTES+"분 동안만, 한 번만 쓸 수 있어요.\n본인이 요청한 것이 아니면 이 메일은 무시해주세요.");
}

export async function resetPassword(input:{token?:unknown;password?:unknown},now=Date.now()){
 const token=String(input.token??"");
 const password=checkPassword(input.password);
 const expired="링크가 만료되었거나 이미 사용되었어요. 다시 요청해주세요.";
 ensure(token,expired,400);
 const row=await db().prepare("SELECT id,account_id,expires,used,at FROM password_resets WHERE id=?")
  .bind(await hashToken(token)).first<ResetRow>();
 ensure(row&&!row.used&&Date.parse(row.expires)>now,expired,400);
 await db().prepare("UPDATE accounts SET password=?,failures=0,locked_until=NULL WHERE id=?")
  .bind(await hashPassword(password),row!.account_id).run();
 await db().prepare("UPDATE password_resets SET used=1 WHERE id=?").bind(row!.id).run();
 // 쓰던 기기에서 모두 로그아웃시킨다.
 await db().prepare("DELETE FROM sessions WHERE account_id=?").bind(row!.account_id).run();
 const account=await db().prepare("SELECT id,name FROM accounts WHERE id=?").bind(row!.account_id).first<{id:string;name:string}>();
 ensure(account,expired,400);
 return {user:{userId:account!.id,fullName:account!.name},token:await startSession(account!.id,now)};
}
