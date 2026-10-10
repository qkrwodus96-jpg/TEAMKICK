// 1.27 휴대폰 알림 키(VAPID) 새로 만들기 — GitHub Actions "New push keys" 버튼이 부른다.
// 옛 서버(GPT Sites)의 개인키를 꺼낼 수 없어서 만들었다. 새 키 한 쌍을 만들어 Cloudflare teamkick 에
// VAPID_PUBLIC_KEY·VAPID_PRIVATE_KEY 비밀로 바로 넣는다. 값은 어디에도 출력하지 않는다.
// 키 형식은 lib/push.ts 가 읽는 그대로: 공개키 = 비압축 점(0x04+X+Y, 65바이트), 개인키 = d(32바이트), 둘 다 base64url.
// 이미 알림을 허용한 기기는 앱을 열 때 서버 키와 비교해 조용히 다시 등록한다(app/notify.tsx KeepSubscription).
// --check: 만들기만 하고 형식을 확인한 뒤 끝낸다(넣지 않음). 로컬 확인용.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {makeVapidKeys} from "./vapid-keys.mjs";

const keys=makeVapidKeys(); // 형식은 tests/core.test.mjs 가 lib/push.ts 서명으로 확인한다
console.log("새 알림 키 한 쌍을 만들었어요(공개키 65바이트, 개인키 32바이트).");
if(process.argv.includes("--check"))process.exit(0);

for(const k of ["CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID"])if(!process.env[k]){console.error(k+" 가 없어요.");process.exit(1)}
const dir=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),"vapid-"));const file=path.join(dir,"secrets.json");
try{
 fs.writeFileSync(file,JSON.stringify(keys),{mode:0o600});
 execFileSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","secret","bulk",file,"--name","teamkick"],{stdio:["ignore","inherit","inherit"]});
 console.log("Cloudflare teamkick 에 VAPID_PUBLIC_KEY·VAPID_PRIVATE_KEY 를 넣었어요.");
}finally{fs.rmSync(dir,{recursive:true,force:true})}
