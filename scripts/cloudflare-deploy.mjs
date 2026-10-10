// 1.27 운영자 Cloudflare 계정으로 배포한다(GitHub Actions 가 main 에 합칠 때마다 부른다).
// 1) D1 데이터베이스와 R2 이미지 저장소가 없으면 만든다(있으면 그대로 쓴다).
// 2) 빌드가 만든 dist/server/wrangler.json 의 자리표시(이름·DB 번호·저장소 이름)를 이 계정 것으로 바꾼다.
// 3) wrangler deploy. 비밀값(카카오 키 등)은 Cloudflare 화면의 "변수 및 비밀"에 두고 여기서는 건드리지 않는다(keep_vars).
// 표 만들기는 앱이 첫 요청에서 스스로 한다(lib/schema.ensureSchema) — 여기서 migration 을 돌리지 않는다.
import {execFileSync} from "node:child_process";
import fs from "node:fs";

const WORKER="teamkick",DB_NAME="teamkick-db",BUCKET_NAME="teamkick-images";
const CONFIG="dist/server/wrangler.json";
const wrangler=(args,opts={})=>execFileSync(process.execPath,["node_modules/wrangler/bin/wrangler.js",...args],{encoding:"utf8",stdio:["ignore","pipe","pipe"],...opts});

for(const k of ["CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID"])if(!process.env[k]){console.error(k+" 가 없어요. GitHub → Settings → Secrets and variables → Actions 에 넣어주세요.");process.exit(1)}
if(!fs.existsSync(CONFIG)){console.error(CONFIG+" 가 없어요. 먼저 pnpm build 를 돌려야 해요.");process.exit(1)}

// D1: 이름으로 찾고 없으면 만든다. 한국 사용자라 아시아·태평양(apac)에 둔다.
let list=JSON.parse(wrangler(["d1","list","--json"]));
let found=list.find(d=>d.name===DB_NAME);
if(!found){console.log("D1 "+DB_NAME+" 만들기");wrangler(["d1","create",DB_NAME,"--location","apac"]);list=JSON.parse(wrangler(["d1","list","--json"]));found=list.find(d=>d.name===DB_NAME)}
const dbId=found?.uuid??found?.id;
if(!dbId){console.error("D1 번호를 찾지 못했어요.");process.exit(1)}

// R2: 이미 있으면 "already exists" 로 실패하므로 그건 넘어간다.
try{wrangler(["r2","bucket","create",BUCKET_NAME]);console.log("R2 "+BUCKET_NAME+" 만들기")}
catch(e){const msg=String(e.stderr??e.stdout??e);if(!/already exists|already own/i.test(msg)){console.error(msg);process.exit(1)}}

const cfg=JSON.parse(fs.readFileSync(CONFIG,"utf8"));
cfg.name=WORKER;cfg.topLevelName=WORKER;
cfg.d1_databases=[{binding:"DB",database_name:DB_NAME,database_id:dbId}];
cfg.r2_buckets=[{binding:"BUCKET",bucket_name:BUCKET_NAME}];
cfg.workers_dev=true;      // 도메인을 옮기기 전 시험 주소(teamkick.<계정>.workers.dev)
cfg.keep_vars=true;        // 화면에서 넣은 변수를 배포가 지우지 않게
cfg.triggers={crons:[]};   // 예약 실행은 cron-job.org 가 /api/cron 을 부른다(지금과 같음)
fs.writeFileSync(CONFIG,JSON.stringify(cfg));
console.log("배포 설정: worker="+WORKER+" d1="+DB_NAME+" r2="+BUCKET_NAME);

execFileSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","deploy","--config",CONFIG],{stdio:"inherit"});
