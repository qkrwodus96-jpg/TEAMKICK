"use client";
// 1.19 공유 포스터 — 선수 명단 · 경기(매치데이) 이미지. 사장님 요청: "30년차 디자이너처럼, 인스타 구단 계정 수준으로".
// 참고: 사장님이 보내준 K리그 구단 게시물들의 **구성 방식**(굵은 좁은 제목, 팀 색 배경, 엠블럼 VS 엠블럼,
// 번호+이름 명단, 교체 명단, 날짜·구장 줄)만 참고했다. 다른 구단의 로고·사진·그래픽은 쓰지 않는다.
// 그림은 전부 팀킥이 캔버스로 직접 그리고, 들어가는 사진은 팀이 올린 로고·선수 사진뿐이다.
// 글꼴: Anton(영문 제목) · Black Han Sans(한글 제목) — 둘 다 SIL OFL 1.1, 팀킥 서버(/fonts)에서 내려준다.
import {useEffect,useMemo,useRef,useState} from "react";
import {Download,Share2,LoaderCircle,Star,Palette} from "lucide-react";
import {toast} from "sonner";
import {positionGroup,currentVote,type Row} from "@/lib/model";
import {FORMATIONS,FORMATION_NAMES,slotGroup,placeByPosition,LINE_ORDER} from "@/lib/formations";
import {imageUrl,opponent} from "./teamkick";
import {cutout} from "./cutout";

const W=1080,H=1350;
const EN='"Anton","Black Han Sans","Pretendard Variable",Pretendard,sans-serif';
const KO='"Black Han Sans","Pretendard Variable",Pretendard,sans-serif';
const BODY='"Pretendard Variable",Pretendard,"Apple SD Gothic Neo",sans-serif';
type C=CanvasRenderingContext2D;
type P={id:string;name:string;number:number|null;position:string;group:string;photo?:string;captain?:boolean};
type Theme={bg:string;accent:string;shirt:string;stripe:string};
type Team={name:string;logo?:string;color?:string};
type Photos="cut"|"raw"|"off";
type D={team:Team;opp:Team|null;start?:string;end?:string;venue?:string;round?:number;starters:P[];subs:P[];featured?:P;formation:string;slots:Record<string,P>|null;th:Theme;photos:Photos};

// ───────── 색 ─────────
export const BG_SWATCH=["#0f5c37","#b3121b","#4b2a9c","#1d3fbf","#141414","#e2561b","#1f7fc4","#0b2a4a"];
export const ACCENT_SWATCH=["#c4ef75","#ffffff","#f2c94c","#ff7a1a","#4fd8ff","#ff4d6d"];
export const SHIRT_SWATCH=["#ffffff","#141414","#b3121b","#1d3fbf","#0f5c37","#f2c94c","#4b2a9c","#e2561b"];
const TEAM_HEX:Record<string,string>={green:"#0f5c37",orange:"#e2561b",blue:"#1d3fbf",red:"#b3121b",purple:"#4b2a9c",black:"#141414",yellow:"#c99a06"};
const hex2rgb=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a:string,b:string,t:number)=>{const x=hex2rgb(a),y=hex2rgb(b);return "#"+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0")).join("")};
const lum=(h:string)=>{const [r,g,b]=hex2rgb(h).map(v=>v/255);return .2126*r+.7152*g+.0722*b};
const ink=(h:string)=>lum(h)>.6?"#111111":"#ffffff";
const rgba=(h:string,a:number)=>{const [r,g,b]=hex2rgb(h);return `rgba(${r},${g},${b},${a})`};
export const themeOf=(team:Row|null|undefined):Theme=>{const k=team?.kit;const base=TEAM_HEX[String(team?.color??"")]??"#0f5c37";
 return {bg:k?.bg||base,accent:k?.accent||"#c4ef75",shirt:k?.shirt||"#ffffff",stripe:k?.stripe||""}};

// ───────── 그리기 도구 ─────────
const f=(ctx:C,size:number,fam=BODY,weight="400")=>{ctx.font=`${weight} ${size}px ${fam}`};
function fit(ctx:C,text:string,max:number,size:number,fam=BODY,weight="400",min=14){let s=size;f(ctx,s,fam,weight);while(ctx.measureText(text).width>max&&s>min){s-=2;f(ctx,s,fam,weight)}return s}
function rr(ctx:C,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
const cache=new Map<string,Promise<HTMLImageElement|null>>();
function img(src?:string){if(!src)return Promise.resolve(null);if(!cache.has(src))cache.set(src,new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src}));return cache.get(src)!}
// 1.20 사진: 배경 지운 것(기기 안에서) · 원본(자르지 않음) · 안 넣기. 사진에 색을 덧입히지 않는다.
type Pic={src:CanvasImageSource;w:number;h:number;cut:boolean};
// 네 귀퉁이가 투명하면 배경을 지운 사진으로 본다.
function clear(im:HTMLImageElement){
 try{const c=document.createElement("canvas");c.width=16;c.height=16;const x=c.getContext("2d",{willReadFrequently:true})!;x.drawImage(im,0,0,16,16);
  const d=x.getImageData(0,0,16,16).data,at=(i:number,j:number)=>d[(j*16+i)*4+3];return at(0,0)<20&&at(15,0)<20}catch{return false}
}
async function pic(p:P|undefined,mode:Photos):Promise<Pic|null>{
 if(!p?.photo||mode==="off")return null;const im=await img(imageUrl(p.photo));if(!im)return null;
 // 1.21 올릴 때 이미 배경을 지운 사진(투명 PNG)은 다시 지우지 않는다.
 if(clear(im))return {src:im,w:im.naturalWidth||im.width,h:im.naturalHeight||im.height,cut:true};
 if(mode==="cut"){const c=await cutout(p.photo,im);if(c)return {src:c,w:c.width,h:c.height,cut:true}}
 return {src:im,w:im.naturalWidth||im.width,h:im.naturalHeight||im.height,cut:false};
}
// 칸 안에 사진을 **자르지 않고** 넣는다. 배경 지운 사진은 바닥에 붙여 세우고, 원본은 흐린 같은 사진을 뒤에 깔고 가운데.
function drawPic(ctx:C,q:Pic,x:number,y:number,w:number,h:number){
 const s=Math.min(w/q.w,h/q.h),dw=q.w*s,dh=q.h*s;
 if(q.cut){ctx.save();ctx.shadowColor="rgba(0,0,0,.45)";ctx.shadowBlur=24;ctx.shadowOffsetY=6;ctx.drawImage(q.src,x+w/2-dw/2,y+h-dh,dw,dh);ctx.restore();return}
 const c=Math.max(w/q.w,h/q.h);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.filter="blur(22px) brightness(.5)";ctx.drawImage(q.src,x+w/2-q.w*c/2,y+h/2-q.h*c/2,q.w*c,q.h*c);ctx.filter="none";
 ctx.drawImage(q.src,x+w/2-dw/2,y+h/2-dh/2,dw,dh);ctx.restore();
}
const short=(name:string)=>name.replace(/\s+/g," ").trim();
const initials=(name:string)=>{const x=name.replace(/\s|FC|F\.C\.|유나이티드|UNITED/gi,"");return (x.slice(0,2)||"?").toUpperCase()};
// 위로 갈수록 좁아지는 큰 영문 제목(세로로 늘린 Anton)
function tall(ctx:C,text:string,x:number,y:number,size:number,stretch=1.25,align:CanvasTextAlign="left",max=W){
 ctx.save();f(ctx,size,EN);let s=size;while(ctx.measureText(text).width>max&&s>20){s-=4;f(ctx,s,EN)}
 ctx.translate(x,y);ctx.scale(1,stretch);ctx.textAlign=align;ctx.textBaseline="alphabetic";ctx.fillText(text,0,0);ctx.restore();return s}
