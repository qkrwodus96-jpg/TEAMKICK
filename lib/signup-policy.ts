import {env} from "cloudflare:workers";

// 가입 정책은 소셜 제공자의 키 설정과 무관하다. 명시적으로 켠 환경에서만 허용한다.
export function emailSignupEnabled(){
 const value=(env as {EMAIL_SIGNUP_ENABLED?:string}).EMAIL_SIGNUP_ENABLED;
 if(value!==undefined&&value!==""&&value!=="true"&&value!=="false")
  console.error("TeamKick signup policy: invalid EMAIL_SIGNUP_ENABLED; signup disabled");
 return value==="true";
}
