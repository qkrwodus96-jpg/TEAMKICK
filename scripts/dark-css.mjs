// 다크 모드 CSS 만들기(1.17). app/globals.css 에 적힌 색을 읽어 어두운 화면용 덮어쓰기를 app/dark.css 로 낸다.
//   node scripts/dark-css.mjs          → app/dark.css 를 새로 쓴다
//   node scripts/dark-css.mjs --check  → 지금 파일이 globals.css 와 맞는지만 본다(테스트가 쓴다)
// globals.css 를 고친 뒤에는 이 스크립트를 한 번 돌려야 다크 모드에도 반영된다.
//
// 규칙: 글자색(color·fill·stroke)은 어두운 색을 밝게, 배경(background·그림자)은 밝은 색을 어둡게,
// 선(border·outline)은 밝은 선을 어두운 선으로 바꾼다. 초록 단추·다음 경기 카드처럼 이미 진한 배경과
// 그 위의 흰 글자는 그대로 둔다. 색상(hue)은 지켜서 초록은 초록, 주황은 주황으로 남는다.
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const SRC=path.join(root,"app/globals.css"),OUT=path.join(root,"app/dark.css");
const P='html[data-theme="dark"]';

const hex2rgb=h=>{h=h.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join("");return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).concat(h.length===8?[parseInt(h.slice(6,8),16)/255]:[])};
function rgb2hsl([r,g,b]){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
 if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return [h,s,l]}
function hsl2hex(h,s,l){const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1))};
 return "#"+[f(0),f(8),f(4)].map(x=>Math.round(Math.max(0,Math.min(1,x))*255).toString(16).padStart(2,"0")).join("")}
const alpha=(hex,a)=>a===undefined||a>=1?hex:hex+Math.round(a*255).toString(16).padStart(2,"0");

function convert(hex,kind){
 const c=hex2rgb(hex),[h,s,l]=rgb2hsl(c),a=c[3];
 if(kind==="text"){ if(l>=.7)return null; return alpha(hsl2hex(h,s<.35?0:Math.min(s,.55),.93-l*.55),a); }
 // 1.19: 바탕·선은 초록 기운을 빼고 검정·회색으로(사장님 요청 — "짙은 초록이 이상하다").
 // 연한 초록·회녹색 면(채도 낮음)은 완전한 회색으로, 주황·빨강처럼 뚜렷한 색만 색조를 조금 남긴다.
 const tinted=s>=.5&&!(h>.3&&h<.5),hue=h,sat=v=>tinted?Math.min(s,v):0;
 if(kind==="bg"){ if(l<.8)return null; if(l>=.99&&a===undefined)return "var(--card)"; return alpha(hsl2hex(hue,sat(.3),.1+(1-l)*1.1),a); }
 if(kind==="line"){ if(l<.75)return null; if(l>=.99&&a===undefined)return "var(--border)"; return alpha(hsl2hex(hue,sat(.18),.2+(1-l)*.6),a); }
 return null;
}
const kindOf=prop=>/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)?"text"
 :/^(background|background-color|background-image|box-shadow)$/.test(prop)?"bg"
 :/^(border|border-(top|right|bottom|left)|border(-(top|right|bottom|left))?-color|outline|outline-color|column-rule)$/.test(prop)?"line":null;

function decls(body){
 const out=[];
 // 1.19: 라임 단추처럼 다크에서도 그대로 남는 밝은 바탕 위 글자는 어두운 채로 둔다(밝게 바꾸면 안 보인다).
 const bgm=body.match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})\b/);
 const keepText=!!bgm&&convert(bgm[1],"bg")===null&&rgb2hsl(hex2rgb(bgm[1]))[2]>=.55;
 for(const part of body.split(/;(?![^(]*\))/)){
  const i=part.indexOf(":");if(i<0)continue;
  const prop=part.slice(0,i).trim(),val=part.slice(i+1).trim();const kind=kindOf(prop);if(!kind)continue;
  if(kind==="text"&&keepText){out.push(prop+":"+val);continue}
  const nv=val.replace(/#[0-9a-fA-F]{3,8}\b|\bwhite\b/g,m=>{const hx=m==="white"?"#ffffff":m;const x=convert(hx,kind);return x??m});
  // 바뀌지 않은 색 선언도 함께 낸다. 다크 규칙은 모두 같은 만큼 구체성이 올라가므로, 원래 순서(.btn 다음 .btn-green)를
  // 그대로 지키려면 초록 단추의 초록 배경도 다시 적어 줘야 앞의 .btn 다크 규칙에 덮이지 않는다.
  out.push(prop+":"+nv);
 }
 return out;
}
const scope=sel=>sel.split(/,(?![^(]*\))/).map(x=>{x=x.trim();if(!x)return x;
 if(x===":root"||x==="html")return P;if(x.startsWith(":root"))return P+x.slice(5);if(x.startsWith("html"))return P+x.slice(4);
 return P+" "+x}).join(",");