async function crest(ctx:C,t:Team,cx:number,cy:number,r:number,ring:string){
 const im=await img(t.logo?imageUrl(t.logo):undefined);
 // 1.21: 팀 로고는 보통 동그라미라 동그라미 안에 넣는다(사장님 요청). 로고는 잘리지 않게 전부 보이게 —
 // 귀퉁이가 비어 있는(둥근) 로고는 원을 꽉 채우고, 네모난 로고는 원 안에 다 들어가게 줄인다.
 const base=TEAM_HEX[String(t.color??"")]??"#2a2f2c";
 ctx.save();ctx.shadowColor="rgba(0,0,0,.35)";ctx.shadowBlur=14;ctx.shadowOffsetY=4;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=im?"#ffffff":base;ctx.fill();ctx.restore();
 // 1.23: 앱 화면처럼 흰색·투명 여백을 잘라 낸 뒤 원을 꽉 채운다(사장님 요청 — 원 안에 네모 사진이 보이던 것).
 if(im){const b=contentBox(im),s=Math.max(2*r/b.w,2*r/b.h);
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();ctx.drawImage(im,b.x,b.y,b.w,b.h,cx-b.w*s/2,cy-b.h*s/2,b.w*s,b.h*s);ctx.restore()}
 else{ctx.save();ctx.fillStyle="#fff";f(ctx,r*0.78,EN);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(initials(t.name),cx,cy+r*0.04);ctx.restore()}
 ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.lineWidth=Math.max(3,r*.05);ctx.strokeStyle=ring;ctx.stroke();
}
// 엠블럼 사이 VS 표시(마름모 테두리 + 글자)
function vsMark(ctx:C,x:number,y:number,th:Theme){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeStyle=th.accent;ctx.lineWidth=4;ctx.strokeRect(-34,-34,68,68);ctx.restore();
 ctx.save();ctx.fillStyle=th.accent;f(ctx,44,EN);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("VS",x,y+2);ctx.restore();
}
// 그림에서 흰색·투명이 아닌 부분의 상자(원본 좌표). 여백이 없으면 그림 전체.
function contentBox(im:HTMLImageElement){
 const W0=im.naturalWidth||im.width,H0=im.naturalHeight||im.height,all={x:0,y:0,w:W0,h:H0};
 try{const k=Math.min(1,160/Math.max(W0,H0)),w=Math.max(1,Math.round(W0*k)),h=Math.max(1,Math.round(H0*k));const c=document.createElement("canvas");c.width=w;c.height=h;
  const x=c.getContext("2d",{willReadFrequently:true})!;x.drawImage(im,0,0,w,h);const d=x.getImageData(0,0,w,h).data;let l=w,r=-1,t=h,b=-1;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const q=(j*w+i)*4;if(d[q+3]>24&&!(d[q]>236&&d[q+1]>236&&d[q+2]>236)){if(i<l)l=i;if(i>r)r=i;if(j<t)t=j;if(j>b)b=j}}
  if(r<l||b<t)return all;const bw=(r-l+1)/k,bh=(b-t+1)/k;if(bw>=W0*.92&&bh>=H0*.92)return all;
  const side=Math.max(bw,bh)*1.02,cx=(l+r+1)/2/k,cy=(t+b+1)/2/k;return {x:cx-side/2,y:cy-side/2,w:side,h:side};
 }catch{return all}
}
// 바탕: 팀 색 그라데이션 + 비스듬한 가는 줄무늬 + 가장자리 어둡게
function backdrop(ctx:C,th:Theme,angle=-0.5){
 const g=ctx.createLinearGradient(0,0,W*0.4,H);g.addColorStop(0,mix(th.bg,"#ffffff",.06));g.addColorStop(.55,th.bg);g.addColorStop(1,mix(th.bg,"#000000",.62));
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(W/2,H/2);ctx.rotate(angle);ctx.strokeStyle="rgba(255,255,255,.045)";ctx.lineWidth=2;
 for(let x=-H;x<H;x+=26){ctx.beginPath();ctx.moveTo(x,-H);ctx.lineTo(x,H);ctx.stroke()}ctx.restore();
 const v=ctx.createRadialGradient(W*.5,H*.42,H*.25,W*.5,H*.5,H*.85);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.55)");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
