import {env} from "cloudflare:workers";
import {AppError,ensure} from "./model";

// 카카오 로그인. 이메일 없이 카카오 계정으로 신원을 확인한다.
// 국내 메일 수신이 막히는 문제를 우회하는 것이 아니라 메일 자체를 쓰지 않는다.
// REST 키는 구장 검색과 같은 값을 쓴다(같은 카카오 앱).
const AUTHORIZE="https://kauth.kakao.com/oauth/authorize";
const TOKEN="https://kauth.kakao.com/oauth/token";
const PROFILE="https://kapi.kakao.com/v2/user/me";
const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";
const key=()=>setting("KAKAO_REST_KEY");
// 카카오는 앱을 만들면 Client Secret 이 기본으로 켜져 있다. 켜져 있으면 토큰 요청에
// 이 값을 함께 보내야 하고, 빠지면 401(KOE010)이 난다.
const secret=()=>setting("KAKAO_CLIENT_SECRET");
export const kakaoReady=()=>!!key();
export const kakaoSecretSet=()=>!!secret();

// 콜백 주소는 카카오 개발자 콘솔에 그대로 등록해야 한다.
export const redirectUri=(origin:string)=>origin+"/api/kakao";
export const STATE_COOKIE="teamkick_kakao_state";

export function authorizeUrl(origin:string,state:string){
 ensure(kakaoReady(),"카카오 로그인이 아직 설정되지 않았어요.",503);
 const params=new URLSearchParams({client_id:key(),redirect_uri:redirectUri(origin),response_type:"code",state});
 return AUTHORIZE+"?"+params.toString();
}

type TokenReply={access_token?:string};
type ProfileReply={id?:number|string;kakao_account?:{profile?:{nickname?:string}};properties?:{nickname?:string}};

export async function exchange(code:string,origin:string){
 const res=await fetch(TOKEN,{
  method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded;charset=utf-8"},
  body:new URLSearchParams({grant_type:"authorization_code",client_id:key(),redirect_uri:redirectUri(origin),code,
   ...(secret()?{client_secret:secret()}:{})}).toString(),
 });
 if(!res.ok){
  // 본문에 코드가 들어갈 수 있어 상태 코드만 남긴다.
  console.error("TeamKick kakao token",res.status,secret()?"with-secret":"no-secret");
  throw new AppError(res.status===401&&!secret()
   ?"카카오 로그인 설정이 끝나지 않았어요. 관리자에게 문의해주세요. (client secret 없음)"
   :"카카오 로그인에 실패했어요. 다시 시도해주세요.",503);
 }
 const body=await res.json() as TokenReply;
 ensure(body.access_token,"카카오 로그인에 실패했어요. 다시 시도해주세요.",503);
 return body.access_token!;
}

export async function profile(accessToken:string){
 const res=await fetch(PROFILE,{headers:{Authorization:"Bearer "+accessToken}});
 if(!res.ok){console.error("TeamKick kakao profile",res.status);throw new AppError("카카오 정보를 가져오지 못했어요. 다시 시도해주세요.",503)}
 const body=await res.json() as ProfileReply;
 const id=String(body.id??"").trim();
 ensure(id,"카카오 정보를 가져오지 못했어요. 다시 시도해주세요.",503);
 // 닉네임 동의를 받지 않았을 수도 있다. 없으면 이름을 나중에 직접 고치게 둔다.
 const nickname=String(body.kakao_account?.profile?.nickname??body.properties?.nickname??"").trim().slice(0,30);
 return {id,nickname:nickname||"팀원"};
}