// 중괄호 짝을 맞춰 규칙을 나눈다. @media 는 안쪽을 다시 처리하고, @theme·@keyframes·@font-face 는 건너뛴다.
function walk(css){
 let out="",i=0;
 while(i<css.length){
  const open=css.indexOf("{",i);if(open<0)break;
  let head=css.slice(i,open).replace(/\/\*[\s\S]*?\*\//g,"").trim();
  // 머리 앞의 ; 로 끝나는 문(@import 등)을 떼어낸다
  const semi=head.lastIndexOf(";");if(semi>=0)head=head.slice(semi+1).trim();
  let depth=1,j=open+1;while(j<css.length&&depth){if(css[j]==="{")depth++;else if(css[j]==="}")depth--;j++}
  const body=css.slice(open+1,j-1);i=j;
  if(!head)continue;
  if(head.startsWith("@media")||head.startsWith("@supports")){const inner=walk(body);if(inner)out+=head+"{"+inner+"}\n";continue}
  if(head.startsWith("@"))continue;
  const d=decls(body);if(d.length)out+=scope(head)+"{"+d.join(";")+"}\n";
 }
 return out;
}

// shadcn 변수(:root)는 손으로 정한 값을 쓴다. 자동 변환보다 이 값들이 화면 전체 바탕이라 따로 맞춘다.
const BASE=`${P}{color-scheme:dark;--background:#0e0e11;--foreground:#ececee;--card:#1b1b1f;--card-foreground:#ececee;--popover:#1f1f23;--popover-foreground:#ececee;--primary:#1f9d62;--primary-foreground:#fff;--secondary:#25252a;--secondary-foreground:#d4d4d8;--muted:#222227;--muted-foreground:#9a9aa2;--accent:#25252a;--accent-foreground:#7fd6a7;--destructive:#e0685f;--border:#35353c;--input:#3a3a41;--ring:#2fb574;--sidebar:#111114;--sidebar-foreground:#c4c4ca;--sidebar-primary:#2fb574;--sidebar-primary-foreground:#fff;--sidebar-accent:#25252a;--sidebar-accent-foreground:#7fd6a7;--sidebar-border:#2a2a30;--sidebar-ring:#2fb574}
${P} body{background:var(--background);color:var(--foreground)}
${P} .bg-white{background:var(--card)!important}
${P} img{opacity:.96}
`;
// 자동 변환 뒤에 덧붙이는 손질(자동 규칙이 맞지 않는 곳).
// 1.21: 매칭 탭 카드처럼 다른 화면의 구역(.panel)도 카드 바탕·테두리로 나눈다(사장님 메모 — "조금만 더 구분, 매칭 탭 느낌 좋음").
const TAIL=`${P}{--band:#08080a}
${P} .switch::after{background:#ececee}
${P} .seg{background:#232328}
${P} .seg button.on{background:#34343a;color:#7fd6a7}
${P} .next-match{background:#1b1b1f;background-image:radial-gradient(ellipse at 95% 0%,#1f9d6233,transparent 60%);border:1px solid #303036}
${P} .bottom-nav{background:#0e0e11fa}
${P} .match-arrow{background:#000000cc;border-color:#ffffff22}
${P} .panel,${P} .vote-box,${P} .setup-card{background:var(--card);border:1px solid #3a3a41;border-radius:14px;padding:18px 16px}
${P} .panel .panel{border:0;padding:0;background:transparent}
${P} .main-column>section.panel,${P} .right-column>section.panel,${P} .two-col>section.panel,${P} .gap-grid>section.panel,${P} [data-slot=tabs-content]>section.panel{margin-inline:0;border-top:1px solid #3a3a41;padding:20px 16px 14px}
${P} .rec-block+.rec-block{border-top:0;margin-inline:0;padding-inline:0}
${P} .rec-block>[data-slot=tabs]>[data-slot=tabs-content]>section.panel:first-child{padding:16px 12px;border-top:1px solid #3a3a41}
${P} .bottom-nav{border-top-color:#2c2c32}
${P} .chip-mini.on{background:#3fbf6a;border-color:#3fbf6a;color:#08140d}
${P} .podium-step,${P} .place-1 .podium-step,${P} .place-2 .podium-step,${P} .place-3 .podium-step{background:linear-gradient(180deg,#3a3e44 0,#2c2f34 100%);border-top:3px solid #3fbf6a}
`;

const css=fs.readFileSync(SRC,"utf8");
const text="/* 자동 생성 — 손으로 고치지 말고 scripts/dark-css.mjs 를 돌린다. 원본: app/globals.css */\n"+BASE+walk(css)+TAIL;
if(process.argv.includes("--check")){
 const now=fs.existsSync(OUT)?fs.readFileSync(OUT,"utf8"):"";
 if(now!==text){console.error("app/dark.css 가 globals.css 와 맞지 않아요. node scripts/dark-css.mjs 를 돌려주세요.");process.exit(1)}
 console.log("dark.css ok");
}else{fs.writeFileSync(OUT,text);console.log("wrote",path.relative(root,OUT),text.length,"bytes")}
