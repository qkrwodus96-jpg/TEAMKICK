import {authorizeUrl,exchange,profile,socialReady,stateCookieName,config,type Provider} from "@/lib/social";
import {signInWithSocial,sessionCookie,socialAccountId,startSocialSignup,signupCookie} from "@/lib/auth";
import {ensureSchema} from "@/lib/schema";
import {AppError} from "@/lib/model";
import {startClose,finishClose,CLOSE_PREFIX} from "@/lib/close-route";

// 구글·네이버 콜백 처리. 제공자만 다르고 흐름은 같아 한곳에 둔다.
// 카카오(`app/api/kakao/route.ts`)와 같은 방식이다.
const stateCookie=(p:Provider,value:string,seconds:number)=>
 stateCookieName(p)+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+seconds;
function cookieValue(header:string|null,name:string){
 for(const part of (header??"").split(";")){const raw=part.trim();if(raw.startsWith(name+"="))return raw.slice(name.length+1)}
 return "";
}

export async function handle(req:Request,p:Provider){
 const url=new URL(req.url),origin=url.origin;
 const fail=(message:string)=>Response.redirect(origin+"/?social="+encodeURIComponent(message),302);
 try{
  await ensureSchema();
  if(!socialReady(p))throw new AppError(config(p).label+" 로그인이 아직 설정되지 않았어요.",503);
  const code=url.searchParams.get("code");
  if(!code){
   // 시작: 임의의 상태값을 쿠키에 담아 두고 제공자에게 보낸다.
   const state=crypto.randomUUID();
   return new Response(null,{status:302,headers:{
    Location:authorizeUrl(p,origin,state),"Set-Cookie":stateCookie(p,state,600),"Cache-Control":"no-store"}});
  }
  // 콜백: 우리가 시작한 요청인지 확인한다.
  const sent=url.searchParams.get("state")??"";
  const expected=cookieValue(req.headers.get("cookie"),stateCookieName(p));
  if(!expected||expected!==sent)throw new AppError("로그인 요청을 확인할 수 없어요. 다시 시도해주세요.",403);
  const accessToken=await exchange(p,code,origin,sent);
  const person=await profile(p,accessToken);
  // 탈퇴하려고 다녀온 경우. 로그인 대신 탈퇴하고 연결을 끊는다.
  if(expected.startsWith(CLOSE_PREFIX))return await finishClose(req,p,person,accessToken);
  // 처음 온 사람은 바로 가입시키지 않는다. 약관 동의·만 14세 확인 화면으로 보낸다.
  if(!await socialAccountId(p,person.id)){
   const pending=await startSocialSignup(p,person.id,person.nickname);
   return new Response(null,{status:302,headers:{Location:origin+"/?signup="+p,"Cache-Control":"no-store","Set-Cookie":signupCookie(pending)}});
  }
  const {token}=await signInWithSocial(p,person.id,person.nickname);
  return new Response(null,{status:302,headers:{
   Location:origin+"/","Cache-Control":"no-store","Set-Cookie":sessionCookie(token)}});
 }catch(e){
  console.error("TeamKick "+p,e instanceof AppError?e.message:e);
  return fail(e instanceof AppError?e.message:config(p).label+" 로그인에 실패했어요. 다시 시도해주세요.");
 }
}

// 탈퇴 시작. 화면에서만 부른다(POST, 같은 출처).
export const startSocialClose=(req:Request,p:Provider)=>
 startClose(req,p,(origin,state)=>authorizeUrl(p,origin,state),(value,seconds)=>stateCookie(p,value,seconds));
