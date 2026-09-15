import {env} from "cloudflare:workers";
import {AppError,ensure,iso,id} from "./model";

// 자체 회원가입 인증. 비밀번호는 PBKDF2-HMAC-SHA256으로만 저장하고 원문은 남기지 않는다.
// 반복 횟수는 OWASP Password Storage Cheat Sheet 권고(600,000)를 따른다.
const ITERATIONS=600000;
const SESSION_DAYS=30;
export const COOKIE="teamkick_session";
const LOCK_AFTER=10,LOCK_MINUTES=15;

function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}

const encode=(v:string)=>new TextEncoder().encode(v);
const toBase64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const fromBase64=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const toHex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");

async function derive(password:string,salt:Uint8Array<ArrayBuffer>,iterations:number){
 const key=await crypto.subtle.importKey("raw",encode(password),"PBKDF2",false,["deriveBits"]);
 return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},key,256));
}

export async function hashPassword(password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return "pbkdf2$"+ITERATIONS+"$"+toBase64(salt)+"$"+toBase64(await derive(password,salt,ITERATIONS));
}

export async function verifyPassword(password:string,stored:string){
 const [scheme,iterations,salt,expected]=String(stored).split("$");
 if(scheme!=="pbkdf2"||!salt||!expected)return false;
 const actual=await derive(password,fromBase64(salt),Number(iterations));
 const target=fromBase64(expected);
 if(actual.length!==target.length)return false;
 let diff=0;for(let i=0;i<actual.length;i++)diff|=actual[i]^target[i];
 return diff===0; // 길이·내용 비교 시간을 일정하게 유지한다
}

type Credentials={email?:unknown;password?:unknown;name?:unknown};
type AccountRow={id:string;name:string;password:string;failures:number;locked_until:string|null};
type SessionRow={id:string;name:string;expires:string};
const hashToken=async(token:string)=>toHex(await crypto.subtle.digest("SHA-256",encode(token)));

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

export async function signUp(input:Credentials,now=Date.now()){
 const email=checkEmail(input.email),name=checkName(input.name),password=checkPassword(input.password);
 const existing=await db().prepare("SELECT id FROM accounts WHERE email=?").bind(email).first();
 ensure(!existing,"이미 가입된 이메일이에요. 로그인해주세요.",409);
 const account={id:id(),email,name,password:await hashPassword(password),at:iso(now)};
 try{
  await db().prepare("INSERT INTO accounts(id,email,name,password,failures,locked_until,at) VALUES(?,?,?,?,0,NULL,?)")
   .bind(account.id,account.email,account.name,account.password,account.at).run();
 }catch(e){
  if(String(e).includes("UNIQUE"))throw new AppError("이미 가입된 이메일이에요. 로그인해주세요.",409);
  throw e;
 }
 return {user:{userId:account.id,fullName:account.name},token:await startSession(account.id,now)};
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
  "SELECT a.id AS id, a.name AS name, s.expires AS expires FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.id=?"
 ).bind(await hashToken(token)).first<SessionRow>();
 if(!row)return null;
 if(Date.parse(row.expires)<=now){await db().prepare("DELETE FROM sessions WHERE id=?").bind(await hashToken(token)).run();return null}
 return {userId:row.id,fullName:row.name};
}

export async function accountExists(accountId:string){
 return !!await db().prepare("SELECT id FROM accounts WHERE id=?").bind(accountId).first();
}
