import {env} from "cloudflare:workers";

// 예약 실행(/api/cron) 잠금. 부르는 쪽(cron-job.org 등)이 `Authorization: Bearer <CRON_SECRET>` 을 보낸다.
// 비밀값은 주소(?key=)로 받지 않는다 — 주소는 호출 기록·로그에 그대로 남는다.
const secret=()=>String((env as unknown as Record<string,string|undefined>).CRON_SECRET??"").trim();
export const cronReady=()=>secret().length>=16;

const digest=async(v:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));
export async function cronAuthorized(req:Request){
 if(!cronReady())return false;
 const h=req.headers.get("authorization")??"";
 const given=(/^Bearer\s+/i.test(h)?h.replace(/^Bearer\s+/i,""):req.headers.get("x-cron-secret")??"").trim();
 if(!given)return false;
 // 길이·내용이 달라도 같은 시간이 걸리게 해시끼리 끝까지 비교한다.
 const [a,b]=await Promise.all([digest(given),digest(secret())]);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
