import {currentUser,accountProvider,clearedCookie} from "./auth";
import {ensureSchema} from "./schema";
import {AppError} from "./model";
import {checkClosable,finishSocialClose} from "./close";
import type {UnlinkProvider} from "./unlink";

// 소셜 계정 탈퇴의 시작과 끝. 카카오·구글·네이버 경로가 같이 쓴다.
// 시작은 반드시 우리 화면에서 보낸 POST 여야 한다. GET 링크로 시작할 수 있으면 남이 보낸
// 주소 하나를 누르는 것만으로(사업자 로그인이 자동으로 지나가면) 계정이 지워질 수 있다.
export const CLOSE_PREFIX="close.";
const json=(x:unknown,status=200,cookie?:string)=>{
 const headers=new Headers({"Cache-Control":"no-store"});if(cookie)headers.append("Set-Cookie",cookie);
 return Response.json(x,{status,headers});
};

export async function startClose(req:Request,provider:UnlinkProvider,authorize:(origin:string,state:string)=>string,stateCookie:(value:string,seconds:number)=>string){
 try{
  await ensureSchema();
  const url=new URL(req.url),origin=req.headers.get("origin");
  if(origin&&origin!==url.origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const body=await req.json().catch(()=>null) as {action?:string}|null;
  if(body?.action!=="close")throw new AppError("요청을 확인해주세요.");
  const user=await currentUser(req);
  if(!user)throw new AppError("먼저 로그인해주세요.",401);
  if(await accountProvider(user.userId)!==provider)throw new AppError("이 방법으로 가입한 계정이 아니에요.",400);
  await checkClosable(user.userId);
  const state=CLOSE_PREFIX+crypto.randomUUID();
  return json({location:authorize(url.origin,state)},200,stateCookie(state,600));
 }catch(e){
  if(!(e instanceof AppError))console.error("TeamKick close start",e);
  return json({error:e instanceof AppError?e.message:"탈퇴를 시작하지 못했어요. 잠시 후 다시 시도해주세요."},e instanceof AppError?e.status:503);
 }
}

// 콜백에서 state 가 탈퇴용이면 부른다. 로그인 대신 탈퇴하고 첫 화면으로 돌려보낸다.
export async function finishClose(req:Request,provider:UnlinkProvider,person:{id:string},accessToken:string){
 const origin=new URL(req.url).origin;
 const user=await currentUser(req);
 if(!user)throw new AppError("로그인이 풀려 탈퇴하지 못했어요. 다시 로그인한 뒤 설정에서 탈퇴해주세요.",401);
 const message=await finishSocialClose(user,provider,person.id,accessToken);
 const headers=new Headers({Location:origin+"/?social="+encodeURIComponent(message),"Cache-Control":"no-store"});
 headers.append("Set-Cookie",clearedCookie());
 return new Response(null,{status:302,headers});
}