// 고운 입자(인쇄물 느낌). 같은 무늬가 나오게 고정 난수.
let noise:HTMLCanvasElement|null=null;
function grain(ctx:C,alpha=.08){
 if(!noise){noise=document.createElement("canvas");noise.width=noise.height=220;const n=noise.getContext("2d")!;const id=n.createImageData(220,220);let r=7;
  for(let i=0;i<id.data.length;i+=4){r=(r*16807)%2147483647;const v=r%255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}n.putImageData(id,0,0)}
 ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation="overlay";ctx.fillStyle=ctx.createPattern(noise,"repeat")!;ctx.fillRect(0,0,W,H);ctx.restore();
}
// 마름모 무늬(유니폼 원단 같은 결)
function argyle(ctx:C,size=150){
 ctx.save();for(let r=-1;r<H/size*2+2;r++)for(let c=-1;c<W/size+2;c++){const cx=c*size+(r%2?size/2:0),cy=r*size/2;
  ctx.beginPath();ctx.moveTo(cx,cy-size/2);ctx.lineTo(cx+size/2,cy);ctx.lineTo(cx,cy+size/2);ctx.lineTo(cx-size/2,cy);ctx.closePath();
  ctx.fillStyle=(r+c)%2?"rgba(255,255,255,.035)":"rgba(0,0,0,.07)";ctx.fill()}ctx.restore();
}
// 커튼처럼 휘는 빛줄기
function curtain(ctx:C,x0:number,x1:number){
 ctx.save();const n=Math.max(4,Math.round((x1-x0)/56));const bw=(x1-x0)/n;
 for(let i=0;i<n;i++){const x=x0+i*bw;const g=ctx.createLinearGradient(x,0,x+bw,0);g.addColorStop(0,"rgba(0,0,0,.26)");g.addColorStop(.45,"rgba(255,255,255,.09)");g.addColorStop(1,"rgba(0,0,0,.26)");
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+bw*.9,H*.32,x-bw*.6,H*.68,x+bw*.4,H);ctx.lineTo(x+bw*1.4,H);ctx.bezierCurveTo(x+bw*.4,H*.68,x+bw*1.9,H*.32,x+bw,0);ctx.closePath();ctx.fill()}
 ctx.restore();
}
function glow(ctx:C,x:number,y:number,r:number,color:string,a=.35){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,a));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
// "2026 MATCH | ROUND 7" 같은 작은 머리표
function roundTag(ctx:C,d:D,x:number,y:number,align:CanvasTextAlign="left",size=26){
 const w=when(d),left=(w?w.y+" ":"")+(d.opp?"TEAMKICK MATCH":"TEAMKICK SQUAD"),tag=d.round?"ROUND "+d.round:"";
 f(ctx,size,EN);const lw=ctx.measureText(left).width,tw=tag?ctx.measureText(tag).width+16:0,total=lw+(tag?12+tw:0);
 const sx=align==="center"?x-total/2:align==="right"?x-total:x;ctx.textAlign="left";ctx.textBaseline="alphabetic";
 ctx.fillStyle="#fff";ctx.fillText(left,sx,y);
 if(tag){const bx=sx+lw+12;ctx.fillStyle="#fff";ctx.fillRect(bx,y-size*.86,tw,size*1.04);ctx.fillStyle="#111";ctx.fillText(tag,bx+8,y)}
}
const DOW_EN=["SUN","MON","TUE","WED","THU","FRI","SAT"];
function when(d:D){if(!d.start)return null;const k=new Date(Date.parse(d.start)+9*3600e3);
 return {md:(k.getUTCMonth()+1)+"."+String(k.getUTCDate()).padStart(2,"0"),dow:DOW_EN[k.getUTCDay()],hm:String(k.getUTCHours()).padStart(2,"0")+":"+String(k.getUTCMinutes()).padStart(2,"0"),y:k.getUTCFullYear()}}
function brand(ctx:C,color:string,x=W-48,y=H-40){ctx.fillStyle=color;f(ctx,22,EN);ctx.textAlign="right";ctx.textBaseline="alphabetic";ctx.fillText("TEAMKICK",x,y)}
// 등번호가 없거나 0(안 정함)이면 비운다(1.22 — 포스터에 "0" 이 찍히던 것).
const no=(p:P)=>p.number==null||Number(p.number)===0?"":String(p.number);
// 선수 사진 칸: 사진이 있으면 꽉 채우고, 없으면 팀 색 바탕에 유니폼 실루엣 + 등번호
async function portrait(ctx:C,p:P,x:number,y:number,w:number,h:number,r:number,th:Theme,mode:Photos){
 const im=await pic(p,mode);ctx.save();rr(ctx,x,y,w,h,r);ctx.clip();
 const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,mix(th.bg,"#ffffff",.12));g.addColorStop(1,mix(th.bg,"#000000",.55));ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
 if(im){if(im.cut)glow(ctx,x+w/2,y+h*.45,Math.max(w,h)*.6,"#ffffff",.16);drawPic(ctx,im,x,y+(im.cut?h*.04:0),w,h-(im.cut?h*.04:0))}
 else bust(ctx,x+w/2,y,w,h,th,p.group==="GK");
 const shade=ctx.createLinearGradient(x,y+h*.45,x,y+h);shade.addColorStop(0,"rgba(0,0,0,0)");shade.addColorStop(1,"rgba(0,0,0,.78)");ctx.fillStyle=shade;ctx.fillRect(x,y,w,h);
 ctx.restore();
}
// 사진이 없는 선수: 사람 윗몸 실루엣 + 우리 유니폼. 뒤에서 빛이 비치는 느낌.
function bust(ctx:C,cx:number,top:number,w:number,h:number,th:Theme,gk=false){
 glow(ctx,cx,top+h*.38,Math.max(w,h)*.55,"#ffffff",.16);
 const shirt=gk?th.accent:th.shirt,sh=top+h*.6;
 ctx.save();ctx.beginPath();ctx.moveTo(cx-w*.52,top+h);ctx.bezierCurveTo(cx-w*.5,sh+h*.08,cx-w*.36,sh,cx-w*.13,sh-h*.02);ctx.lineTo(cx+w*.13,sh-h*.02);ctx.bezierCurveTo(cx+w*.36,sh,cx+w*.5,sh+h*.08,cx+w*.52,top+h);ctx.closePath();
 const g=ctx.createLinearGradient(0,sh,0,top+h);g.addColorStop(0,mix(shirt,"#ffffff",.1));g.addColorStop(1,mix(shirt,"#000000",.45));ctx.fillStyle=g;ctx.fill();
 if(th.stripe&&!gk){ctx.clip();ctx.fillStyle=rgba(th.stripe,.9);for(let x=cx-w*.5;x<cx+w*.5;x+=w*.14)ctx.fillRect(x,sh-h*.05,w*.06,h*.5)}
 ctx.restore();
 ctx.beginPath();ctx.moveTo(cx-w*.11,sh-h*.02);ctx.lineTo(cx,sh+h*.08);ctx.lineTo(cx+w*.11,sh-h*.02);ctx.strokeStyle=rgba(ink(shirt),.55);ctx.lineWidth=Math.max(2,w*.012);ctx.stroke();
 const head=ctx.createLinearGradient(0,top+h*.16,0,top+h*.58);head.addColorStop(0,"rgba(18,18,20,.82)");head.addColorStop(1,"rgba(8,8,10,.92)");ctx.fillStyle=head;
 ctx.beginPath();ctx.ellipse(cx,top+h*.36,w*.15,h*.17,0,0,Math.PI*2);ctx.fill();ctx.fillRect(cx-w*.06,top+h*.48,w*.12,h*.1);
}
// 유니폼 모양(직접 그린 단순 도형). GK 는 포인트 색.
function jersey(ctx:C,cx:number,cy:number,s:number,th:Theme,label:string,gk=false){
 const body=gk?th.accent:th.shirt,line=gk?mix(th.accent,"#000000",.35):mix(th.shirt,lum(th.shirt)>.6?"#000000":"#ffffff",.25);
 ctx.save();ctx.translate(cx-50*s,cy-50*s);ctx.scale(s,s);
 const path=()=>{ctx.beginPath();ctx.moveTo(32,6);ctx.lineTo(14,13);ctx.lineTo(2,34);ctx.lineTo(16,43);ctx.lineTo(22,35);ctx.lineTo(22,94);ctx.lineTo(78,94);ctx.lineTo(78,35);ctx.lineTo(84,43);ctx.lineTo(98,34);ctx.lineTo(86,13);ctx.lineTo(68,6);ctx.quadraticCurveTo(50,20,32,6);ctx.closePath()};
 path();ctx.shadowColor="rgba(0,0,0,.35)";ctx.shadowBlur=10;ctx.shadowOffsetY=4;ctx.fillStyle=body;ctx.fill();ctx.shadowColor="transparent";
 if(th.stripe&&!gk){ctx.save();path();ctx.clip();ctx.fillStyle=th.stripe;for(let x=24;x<80;x+=16)ctx.fillRect(x,0,7,100);ctx.restore()}
 path();ctx.lineWidth=2.4;ctx.strokeStyle=line;ctx.stroke();
 if(!label){ctx.restore();return}
 const numInk=gk?ink(th.accent):(th.stripe?"#ffffff":ink(th.shirt));
 ctx.fillStyle=numInk;f(ctx,label.length>2?30:44,EN);ctx.textAlign="center";ctx.textBaseline="middle";
 if(th.stripe&&!gk){ctx.lineWidth=5;ctx.strokeStyle="rgba(0,0,0,.55)";ctx.strokeText(label,50,60)}
 ctx.fillText(label,50,60);ctx.restore();
}
function cBadge(ctx:C,x:number,y:number,r:number,th:Theme){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=th.accent;ctx.fill();ctx.fillStyle=ink(th.accent);f(ctx,r*1.2,EN);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("C",x,y+1)}
function subsLine(d:D){return d.subs.map(p=>(no(p)?no(p)+" ":"")+short(p.name))}
function wrapRow(ctx:C,items:string[],x:number,y:number,max:number,lh:number,gap=26,maxLines=2){
 let cx=x,line=0;for(const it of items){const w=ctx.measureText(it).width;if(cx>x&&cx+w>x+max){line++;cx=x;if(line>=maxLines)return}ctx.fillText(it,cx,y+line*lh);cx+=w+gap}}

