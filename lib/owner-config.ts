import {env} from "cloudflare:workers";

// 운영자 초기 설정 코드.
// 원래는 아래 해시만 저장소에 두었는데, 저장소가 공개라 짧은 코드는 해시를 거꾸로
// 맞혀볼 수 있다. 그래서 환경변수 OWNER_SETUP_CODE 를 쓰는 길을 열어 두었다.
// 환경변수가 있으면 그것만 인정하고, 없으면 예전 해시로 확인한다.
export const OWNER_SETUP_HASH = "fb361368118dcdccea6be6b347046e8e78785efe42ab97d4f8574a1ceac94de5";

const configured=()=>(env as unknown as {OWNER_SETUP_CODE?:string}).OWNER_SETUP_CODE??"";
export const ownerCodeFromEnv=()=>!!configured();

// 길이와 내용 비교에 걸리는 시간을 일정하게 유지한다.
function sameValue(a:string,b:string){
 const left=new TextEncoder().encode(a),right=new TextEncoder().encode(b);
 if(left.length!==right.length)return false;
 let diff=0;for(let i=0;i<left.length;i++)diff|=left[i]^right[i];
 return diff===0;
}

export async function checkOwnerCode(input:unknown){
 const code=String(input??"");
 if(!code)return false;
 if(configured())return sameValue(code,configured());
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(code))))
  .map(x=>x.toString(16).padStart(2,"0")).join("");
 return sameValue(digest,OWNER_SETUP_HASH);
}
