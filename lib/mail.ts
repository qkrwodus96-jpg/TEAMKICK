import {env} from "cloudflare:workers";
import {AppError,ensure} from "./model";

// 메일 발송. 지금은 Resend 하나만 붙였고 다른 곳으로 바꾸기 쉽게 한 겹 감쌌다.
// 키와 보내는 주소는 환경변수로만 받고 소스에 넣지 않는다.
const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";
const apiKey=()=>setting("RESEND_API_KEY");
const from=()=>setting("MAIL_FROM");
export const mailReady=()=>!!apiKey()&&!!from();

export async function sendMail(to:string,subject:string,text:string){
 ensure(mailReady(),"메일 발송이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",503);
 const res=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{Authorization:"Bearer "+apiKey(),"Content-Type":"application/json"},
  body:JSON.stringify({from:from(),to:[to],subject,text}),
 });
 if(!res.ok){
  // 본문에 수신자 주소가 들어갈 수 있어 상태 코드만 남긴다.
  console.error("TeamKick mail",res.status);
  throw new AppError(res.status===429
   ?"메일 발송이 잠시 밀렸어요. 잠시 후 다시 시도해주세요."
   :"메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.",503);
 }
}