// ───────── 1. STARTING XI · 카드 격자 ─────────
async function tplGrid(ctx:C,d:D){
 const th=d.th;backdrop(ctx,th,-.4);argyle(ctx);glow(ctx,W*.2,0,520,th.accent,.12);
 await crest(ctx,d.team,124,126,82,"#ffffff");
 ctx.fillStyle="#ffffff";const s=tall(ctx,"STARTING",230,170,112,1.18,"left",400);
 const sw=(()=>{f(ctx,s,EN);return ctx.measureText("STARTING").width})();ctx.save();ctx.translate(230+sw+18,170);ctx.transform(1,0,-.2,1,0,0);ctx.fillStyle=th.accent;tall(ctx,"XI",0,0,s*1.08,1.18);ctx.restore();
 // 오른쪽 띠: 경기 정보 + 교체
 const PX=772,PW=W-PX-40,PY=234,PH=H-PY-90;
 ctx.fillStyle="rgba(0,0,0,.42)";ctx.fillRect(PX,PY,PW,PH);ctx.fillStyle=th.accent;ctx.fillRect(PX,PY,PW,6);
 const w=when(d);ctx.textAlign="center";ctx.textBaseline="alphabetic";
 if(w&&d.round){ctx.fillStyle=th.accent;f(ctx,24,EN);ctx.fillText(w.md+" "+w.dow+" "+w.hm,PX+PW/2,PY+44);ctx.fillStyle="#fff";tall(ctx,String(d.round),PX+PW/2,PY+132,86,1.1,"center",PW-30);f(ctx,30,EN);ctx.fillText("ROUND",PX+PW/2,PY+172)}
 else if(w){ctx.fillStyle="#fff";tall(ctx,w.md,PX+PW/2,PY+112,86,1.1,"center",PW-30);ctx.fillStyle=th.accent;f(ctx,30,EN);ctx.fillText(w.dow+"  "+w.hm,PX+PW/2,PY+160)}
 else{ctx.fillStyle="#fff";tall(ctx,"SQUAD",PX+PW/2,PY+112,70,1.1,"center",PW-30);ctx.fillStyle=th.accent;f(ctx,30,EN);ctx.fillText(String(new Date().getFullYear()),PX+PW/2,PY+160)}
 let y=PY+196;ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(PX+20,y,PW-40,2);y+=26;
 const teamRow=async(t:Team,yy:number)=>{await crest(ctx,t,PX+62,yy+38,36,"rgba(255,255,255,.9)");ctx.fillStyle="#fff";ctx.textAlign="left";fit(ctx,short(t.name),PW-120,32,KO);ctx.textBaseline="middle";ctx.fillText(short(t.name),PX+110,yy+40);ctx.textBaseline="alphabetic"};
 await teamRow(d.team,y);
 if(d.opp){ctx.save();ctx.translate(PX+PW/2,y+112);ctx.rotate(Math.PI/4);ctx.strokeStyle=th.accent;ctx.lineWidth=3;ctx.strokeRect(-20,-20,40,40);ctx.restore();ctx.fillStyle=th.accent;f(ctx,26,EN);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("VS",PX+PW/2,y+113);ctx.textBaseline="alphabetic";
  await teamRow(d.opp,y+150);y+=250}else y+=96;
 ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(PX+20,y,PW-40,2);y+=54;
 ctx.fillStyle=th.accent;f(ctx,34,EN);ctx.textAlign="left";ctx.fillText("SUBS",PX+28,y);y+=18;
 const room=Math.floor((PY+PH-y-20)/44);
 d.subs.slice(0,room).forEach((p,i)=>{const yy=y+30+i*44;ctx.fillStyle=th.accent;f(ctx,26,EN);ctx.textAlign="right";ctx.fillText(no(p)||"-",PX+76,yy);ctx.fillStyle="#fff";ctx.textAlign="left";fit(ctx,short(p.name),PW-110,28,KO);ctx.fillText(short(p.name),PX+92,yy)});
 if(d.subs.length>room&&room>0){ctx.fillStyle="rgba(255,255,255,.6)";f(ctx,22,BODY,"700");ctx.textAlign="left";ctx.fillText("외 "+(d.subs.length-room)+"명",PX+92,y+30+room*44)}
 if(!d.subs.length){ctx.fillStyle="rgba(255,255,255,.5)";f(ctx,24,BODY,"600");ctx.textAlign="left";ctx.fillText("—",PX+28,y+40)}
 // 왼쪽 카드 3×4: 선발 11 + 팀 카드
 // 1.22 선발이 적으면 줄 수를 줄여 빈 칸을 없앤다(마지막 칸은 팀 카드).
 const list=d.starters.slice(0,11),cols=3,rows=Math.max(2,Math.ceil((list.length+1)/cols)),total=rows*cols;
 const GX=40,GY=234,GW=PX-GX-16,GH=PH,gap=10,cw=(GW-gap*(cols-1))/cols,ch=(GH-gap*(rows-1))/rows;
 for(let i=0;i<total;i++){const x=GX+(i%cols)*(cw+gap),yy=GY+Math.floor(i/cols)*(ch+gap);
  if(i<list.length){const p=list[i];await portrait(ctx,p,x,yy,cw,ch,6,th,d.photos);
   ctx.fillStyle="#fff";ctx.textAlign="left";ctx.textBaseline="alphabetic";
   if(no(p)){ctx.save();ctx.translate(x+16,yy+ch-58);ctx.transform(1,0,-.12,1,0,0);f(ctx,58,EN);ctx.fillText(no(p),0,0);ctx.restore()}
   fit(ctx,short(p.name),cw-30,34,KO);ctx.fillText(short(p.name),x+16,yy+ch-16);
   if(p.captain)cBadge(ctx,x+cw-28,yy+28,18,th);}
  else if(i===total-1){ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(x,yy,cw,ch);await crest(ctx,d.team,x+cw/2,yy+ch/2-22,Math.min(cw,ch)*.3,th.accent);ctx.fillStyle="#fff";ctx.textAlign="center";fit(ctx,short(d.team.name),cw-24,26,KO);ctx.fillText(short(d.team.name),x+cw/2,yy+ch-30)}
  else{ctx.fillStyle="rgba(0,0,0,.25)";ctx.fillRect(x,yy,cw,ch)}}
 grain(ctx);ctx.fillStyle="rgba(255,255,255,.75)";f(ctx,24,BODY,"700");ctx.textAlign="left";ctx.textBaseline="alphabetic";if(d.venue)ctx.fillText(d.venue,40,H-42);brand(ctx,"rgba(255,255,255,.75)");
}

