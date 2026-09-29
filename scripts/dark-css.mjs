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
 if(kind==="text"){ if(l>=.7)return null; return alpha(hsl2hex(h,Math.min(s,.55),.93-l*.55),a); }
 // 회색(채도 0)도 팀킥 초록 기운을 조금 섞어 화면 전체가 한 톤으로 보이게 한다.
 const hue=s<.02?.41:h,sat=v=>s<.02?.1:Math.max(Math.min(s,v),.08);
 if(kind==="bg"){ if(l<.8)return null; if(l>=.99&&a===undefined)return "var(--card)"; return alpha(hsl2hex(hue,sat(.3),.1+(1-l)*1.1),a); }
 if(kind==="line"){ if(l<.75)return null; if(l>=.99&&a===undefined)return "var(--border)"; return alpha(hsl2hex(hue,sat(.18),.2+(1-l)*.6),a); }
 return null;
}
const kindOf=prop=>/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)?"text"
 :/^(background|background-color|background-image|box-shadow)$/.test(prop)?"bg"
 :/^(border|border-(top|right|bottom|left)|border(-(top|right|bottom|left))?-color|outline|outline-color|column-rule)$/.test(prop)?"line":null;

function decls(body){
 const out=[];
 for(const part of body.split(/;(?![^(]*\))/)){
  const i=part.indexOf(":");if(i<0)continue;
  const prop=part.slice(0,i).trim(),val=part.slice(i+1).trim();const kind=kindOf(prop);if(!kind)continue;
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
const BASE=`${P}{color-scheme:dark;--background:#0e1512;--foreground:#e6eee9;--card:#151e19;--card-foreground:#e6eee9;--popover:#18221c;--popover-foreground:#e6eee9;--primary:#1f9d62;--primary-foreground:#fff;--secondary:#1d2a23;--secondary-foreground:#cfe0d6;--muted:#1b2520;--muted-foreground:#98a8a0;--accent:#183426;--accent-foreground:#8fdcb2;--destructive:#e0685f;--border:#26332c;--input:#2b3931;--ring:#2fb574;--sidebar:#121a16;--sidebar-foreground:#b9c8c0;--sidebar-primary:#2fb574;--sidebar-primary-foreground:#fff;--sidebar-accent:#183426;--sidebar-accent-foreground:#8fdcb2;--sidebar-border:#22302a;--sidebar-ring:#2fb574}
${P} body{background:var(--background);color:var(--foreground)}
${P} .bg-white{background:var(--card)!important}
${P} img{opacity:.96}
`;
// 자동 변환 뒤에 덧붙이는 손질(자동 규칙이 맞지 않는 곳).
const TAIL=`${P}{--band:#0a100d}
${P} .switch::after{background:#e9f0ec}
${P} .seg{background:#1b2520}
${P} .seg button.on{background:#26352d;color:#8fdcb2}
`;

const css=fs.readFileSync(SRC,"utf8");
const text="/* 자동 생성 — 손으로 고치지 말고 scripts/dark-css.mjs 를 돌린다. 원본: app/globals.css */\n"+BASE+walk(css)+TAIL;
if(process.argv.includes("--check")){
 const now=fs.existsSync(OUT)?fs.readFileSync(OUT,"utf8"):"";
 if(now!==text){console.error("app/dark.css 가 globals.css 와 맞지 않아요. node scripts/dark-css.mjs 를 돌려주세요.");process.exit(1)}
 console.log("dark.css ok");
}else{fs.writeFileSync(OUT,text);console.log("wrote",path.relative(root,OUT),text.length,"bytes")}
