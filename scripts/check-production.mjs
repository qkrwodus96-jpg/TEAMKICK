// 운영 서버 점검 — GitHub Actions "Check production" 버튼이 부른다(Claude 작업 환경은 teamkick.co.kr 에 직접 못 붙는다).
// 저장소가 공개라 Actions 기록도 공개다. 그래서 출력은 버전·상태 코드·예약 실행 숫자만. 요청 내용·헤더·개인정보는 찍지 않는다.
// 1) /api/health 공개 부분(version·build·database) 2) /api/cron 을 비밀값 없이 → 401 이어야 정상
// 3) MINUTES 분 동안 worker 로그(wrangler tail)를 보다가 예약 실행(scheduled) 1건을 찾아 결과만 출력.
import {spawn} from "node:child_process";

const SITE=process.env.SITE||"https://teamkick.co.kr";
const MINUTES=Math.max(0,Math.min(15,Number(process.env.MINUTES??"11")||0));
let failed=false;
const bad=(m)=>{failed=true;console.log("✗ "+m)};

async function web(){
 const h=await fetch(SITE+"/api/health",{headers:{"cache-control":"no-cache"}});
 const j=await h.json().catch(()=>({}));
 console.log(`health ${h.status} version=${j.version} build=${j.build} database=${j.database}`);
 if(h.status!==200||j.database!==true)bad("health 이 정상이 아니에요");
 const c=await fetch(SITE+"/api/cron");
 console.log(`cron(비밀값 없이) ${c.status} — 401 이면 정상(서버가 직접 거절)`);
 if(c.status!==401)bad("예약 실행 주소가 401 이 아니에요");
}

// wrangler tail --format json 은 이벤트마다 JSON 객체를 (여러 줄로) 찍는다. 문자열 안의 괄호를 빼고 세어 객체 단위로 자른다.
export function splitObjects(){
 let buf="",depth=0,inStr=false,esc=false,start=-1;
 return chunk=>{
  const out=[];
  for(const ch of chunk){
   buf+=ch;const i=buf.length-1;
   if(inStr){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch==='"')inStr=false;continue}
   if(ch==='"'){if(depth>0)inStr=true;continue}
   if(ch==="{"){if(depth===0)start=i;depth++}
   else if(ch==="}"&&depth>0){depth--;if(depth===0){out.push(buf.slice(start));buf="";start=-1}}
  }
  if(depth===0&&buf.length>4096)buf="";
  return out;
 };
}

// 예약 실행 이벤트에서 공개해도 되는 것만 고른다.
export function scheduledSummary(ev){
 if(!ev||!ev.event||typeof ev.event.cron!=="string")return null;
 const lines=(ev.logs??[]).map(l=>(l.message??[]).map(String).join(" ")).filter(m=>m.startsWith("TeamKick scheduled"));
 const status=Number((lines[0]??"").split(" ")[2]);
 return {cron:ev.event.cron,outcome:ev.outcome,status,log:lines.map(s=>s.slice(0,200)),exceptions:(ev.exceptions??[]).map(e=>String(e.name)).slice(0,3)};
}

function tail(){
 return new Promise(resolve=>{
  console.log(`예약 실행을 최대 ${MINUTES}분 기다려요(10분마다 돈다)…`);
  const p=spawn(process.execPath,["node_modules/wrangler/bin/wrangler.js","tail","teamkick","--format","json"],{stdio:["ignore","pipe","ignore"]});
  const split=splitObjects();let done=false;
  const finish=(r)=>{if(done)return;done=true;clearTimeout(timer);p.kill("SIGINT");resolve(r)};
  const timer=setTimeout(()=>finish(null),MINUTES*60000);
  p.stdout.setEncoding("utf8");
  p.stdout.on("data",d=>{for(const s of split(d)){let ev;try{ev=JSON.parse(s)}catch{continue}const sum=scheduledSummary(ev);if(sum)finish(sum)}});
  p.on("exit",()=>finish(null));
 });
}

if(import.meta.url===`file://${process.argv[1]}`){
 await web().catch(e=>bad("사이트 접속 실패: "+String(e).slice(0,120)));
 if(MINUTES>0){
  if(!process.env.CLOUDFLARE_API_TOKEN)bad("CLOUDFLARE_API_TOKEN 이 없어 예약 실행 로그를 못 봐요");
  else{
   const r=await tail();
   if(!r)bad(`${MINUTES}분 안에 예약 실행이 보이지 않았어요`);
   else{
    console.log(`예약 실행 cron="${r.cron}" outcome=${r.outcome} status=${r.status}`);for(const l of r.log)console.log("  "+l);
    if(r.exceptions.length)console.log("  예외: "+r.exceptions.join(", "));
    if(r.outcome!=="ok"||r.status!==200)bad("예약 실행 결과가 정상이 아니에요");
   }
  }
 }
 console.log(failed?"결과: 문제 있음":"결과: 정상");
 process.exit(failed?1:0);
}