// ───────── 2. LINEUP · 포메이션 ─────────
// 1.20 포지션대로 자리 넣기(규칙은 lib/formations.ts placeByPosition — 라인업 자동 분배와 같다).
export const byLine=(a:P,b:P)=>LINE_ORDER.indexOf(a.group)-LINE_ORDER.indexOf(b.group)||(a.number??999)-(b.number??999);
function placeOnFormation(d:D){
 const slots=FORMATIONS[d.formation]??FORMATIONS["4-4-2"];
 if(d.slots)return slots.map(s=>({s,p:d.slots![s.k]})).filter(x=>x.p) as {s:{k:string;x:number;y:number};p:P}[];
 const placed=placeByPosition(d.formation,d.starters);
 return slots.filter(s=>placed[s.k]).map(s=>({s,p:placed[s.k]}));
}
// 참여 인원의 포지션 수에 가장 가까운 포메이션(라인업 탭에 정한 게 없을 때 처음 고른다)
export function autoFormation(ps:P[]){
 const cnt=(g:string)=>ps.filter(p=>p.group===g).length;let best="4-4-2",score=1e9;
 for(const name of FORMATION_NAMES){const sl=FORMATIONS[name];const c=(g:string)=>sl.filter(x=>slotGroup(x.k)===g).length;
  const sc=Math.abs(c("DF")-cnt("DF"))+Math.abs(c("MF")-cnt("MF"))+Math.abs(c("FW")-cnt("FW"));if(sc<score){score=sc;best=name}}
 return best;
}
async function tplLineup(ctx:C,d:D){
 const th=d.th;backdrop(ctx,th,.5);curtain(ctx,0,W*.42);glow(ctx,W*.72,H*.35,560,th.accent,.1);
 // 왼쪽 큰 곡선 띠
 ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(330,0);ctx.bezierCurveTo(250,H*.35,250,H*.65,360,H);ctx.lineTo(0,H);ctx.closePath();ctx.fillStyle="rgba(0,0,0,.28)";ctx.fill();ctx.restore();
 const LX=36,LW=300;
 // 엠블럼 두 칸
 const box=118,by=170;await crest(ctx,d.team,LX+box/2,by+box/2,52,"rgba(255,255,255,.8)");
 if(d.opp)await crest(ctx,d.opp,LX+box*1.55,by+box/2,52,"rgba(255,255,255,.8)");
 ctx.fillStyle="rgba(255,255,255,.85)";f(ctx,24,EN);ctx.textAlign="left";ctx.textBaseline="alphabetic";
 const w=when(d);roundTag(ctx,d,LX,by+box+44,"left",22);
 ctx.fillStyle="#fff";tall(ctx,"LINE",LX-4,by+box+262,170,1.32,"left",LW);tall(ctx,"UP",LX-4,by+box+500,170,1.32,"left",LW);
 if(w){ctx.fillStyle="#fff";f(ctx,46,EN);ctx.fillText(w.md+"."+w.dow+" "+w.hm,LX,by+box+584)}
 if(d.venue){ctx.fillStyle="#fff";fit(ctx,d.venue,LW-10,32,KO);ctx.fillText(d.venue,LX,by+box+634)}
 if(d.opp){ctx.fillStyle=th.accent;fit(ctx,"vs "+short(d.opp.name),LW-10,30,KO);ctx.fillText("vs "+short(d.opp.name),LX,by+box+680)}
 // 오른쪽 포메이션
 const AX=370,AW=W-AX-30,cw=118,ch=136;
 for(const {s,p} of placeOnFormation(d)){
  const cx=AX+AW*s.x/100,cy=130+(s.y-15)/77*950;const x=cx-cw/2,y=cy-ch/2;
  ctx.save();rr(ctx,x,y,cw,ch,22);ctx.fillStyle=mix(th.bg,"#ffffff",.12);ctx.fill();ctx.restore();
  await portrait(ctx,{...p},x,y,cw,ch,22,th,d.photos);
  ctx.save();rr(ctx,x,y,cw,ch,22);ctx.lineWidth=3;ctx.strokeStyle=rgba(th.accent,.55);ctx.stroke();ctx.restore();
  if(no(p)){rr(ctx,x-10,y+ch-40,62,34,17);ctx.fillStyle=mix(th.bg,"#000000",.35);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=th.accent;ctx.stroke();ctx.fillStyle="#fff";f(ctx,26,EN);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(no(p),x+21,y+ch-22)}
  if(p.captain)cBadge(ctx,x+cw-6,y+ch-22,16,th);
  ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="alphabetic";fit(ctx,short(p.name),cw+40,28,KO);ctx.fillText(short(p.name),cx,y+ch+34);
 }
 // 교체
 if(d.subs.length){ctx.fillStyle="#fff";tall(ctx,"SUBS",AX,H-86,44,1.2);ctx.fillStyle=th.accent;f(ctx,34,EN);ctx.fillText("»",AX+96,H-92);
  ctx.fillStyle="rgba(255,255,255,.9)";f(ctx,24,KO);ctx.textAlign="left";wrapRow(ctx,subsLine(d),AX+136,H-118,AW-150,34,22,2)}
 grain(ctx);brand(ctx,"rgba(255,255,255,.7)",W-34,H-30);
}

