import {authorizeUrl,exchange,profile,kakaoReady,STATE_COOKIE} from "@/lib/kakao";
import {signInWithKakao,sessionCookie} from "@/lib/auth";
import {ensureSchema} from "@/lib/schema";
import {AppError} from "@/lib/model";
import {startClose,finishClose,CLOSE_PREFIX} from "@/lib/close-route";
export const dynamic="force-dynamic";

// 시작과 콜백을 한 경로에서 처리한다. 카카오 개발자 콘솔에는 이 주소를 등록한다.
const stateCookie=(value:string,seconds:number)=>STATE_COOKIE+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+seconds;
function cookieValue(header:string|null,name:string){
 for(const part of (header??"").split(";")){const raw=part.trim();if(raw.startsWith(name+"="))return raw.slice(name.length+1)}
 return "";
}
const back=(origin:string,message?:string)=>Response.redirect(origin+(message?"/?kakao="+encodeURIComponent(message):"/"),302);

export async function GET(req:Request){
 const url=new URL(req.url),origin=url.origin;
 try{
  await ensureSchema();
  if(!kakaoReady())throw new AppError("카카오 로그인이 아직 설정되지 않았어요.",503);
  const code=url.searchParams.get("code");
  if(!code){
   // 시작: 임의의 상태값을 쿠키에 담아 두고 카카오로 보낸다.
   const state=crypto.randomUUID();
   return new Response(null,{status:302,headers:{Location:authorizeUrl(origin,state),"Set-Cookie":stateCookie(state,600),"Cache-Control":"no-store"}});
  }
  // 콜백: 우리가 시작한 요청인지 확인한다.
  const expected=cookieValue(req.headers.get("cookie"),STATE_COOKIE);
  if(!expected||expected!==url.searchParams.get("state"))throw new AppError("로그인 요청을 확인할 수 없어요. 다시 시도해주세요.",403);
  const accessToken=await exchange(code,origin);
  const person=await profile(accessToken);
  // 탈퇴하려고 카카오에 다녀온 경우. 로그인 대신 탈퇴하고 연결을 끊는다.
  if(expected.startsWith(CLOSE_PREFIX))return await finishClose(req,"kakao",person,accessToken);
  const {token}=await signInWithKakao(person.id,person.nickname);
  return new Response(null,{status:302,headers:{Location:origin+"/","Cache-Control":"no-store","Set-Cookie":sessionCookie(token)}});
 }catch(e){
  console.error("TeamKick kakao",e instanceof AppError?e.message:e);
  return back(origin,e instanceof AppError?e.message:"카카오 로그인에 실패했어요. 다시 시도해주세요.");
 }
}

// 탈퇴 시작. 화면에서만 부른다(POST, 같은 출처). 카카오 로그인 주소를 돌려준다.
export const POST=(req:Request)=>startClose(req,"kakao",authorizeUrl,stateCookie);
