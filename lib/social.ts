import {env} from "cloudflare:workers";
import {AppError,ensure} from "./model";

// 구글·네이버 로그인. 카카오(`lib/kakao.ts`)와 같은 흐름이지만 주소와 응답 모양만
// 다르다. 두 곳이 거의 같아 한 파일에 모아 두고 설정만 갈라 둔다.
//
// 받는 것은 **회원 식별자와 이름뿐**이다. 나이·성별·전화번호·이메일은 받지 않는다.
// 이유는 PROJECT_CONTEXT.md 4-4 에 적어 두었다.

const setting=(name:string)=>(env as unknown as Record<string,string|undefined>)[name]??"";

export type Provider="google"|"naver";
type Config={
 label:string;authorize:string;token:string;profile:string;scope:string;
 id:()=>string;secret:()=>string;
 read:(body:unknown)=>{id:string;nickname:string};
};

const PROVIDERS:Record<Provider,Config>={
 google:{
  label:"구글",
  authorize:"https://accounts.google.com/o/oauth2/v2/auth",
  token:"https://oauth2.googleapis.com/token",
  profile:"https://openidconnect.googleapis.com/v1/userinfo",
  // 이메일은 요청하지 않는다. 로그인에 필요하지 않다.
  scope:"openid profile",
  id:()=>setting("GOOGLE_CLIENT_ID"),secret:()=>setting("GOOGLE_CLIENT_SECRET"),
  read:(body)=>{
   const b=body as {sub?:string;name?:string;given_name?:string};
   return {id:String(b.sub??""),nickname:String(b.name??b.given_name??"")};
  },
 },
 naver:{
  label:"네이버",
  authorize:"https://nid.naver.com/oauth2.0/authorize",
  token:"https://nid.naver.com/oauth2.0/token",
  profile:"https://openapi.naver.com/v1/nid/me",
  scope:"",
  id:()=>setting("NAVER_CLIENT_ID"),secret:()=>setting("NAVER_CLIENT_SECRET"),
  read:(body)=>{
   const b=body as {response?:{id?:string;name?:string;nickname?:string}};
   const r=b.response??{};
   return {id:String(r.id??""),nickname:String(r.name??r.nickname??"")};
  },
 },
};

// 붙어 있는 제공자 목록. 제공자를 늘리면 처리방침도 함께 늘어야 하므로
// 테스트가 이 목록을 기준으로 문서를 확인한다.
export const PROVIDERS_LIST=Object.keys(PROVIDERS) as Provider[];
export const isProvider=(v:string):v is Provider=>v==="google"||v==="naver";
export const config=(p:Provider)=>PROVIDERS[p];
// 둘 다 있어야 쓸 수 있다. 하나만 넣으면 토큰 요청에서 막힌다.
export const socialReady=(p:Provider)=>!!PROVIDERS[p].id()&&!!PROVIDERS[p].secret();
export const redirectUri=(p:Provider,origin:string)=>origin+"/api/"+p;
export const stateCookieName=(p:Provider)=>"teamkick_"+p+"_state";

export function authorizeUrl(p:Provider,origin:string,state:string){
 const c=PROVIDERS[p];
 ensure(socialReady(p),c.label+" 로그인이 아직 설정되지 않았어요.",503);
 const params=new URLSearchParams({client_id:c.id(),redirect_uri:redirectUri(p,origin),response_type:"code",state});
 if(c.scope)params.set("scope",c.scope);
 return c.authorize+"?"+params.toString();
}

type TokenReply={access_token?:string;error?:string};

export async function exchange(p:Provider,code:string,origin:string,state:string){
 const c=PROVIDERS[p];
 const body=new URLSearchParams({grant_type:"authorization_code",client_id:c.id(),client_secret:c.secret(),
  redirect_uri:redirectUri(p,origin),code});
 if(p==="naver")body.set("state",state); // 네이버는 토큰 요청에도 state 를 요구한다
 const res=await fetch(c.token,{method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded;charset=utf-8"},body:body.toString()});
 // 본문에 코드가 들어갈 수 있어 상태 코드만 남긴다.
 if(!res.ok){console.error("TeamKick "+p+" token",res.status);throw new AppError(c.label+" 로그인에 실패했어요. 다시 시도해주세요.",503)}
 const reply=await res.json() as TokenReply;
 // 네이버는 실패해도 200 으로 오고 본문에 error 만 담긴다. 토큰이 없으면 실패로 본다.
 if(!reply.access_token){
  console.error("TeamKick "+p+" token body",reply.error??"no-token");
  throw new AppError(c.label+" 로그인에 실패했어요. 다시 시도해주세요.",503);
 }
 return reply.access_token;
}

export async function profile(p:Provider,accessToken:string){
 const c=PROVIDERS[p];
 const res=await fetch(c.profile,{headers:{Authorization:"Bearer "+accessToken}});
 if(!res.ok){console.error("TeamKick "+p+" profile",res.status);throw new AppError(c.label+" 정보를 가져오지 못했어요. 다시 시도해주세요.",503)}
 const person=c.read(await res.json());
 ensure(person.id,c.label+" 정보를 가져오지 못했어요. 다시 시도해주세요.",503);
 // 이름 동의를 받지 못했을 수도 있다. 없으면 나중에 직접 고치게 둔다.
 return {id:person.id,nickname:person.nickname.trim().slice(0,30)||"팀원"};
}