// ───────── 3. STARTING XI · 명단 + 대표 선수 ─────────
async function tplList(ctx:C,d:D){
 const th=d.th;backdrop(ctx,th,-.2);glow(ctx,W*.75,H*.45,620,th.accent,.14);
 // 1.21 오른쪽: 선수 사진 대신 우리 팀 vs 상대 팀 엠블럼(사장님 요청 — 선수 사진은 아직 어색해서).
 const RX=W*.71;
 if(d.opp){await crest(ctx,d.team,RX,H*.34,150,"#fff");vsMark(ctx,RX,H*.53,th);await crest(ctx,d.opp,RX,H*.72,150,"#fff")}
 else await crest(ctx,d.team,RX,H*.52,200,"#fff");
 // 맨 위 띠
 ctx.fillStyle="rgba(0,0,0,.82)";ctx.fillRect(0,0,W,64);const w=when(d);
 ctx.fillStyle="#fff";f(ctx,28,KO);ctx.textAlign="center";ctx.textBaseline="middle";
 ctx.fillText([w?w.md+" ("+w.dow+") "+w.hm:"",d.venue??"",d.opp?"vs "+short(d.opp.name):""].filter(Boolean).join("  /  ")||short(d.team.name),W/2,34);
 ctx.textBaseline="alphabetic";
 ctx.fillStyle="#fff";ctx.save();ctx.translate(48,232);ctx.transform(1,0,-.14,1,0,0);tall(ctx,"STARTING XI",0,0,128,1.15,"left",700);ctx.restore();
 ctx.fillStyle="rgba(255,255,255,.85)";ctx.textAlign="left";fit(ctx,short(d.team.name)+(d.opp?"  vs  "+short(d.opp.name):""),560,32,KO);ctx.fillText(short(d.team.name)+(d.opp?"  vs  "+short(d.opp.name):""),52,322);
 const list=d.starters.slice(0,11),y0=430,lh=Math.min(66,(1180-y0)/Math.max(list.length,1));
 list.forEach((p,i)=>{const y=y0+i*lh;ctx.fillStyle=th.accent;f(ctx,40,EN);ctx.textAlign="right";ctx.fillText(no(p)||"-",112,y);
  ctx.fillStyle="#fff";ctx.textAlign="left";const s=fit(ctx,short(p.name),300,46,KO);ctx.fillText(short(p.name),136,y);
  if(p.captain){const nw=ctx.measureText(short(p.name)).width;ctx.fillStyle=th.accent;f(ctx,s*0.9,EN);ctx.fillText("C",136+nw+14,y)}});
 if(d.subs.length){const y=1236;ctx.fillStyle=th.accent;ctx.save();ctx.translate(48,y);ctx.transform(1,0,-.14,1,0,0);f(ctx,42,EN);ctx.textAlign="left";ctx.fillText("SUB",0,0);ctx.restore();
  ctx.fillStyle="#fff";f(ctx,26,KO);ctx.textAlign="left";wrapRow(ctx,subsLine(d),48,y+46,W-300,36,24,2)}
 grain(ctx);brand(ctx,"rgba(255,255,255,.8)");
}

// ───────── 4. MATCHDAY ─────────
async function tplMatchday(ctx:C,d:D){
 const th=d.th;backdrop(ctx,th,.35);curtain(ctx,W*.45,W);
 // 왼쪽 위에서 오른쪽 아래로 가르는 사선 판
 ctx.save();ctx.beginPath();ctx.moveTo(W*.58,0);ctx.lineTo(W,0);ctx.lineTo(W,H);ctx.lineTo(W*.4,H);ctx.closePath();ctx.fillStyle=rgba(mix(th.bg,"#000000",.5),.85);ctx.fill();ctx.restore();
 ctx.save();ctx.beginPath();ctx.moveTo(W*.58-26,0);ctx.lineTo(W*.58-6,0);ctx.lineTo(W*.4-6,H);ctx.lineTo(W*.4-26,H);ctx.closePath();ctx.fillStyle=th.accent;ctx.fill();ctx.restore();
 // 1.21 왼쪽: 선수 사진 대신 우리 팀 vs 상대 팀 엠블럼(사장님 요청). 상대가 아직 없으면 우리 팀만 크게.
 const LX=W*.25;
 if(d.opp){await crest(ctx,d.team,LX,H*.29,150,"rgba(255,255,255,.9)");vsMark(ctx,LX,H*.5,th);await crest(ctx,d.opp,LX,H*.71,150,"rgba(255,255,255,.9)")}
 else await crest(ctx,d.team,LX,H*.48,190,"rgba(255,255,255,.9)");
 ctx.fillStyle="#fff";ctx.textAlign="center";fit(ctx,short(d.team.name),W*.4,34,KO);
 if(d.opp){ctx.fillText(short(d.team.name),LX,H*.29+150+48);fit(ctx,short(d.opp.name),W*.4,34,KO);ctx.fillText(short(d.opp.name),LX,H*.71+150+48)}else ctx.fillText(short(d.team.name),LX,H*.48+190+56);
 // 오른쪽 글자
 const RX=W*.5,RW=W-RX-40;
 const bx=RX+RW/2+10;
 const w=when(d);roundTag(ctx,d,bx,300,"center",26);
 ctx.fillStyle="#fff";tall(ctx,"MATCH",bx,600,200,1.35,"center",RW);tall(ctx,"DAY",bx,880,200,1.35,"center",RW);
 if(w){const t=w.md+"."+w.dow+"  "+w.hm;ctx.fillStyle="#fff";ctx.textAlign="center";fit(ctx,t,RW,62,EN);ctx.fillText(t,bx,980)}
 if(d.venue){ctx.fillStyle="#fff";fit(ctx,d.venue,RW,40,KO);ctx.textAlign="center";ctx.fillText(d.venue,bx,1040)}
 if(d.opp){ctx.fillStyle=th.accent;fit(ctx,"vs "+short(d.opp.name),RW,36,KO);ctx.fillText("vs "+short(d.opp.name),bx,1096)}
 grain(ctx); brand(ctx,"rgba(255,255,255,.75)");
}

// ───────── 5. SQUAD NUMBERS ─────────
async function tplNumbers(ctx:C,d:D){
 const th=d.th;backdrop(ctx,th,-.6);argyle(ctx,180);glow(ctx,W/2,H*.12,620,th.accent,.12);
 const all=[...d.starters,...d.subs].sort((a,b)=>(a.number??999)-(b.number??999));
 ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="alphabetic";f(ctx,30,EN);ctx.fillText(String(new Date().getFullYear())+" SEASON",W/2,96);
 const name=short(d.team.name).toUpperCase();ctx.fillStyle="#fff";
 f(ctx,100,EN);const nw=Math.min(ctx.measureText(name).width,W*.42);f(ctx,100,EN);const tw=nw+24+Math.min(ctx.measureText("SQUAD NUMBERS").width,W*.5);
 const x0=W/2-tw/2;tall(ctx,name,x0,214,100,1.18,"left",W*.42);ctx.save();ctx.fillStyle=th.accent;ctx.translate(x0+nw+24,214);ctx.transform(1,0,-.16,1,0,0);tall(ctx,"SQUAD NUMBERS",0,0,100,1.18,"left",W*.5);ctx.restore();
 const n=all.length,cols=n<=12?4:n<=20?5:6,rows=Math.ceil(n/cols)||1;
 const top=290,bottom=H-120,cw=(W-80)/cols,chh=Math.min(300,(bottom-top)/rows);
 const s=Math.min(cw*.82,chh*.72)/100;
 all.forEach((p,i)=>{const c=i%cols,r=Math.floor(i/cols);const cx=40+cw*c+cw/2,cy=top+chh*r+chh*.42;
  jersey(ctx,cx,cy,s,th,no(p)||"-",p.group==="GK");
  ctx.fillStyle="#fff";ctx.textAlign="center";fit(ctx,short(p.name),cw-10,Math.max(20,chh*.15),KO);ctx.fillText(short(p.name),cx,cy+56*s+chh*.16)});
 grain(ctx);await crest(ctx,d.team,W/2,H-62,30,"rgba(255,255,255,.8)");brand(ctx,"rgba(255,255,255,.75)");
}

