import {env} from "cloudflare:workers";
import {AppError,ensure} from "./model";

// 메일 발송. 키가 들어 있는 쪽을 골라 쓴다.
// - Brevo: 보내는 주소만 확인하면 되어 도메인이 없어도 시작할 수 있다(무료 하루 300건)
// - Resend: 보내는 도메인을 확인해야 한다(무료 월 3,000건)
// 키와 보내는 주소는 환경변수로만 받고 소스에 넣지 않는다.
const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";
const from=()=>setting("MAIL_FROM");
const provider=()=>setting("BREVO_API_KEY")?"brevo":setting("RESEND_API_KEY")?"resend":"";
export const mailReady=()=>!!provider()&&!!from();

// "팀킥 <mail@example.com>" 또는 "mail@example.com" 둘 다 받는다.
export function parseFrom(value:string){
 const match=value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
 const email=(match?match[2]:value).trim();
 const name=(match?match[1]:"").trim()||"팀킥";
 return {name,email};
}

const escape=(v:string)=>v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

export async function sendMail(to:string,subject:string,text:string){
 ensure(mailReady(),"메일 발송이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",503);
 const sender=parseFrom(from());
 const brevo=provider()==="brevo";
 const res=await fetch(brevo?"https://api.brevo.com/v3/smtp/email":"https://api.resend.com/emails",{
  method:"POST",
  headers:brevo
   ?{"api-key":setting("BREVO_API_KEY"),"Content-Type":"application/json","Accept":"application/json"}
   :{Authorization:"Bearer "+setting("RESEND_API_KEY"),"Content-Type":"application/json"},
  body:JSON.stringify(brevo
   ?{sender,to:[{email:to}],subject,textContent:text,htmlContent:"<pre>"+escape(text)+"</pre>"}
   :{from:sender.name+" <"+sender.email+">",to:[to],subject,text}),
 });
 if(!res.ok){
  // 본문에 수신자 주소가 들어갈 수 있어 상태 코드만 남긴다.
  console.error("TeamKick mail",provider(),res.status);
  throw new AppError(res.status===429
   ?"메일 발송이 잠시 밀렸어요. 잠시 후 다시 시도해주세요."
   :"메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.",503);
 }
}
