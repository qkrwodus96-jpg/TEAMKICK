// 1.27.3 예약 실행을 Cloudflare Cron Triggers 로 옮긴다.
// cron-job.org 가 밖에서 /api/cron 을 부르던 것을 Cloudflare 이전 뒤 입구에서 403 으로 막았다(2026-10-11,
// 브라우저 요청은 통과, 보안 이벤트 기록 없음). 이제 Cloudflare 가 10분마다 worker 의 scheduled 를 부르고,
// 그 안에서 같은 worker 의 /api/cron 을 직접(네트워크를 거치지 않고) 부른다. 인증·잠금·일 내용은 /api/cron 그대로.
// 빌드 결과(dist/server/index.js)를 감싸는 입구 파일을 만든다. index.js 는 건드리지 않는다.
import fs from "node:fs";
import path from "node:path";

export const CRON="*/10 * * * *";
export const ENTRY="cron-entry.js";

const source=`// scripts/cron-entry.mjs 가 만든 파일. 직접 고치지 않는다.
import app from "./index.js";
export default {
 ...app,
 fetch(req,env,ctx){return app.fetch(req,env,ctx)},
 async scheduled(event,env,ctx){
  const secret=String(env.CRON_SECRET??"").trim();
  const req=new Request("https://teamkick.co.kr/api/cron",{headers:{authorization:"Bearer "+secret,"x-teamkick-cron":String(event.cron??"")}});
  const run=Promise.resolve(app.fetch(req,env,ctx)).then(async res=>{
   // 응답에는 숫자만 있다(누구에게 보냈는지는 없다). Cloudflare 로그에서 결과를 보려고 남긴다.
   const text=(await res.text()).slice(0,300);
   if(res.ok)console.log("TeamKick scheduled",res.status,text);else console.error("TeamKick scheduled",res.status,text);
  });
  ctx.waitUntil(run);await run;
 },
};
`;

// dir 에 입구 파일을 쓰고 wrangler 설정(cfg)의 main·triggers 를 바꾼다.
export function addCronEntry(dir,cfg){
 fs.writeFileSync(path.join(dir,ENTRY),source);
 cfg.main=ENTRY;
 cfg.triggers={crons:[CRON]};
 return cfg;
}
