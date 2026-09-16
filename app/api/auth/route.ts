import {signUp,signIn,signOut,sessionCookie,clearedCookie,requestPasswordReset,resetPassword,limit,clientKey,verifyEmail,resendVerification,currentUser} from "@/lib/auth";
import {AppError,setupIncomplete,SETUP_MESSAGE} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200,cookie?:string)=>Response.json(x,{status,headers:cookie?{"Cache-Control":"no-store","Set-Cookie":cookie}:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 try{
  await ensureSchema();
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const raw=await req.text();if(raw.length>4000)throw new AppError("입력 내용이 너무 커요.",413);
  let c:Record<string,unknown>;try{c=JSON.parse(raw)}catch{throw new AppError("입력 형식을 확인해주세요.")}
  if(!c||typeof c!=="object")throw new AppError("요청 정보를 확인해주세요.");
  if(c.action==="signup"){await limit("signup",clientKey(req));const {user,token,verificationSent}=await signUp(c,new URL(req.url).origin);return json({ok:true,verificationSent,user:{id:user.userId,name:user.fullName}},200,sessionCookie(token))}
  if(c.action==="login"){await limit("login",clientKey(req));const {user,token}=await signIn(c);return json({ok:true,user:{id:user.userId,name:user.fullName}},200,sessionCookie(token))}
  if(c.action==="forgot"){await limit("forgot",clientKey(req));await requestPasswordReset(c,new URL(req.url).origin);return json({ok:true})}
  if(c.action==="reset"){const {user,token}=await resetPassword(c);return json({ok:true,user:{id:user.userId,name:user.fullName}},200,sessionCookie(token))}
  if(c.action==="verify"){await verifyEmail(c);return json({ok:true})}
  if(c.action==="resendVerify"){const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);await limit("verify",clientKey(req));const sent=await resendVerification(user.userId,new URL(req.url).origin);return json({ok:true,sent})}
  if(c.action==="logout"){await signOut(req);return json({ok:true},200,clearedCookie())}
  throw new AppError("지원하지 않는 작업이에요.");
 }catch(e){
  console.error("TeamKick auth",e instanceof AppError?e.message:e);
  return json({error:e instanceof AppError?e.message:setupIncomplete(e)?SETUP_MESSAGE:"처리하지 못했어요. 잠시 후 다시 시도해주세요."},e instanceof AppError?e.status:503);
 }
}