export const POSTERS:[string,string,(c:C,d:D)=>Promise<void>][]=[["grid","STARTING XI",tplGrid],["lineup","LINEUP",tplLineup],["list","선발 명단",tplList],["matchday","MATCHDAY",tplMatchday],["numbers","SQUAD NUMBERS",tplNumbers]];

// ───────── 글꼴 불러오기 ─────────
let fontsReady:Promise<void>|null=null;
function loadFonts(sample:string){
 if(!fontsReady)fontsReady=new Promise<void>(res=>{if(document.getElementById("tk-share-fonts")){res();return}const l=document.createElement("link");l.id="tk-share-fonts";l.rel="stylesheet";l.href="/fonts/share-fonts.css";l.onload=()=>res();l.onerror=()=>res();document.head.appendChild(l)});
 return fontsReady.then(()=>Promise.all([document.fonts.load('80px "Anton"',"STARTING XI MATCHDAY LINEUP SQUAD NUMBERS 0123456789"),document.fonts.load('80px "Black Han Sans"',sample||"가"),document.fonts.load('700 30px "Pretendard Variable"',sample||"가")]).catch(()=>null)).then(()=>undefined);
}

// ───────── 화면 ─────────
type Pick="xi"|"sub"|"out";
export function PosterStudio({v,team,gameId}:{v:Row;team:Row;gameId?:string}){
 const staff=["captain","manager"].includes(v.role)||!!v.isOwner;
 const game=(v.games??[]).find((g:Row)=>g.id===gameId)??null;
 const side=game?(v.sides??[]).find((z:Row)=>z.gameId===game.id):null;
 const people:P[]=useMemo(()=>((v.members??[]) as Row[]).filter(m=>m.status==="active").map(m=>({id:m.id,name:String(m.name),number:m.number??null,position:String(m.position??""),group:positionGroup(m.position),photo:m.photo,captain:m.role==="captain"})),[v.members]);
 // 경기 이미지는 "참여" 투표한 사람(5명 이상일 때)을, 명단 이미지는 전원을 처음 고른다. 11명이 넘으면 나머지는 교체.
 const initial=useMemo(()=>{const yes=side?people.filter(p=>currentVote(side,p.id)==="yes"):[];const base=yes.length>=5?yes:people; // 투표가 아직 덜 모였으면 전원에서 시작
  const ordered=[...base].sort((a,b)=>["GK","DF","MF","FW"].indexOf(a.group)-["GK","DF","MF","FW"].indexOf(b.group)||(a.number??999)-(b.number??999));
  const m:Record<string,Pick>={};people.forEach(p=>m[p.id]="out");ordered.forEach((p,i)=>m[p.id]=i<11?"xi":"sub");return m},[people,side]);
 const [pick,setPick]=useState<Record<string,Pick>>(initial);
 const [featured,setFeatured]=useState<string>(()=>people.find(p=>p.photo&&initial[p.id]==="xi")?.id??people.find(p=>p.captain)?.id??"");
 const [th,setTh]=useState<Theme>(()=>themeOf(team));
 // 경기 없이 연 명단 이미지에는 MATCHDAY 를 빼고 보여준다(상대·날짜가 없으면 빈칸이 생긴다).
 const list=useMemo(()=>POSTERS.filter(x=>game||x[0]!=="matchday"),[game]);
 const [tpl,setTpl]=useState(game?3:0),[busy,setBusy]=useState(true),[open,setOpen]=useState<""|"color"|"players">("");
 const lineup=side?.lineups?.[0]&&Object.keys(side.lineups[0].slots??{}).length>=8?side.lineups[0]:null;
 const [formation,setFormation]=useState<string>(()=>lineup?.formation??autoFormation(people.filter(p=>initial[p.id]==="xi")));
 const [photos,setPhotos]=useState<Photos>("cut");
 const ref=useRef<HTMLCanvasElement>(null);
 const oppTeam:Team|null=useMemo(()=>{if(!game)return null;const oid=game.home===v.teamId?game.away:game.home;const t=(v.teams??[]).find((x:Row)=>x.id===oid);
  const nm=opponent(v,game);return nm?{name:nm,logo:t?.logo,color:t?.color}:null},[game,v]);
 const data:D=useMemo(()=>{
  const starters=people.filter(p=>pick[p.id]==="xi").sort(byLine),subs=people.filter(p=>pick[p.id]==="sub").sort(byLine);
  // 라인업 탭에서 정해 둔 1쿼터 자리(8명 이상일 때)를 포메이션 그림에 그대로 쓴다.
  let slots:Record<string,P>|null=null;
  if(lineup&&formation===lineup.formation){slots={};for(const [k,w] of Object.entries(lineup.slots as Record<string,Row>)){const m=people.find(p=>p.id===w.memberId);slots[k]=m??{id:k,name:String(w.name),number:w.number??null,position:k,group:slotGroup(k)}}}
  const yr=game?String(game.start).slice(0,4):"";const round=game?((v.games??[]) as Row[]).filter(g=>g.status!=="cancelled"&&g.kind!=="intra"&&String(g.start).slice(0,4)===yr&&String(g.start)<=String(game.start)).length:undefined;
  return {team:{name:team?.name??"우리 팀",logo:team?.logo,color:team?.color},opp:oppTeam,start:game?.start,end:game?.end,venue:game?.venue,round,starters,subs,featured:people.find(p=>p.id===featured),formation,slots,th,photos};
 },[people,pick,featured,th,formation,lineup,team,oppTeam,game,v.games,photos]);
 useEffect(()=>{let live=true;const c=ref.current;if(!c)return;const ctx=c.getContext("2d")!;
  (async()=>{setBusy(true);try{
   const sample=[data.team.name,data.opp?.name??"",data.venue??"",...data.starters.map(p=>p.name),...data.subs.map(p=>p.name),"외명교체"].join("");
   await loadFonts(sample);if(!live)return;ctx.clearRect(0,0,W,H);ctx.save();await list[tpl][2](ctx,data);ctx.restore();
  }finally{if(live)setBusy(false)}})();
  return()=>{live=false}},[tpl,data,list]);
 const nXI=Object.values(pick).filter(x=>x==="xi").length;
 function setP(id:string,x:Pick){setPick(m=>{if(x==="xi"&&m[id]!=="xi"&&Object.values(m).filter(y=>y==="xi").length>=11){toast("선발은 11명까지예요. 다른 선수를 먼저 교체로 바꿔주세요.");return m}return {...m,[id]:x}})}
 async function blob(){return new Promise<Blob|null>(res=>ref.current?.toBlob(res,"image/png"))}
 const fileName=()=>"teamkick-"+list[tpl][0]+".png";
 async function share(){const b=await blob();if(!b){toast.error("이미지를 만들지 못했어요.");return}
  const file=new File([b],fileName(),{type:"image/png"});const nav=navigator as Navigator&{canShare?:(d:ShareData)=>boolean};
  if(nav.share&&nav.canShare?.({files:[file]})){try{await nav.share({files:[file],title:data.team.name})}catch{}return}
  save(b);toast("이 브라우저는 바로 공유가 안 돼서 이미지로 저장했어요.")}
 function save(b?:Blob|null){const go=(x:Blob)=>{const u=URL.createObjectURL(x);const a=document.createElement("a");a.href=u;a.download=fileName();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)};if(b)go(b);else blob().then(x=>x&&go(x))}
 async function saveKit(){try{const r=await fetch("/api/app",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"setKit",teamId:v.teamId,viewTeam:v.teamId,bg:th.bg,accent:th.accent,shirt:th.shirt,stripe:th.stripe,mutationId:crypto.randomUUID()})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw Error(d.error||"저장하지 못했어요.");toast.success("팀 기본 색으로 저장했어요. 팀원도 이 색으로 만들어요.")}catch(e){toast.error(e instanceof Error?e.message:"저장하지 못했어요.")}}
 const sw=(list:string[],cur:string,on:(c:string)=>void,none=false)=><div className="swatches">{none&&<button type="button" className={"swatch none"+(cur===""?" on":"")} onClick={()=>on("")} aria-label="없음">없음</button>}{list.map(c=><button key={c} type="button" className={"swatch"+(cur===c?" on":"")} style={{background:c}} onClick={()=>on(c)} aria-label={c}/>)}<label className="swatch pick" aria-label="직접 고르기"><input type="color" value={cur||"#ffffff"} onChange={e=>on(e.target.value)}/>+</label></div>;
 return <div className="share-studio">
  <div className="share-styles">{list.map(([k,label],i)=><button key={k} type="button" className={"chip-btn"+(tpl===i?" on":"")} onClick={()=>setTpl(i)}>{label}</button>)}</div>
  <div className="share-canvas"><canvas ref={ref} width={W} height={H}/>{busy&&<span className="share-busy"><LoaderCircle className="loader" size={22}/></span>}</div>
  <div className="row share-actions"><button type="button" className="btn btn-green" disabled={busy} onClick={share}><Share2 size={16}/>공유하기</button><button type="button" className="btn" disabled={busy} onClick={()=>save()}><Download size={16}/>이미지 저장</button></div>
  <div className="poster-tabs"><button type="button" className={open==="players"?"on":""} onClick={()=>setOpen(x=>x==="players"?"":"players")}><Star size={16}/>선수 고르기 <small>선발 {nXI}/11</small></button><button type="button" className={open==="color"?"on":""} onClick={()=>setOpen(x=>x==="color"?"":"color")}><Palette size={16}/>색 바꾸기</button></div>
  {open==="color"&&<div className="poster-panel">
   <div><span>배경</span>{sw(BG_SWATCH,th.bg,c=>setTh(t=>({...t,bg:c})))}</div>
   <div><span>포인트</span>{sw(ACCENT_SWATCH,th.accent,c=>setTh(t=>({...t,accent:c})))}</div>
   <div><span>유니폼</span>{sw(SHIRT_SWATCH,th.shirt,c=>setTh(t=>({...t,shirt:c})))}</div>
   <div><span>줄무늬</span>{sw(["#ffffff","#141414","#b3121b","#1d3fbf","#f2c94c"],th.stripe,c=>setTh(t=>({...t,stripe:c})),true)}</div>
   {list[tpl][0]==="lineup"&&<div><span>포메이션</span><div className="chip-row">{FORMATION_NAMES.map(x=><button key={x} type="button" className={"chip-btn"+(formation===x?" on":"")} onClick={()=>setFormation(x)}>{x}</button>)}</div>{lineup&&<small className="muted">{lineup.formation} 은 라인업 탭에 정해 둔 자리 그대로 그려요.</small>}</div>}
   {staff&&<button type="button" className="btn" onClick={saveKit}>이 색을 팀 기본으로 저장</button>}
  </div>}
  {open==="players"&&<div className="poster-panel">
   <div><span>선수 사진</span><div className="seg photo-seg">{([["cut","배경 지우기"],["raw","원본 그대로"],["off","안 넣기"]] as [Photos,string][]).map(([k,l])=><button key={k} type="button" className={photos===k?"on":""} onClick={()=>setPhotos(k)}>{l}</button>)}</div>
    <small className="muted">{photos==="cut"?"사진 속 사람만 남기고 배경을 지워요. 이 폰 안에서만 처리하고 사진을 어디로 보내지 않아요. 처음엔 몇 초 걸려요.":photos==="raw"?"사진을 자르지 않고 통째로 넣어요.":"사진 대신 실루엣으로 그려요."}</small></div>
   <small className="muted">★ 를 누른 선수 사진이 크게 들어가요(선발 명단·MATCHDAY).</small>
   <ul className="poster-people">{people.map(p=><li key={p.id}>
    <button type="button" className={"star"+(featured===p.id?" on":"")} onClick={()=>setFeatured(p.id)} aria-label={p.name+" 대표 선수로"}><Star size={16}/></button>
    <span className="pp-name"><b>{p.name}</b><small>{[p.number!=null?p.number+"번":"",p.position].filter(Boolean).join(" ")}{p.photo?" 사진 있음":""}</small></span>
    <span className="seg">{(["xi","sub","out"] as Pick[]).map(x=><button key={x} type="button" className={pick[p.id]===x?"on":""} onClick={()=>setP(p.id,x)}>{x==="xi"?"선발":x==="sub"?"교체":"빼기"}</button>)}</span>
   </li>)}</ul>
  </div>}
  <p className="data-note">{game?"경기 정보(상대 엠블럼·이름·날짜·구장)와 참여 투표한 선수가 자동으로 들어가요. ":""}팀이 올린 로고·선수 사진과 이름·등번호로 팀킥이 직접 그린 이미지예요. 사진 속 사람에게 올려도 되는지 먼저 물어봐 주세요.</p>
 </div>;
}
