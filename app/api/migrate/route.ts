import {AppError} from "@/lib/model";
import {ensureSchema} from "@/lib/schema";
import {migrateReady,migrateAuthorized,exportCounts,exportRows,exportKeys,exportObject,setFrozen,importAllowed,importStep,wipe,COPY_TABLES} from "@/lib/migrate";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});
const failed=(e:unknown)=>{if(!(e instanceof AppError))console.error("TeamKick migrate",e);return json({error:e instanceof AppError?e.message:"처리하지 못했어요."},e instanceof AppError?e.status:500)};

// 1.27 서버 이전 도구(lib/migrate.ts). MIGRATE_SECRET 이 없는 서버에서는 404 처럼 아무것도 하지 않는다.
// GET  ?op=page                 → 새 서버(시험 주소)에서 여는 복사 화면
// GET  ?op=counts|rows|keys|object → 옛 서버가 내주는 것(비밀값 머리글 필요)
// POST {op:"freeze",on}         → 옛 서버 저장 잠금/풀기(비밀값 필요)
// POST {op:"remote",...}        → 새 서버가 옛 서버에 대신 묻거나(비교·잠금) 끌어와 넣는다(시험 주소에서만)
export async function GET(req:Request){
 try{
  if(!migrateReady())return new Response("Not found",{status:404});
  const u=new URL(req.url),op=u.searchParams.get("op")??"";
  if(op==="page")return new Response(PAGE,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex"}});
  if(!await migrateAuthorized(req))return json({error:"unauthorized"},401);
  await ensureSchema();
  if(op==="counts")return json(await exportCounts());
  if(op==="rows")return json(await exportRows(u.searchParams.get("table")??"",Number(u.searchParams.get("offset")??0)));
  if(op==="keys")return json(await exportKeys(u.searchParams.get("cursor")??""));
  if(op==="object")return await exportObject(u.searchParams.get("key")??"");
  throw new AppError("지원하지 않는 작업이에요.");
 }catch(e){return failed(e)}
}
export async function POST(req:Request){
 try{
  if(!migrateReady())return new Response("Not found",{status:404});
  if(!await migrateAuthorized(req))return json({error:"unauthorized"},401);
  await ensureSchema();
  const c=await req.json().catch(()=>({})) as Record<string,unknown>;
  if(c.op==="freeze"){await setFrozen(c.on===true);return json({ok:true,frozen:c.on===true})}
  if(c.op!=="remote")throw new AppError("지원하지 않는 작업이에요.");
  // 여기부터는 새 서버(시험 주소)에서만. 도메인을 옮긴 뒤 운영 데이터를 지우거나 덮어쓰지 않게.
  if(!importAllowed(req))throw new AppError("가져오기는 *.workers.dev 시험 주소에서만 할 수 있어요.",403);
  const from=String(c.from??""),given=(req.headers.get("x-migrate-secret")??"").trim();
  const base=new URL("/api/migrate",new URL(from).origin);
  if(c.action==="compare"){
   const r=await fetch(new URL("?op=counts",base),{headers:{"x-migrate-secret":given}});
   if(!r.ok)throw new AppError("옛 서버가 거절했어요("+r.status+").",502);
   return json({old:await r.json(),now:await exportCounts()});
  }
  if(c.action==="freeze"){
   const r=await fetch(base,{method:"POST",headers:{"x-migrate-secret":given,"content-type":"application/json"},body:JSON.stringify({op:"freeze",on:c.on===true})});
   if(!r.ok)throw new AppError("옛 서버 잠금을 바꾸지 못했어요("+r.status+").",502);
   return json(await r.json());
  }
  if(c.action==="wipe"){if(c.confirm!=="WIPE")throw new AppError("확인 문구가 필요해요.");await wipe();return json({ok:true})}
  if(c.action==="step")return json(await importStep(from,given,c.step as {phase:"rows"|"objects";table?:string;offset?:number;cursor?:string}));
  throw new AppError("지원하지 않는 작업이에요.");
 }catch(e){return failed(e)}
}

// 운영자만 여는 복사 화면. 비밀값은 이 페이지 입력칸에만 적고 어디에도 저장하지 않는다.
const PAGE=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>팀킥 서버 이전</title>
<style>body{font:15px/1.6 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;margin:0;padding:20px 16px;background:#f6f8f7;color:#14231b}main{max-width:560px;margin:auto;display:grid;gap:14px}
h1{font-size:20px;margin:0}label{display:grid;gap:4px;font-weight:600}input{font:inherit;padding:10px 12px;border:1px solid #cfd8d3;border-radius:10px}
.row{display:flex;flex-wrap:wrap;gap:8px}button{font:inherit;font-weight:700;padding:10px 14px;border-radius:10px;border:1px solid #cfd8d3;background:#fff;cursor:pointer}
button.go{background:#168b53;border-color:#168b53;color:#fff}button.warn{background:#fff5f5;border-color:#f3c2c2;color:#b42318}button:disabled{opacity:.5}
pre{background:#fff;border:1px solid #e3e8e5;border-radius:10px;padding:12px;white-space:pre-wrap;font-size:13px;max-height:50vh;overflow:auto}p{margin:0;color:#4d5d53;font-size:13.5px}</style></head>
<body><main><h1>팀킥 서버 이전</h1>
<p>옛 서버(지금 운영 중)에서 이 새 서버로 데이터와 사진을 옮겨요. 이 화면은 시험 주소(*.workers.dev)에서만 동작해요.</p>
<label>옛 서버 주소<input id="from" value="https://teamkick.co.kr"></label>
<label>이전 비밀값(MIGRATE_SECRET)<input id="secret" type="password" autocomplete="off"></label>
<div class="row"><button id="cmp">① 개수 비교</button><button id="full" class="go">② 처음부터 복사</button><button id="final" class="warn">③ 마지막 복사(옛 서버 잠금)</button><button id="unfreeze">옛 서버 잠금 풀기</button></div>
<pre id="log">대기 중</pre></main>
<script>
const T=${JSON.stringify(COPY_TABLES)};const $=id=>document.getElementById(id);const log=s=>{$("log").textContent+="\\n"+s;$("log").scrollTop=1e9};
async function call(body){const r=await fetch("/api/migrate",{method:"POST",headers:{"content-type":"application/json","x-migrate-secret":$("secret").value.trim()},body:JSON.stringify({op:"remote",from:$("from").value.trim(),...body})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||("응답 "+r.status));return j}
function lock(on){for(const b of document.querySelectorAll("button"))b.disabled=on}
async function compare(){const j=await call({action:"compare"});let bad=0;log("표\\t옛 서버\\t새 서버");for(const t of T){const a=j.old.tables[t],b=j.now.tables[t];if(a!==b)bad++;log(t+"\\t"+a+"\\t"+b+(a===b?"":"  ← 다름"))}
 log("사진 파일\\t"+j.old.objects+"\\t"+j.now.objects+(j.old.objects===j.now.objects?"":"  ← 다름"));log("옛 서버 잠금: "+(j.old.frozen?"잠김":"풀림"));if(j.old.objects!==j.now.objects)bad++;log(bad?"⚠ 다른 곳이 "+bad+"개 있어요.":"✅ 모두 같아요.");return bad}
async function copyAll(){await call({action:"wipe",confirm:"WIPE"});log("새 서버를 비웠어요.");
 for(const t of T){let step={phase:"rows",table:t,offset:0},n=0;for(;;){const j=await call({action:"step",step});n+=j.copied;if(j.done)break;step=j.next}log(t+": "+n+"줄")}
 let step={phase:"objects",cursor:""},n=0;for(;;){const j=await call({action:"step",step});n+=j.copied;log("사진 "+n+"개…");if(j.done)break;step=j.next}log("사진 "+n+"개 복사 끝")}
async function run(f){lock(true);try{await f()}catch(e){log("❌ "+e.message)}finally{lock(false)}}
$("cmp").onclick=()=>run(async()=>{$("log").textContent="개수 비교";await compare()});
$("full").onclick=()=>run(async()=>{$("log").textContent="처음부터 복사(옛 서버는 계속 운영)";await copyAll();await compare()});
$("final").onclick=()=>run(async()=>{$("log").textContent="마지막 복사";await call({action:"freeze",on:true});log("옛 서버 저장을 잠갔어요(보기만 됨).");await copyAll();const bad=await compare();log(bad?"다른 곳이 있으면 ③을 한 번 더 누르세요. 잠금은 유지돼요.":"이제 도메인을 옮기는 단계로 가세요. 옛 서버 잠금은 그대로 두세요.")});
$("unfreeze").onclick=()=>run(async()=>{await call({action:"freeze",on:false});log("옛 서버 잠금을 풀었어요.")});
</script></body></html>`;
