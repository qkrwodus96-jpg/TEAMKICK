"use client";
// 공유 이미지(1.18) — 선수 명단 5가지, 영입 소식("HERE WE GO!") 5가지. 팀킥이 캔버스로 직접 그린다(외부 서비스·AI 이미지 없음).
// 1080×1350(인스타 세로 4:5). 사진은 팀이 올린 로고·선수 사진만 쓴다(같은 사이트 주소라 캔버스가 더럽혀지지 않는다).
// 저작권: 다른 회사의 로고·카드 디자인·인물 사진을 흉내 내지 않는다. "HERE WE GO!"는 흔히 쓰는 축하 문구로만 쓴다.
import {useEffect,useMemo,useRef,useState} from "react";
import {Download,Share2,LoaderCircle} from "lucide-react";
import {toast} from "sonner";
import {positionGroup,type Row} from "@/lib/model";
import {FORMATIONS} from "@/lib/formations";
import {imageUrl} from "./teamkick";

const W=1080,H=1350,FONT='"Pretendard Variable",Pretendard,"Apple SD Gothic Neo",sans-serif';
type Ctx=CanvasRenderingContext2D;
type Player={name:string;number:number|null;position:string;group:string;photo?:string};
type Data={team:{name:string;color:string;logo?:string;region?:string};players:Player[];date:string;lineup?:{formation:string;slots:Record<string,Row>}|null;who?:Player};

// 팀 색(로고 바탕 색 이름) → 실제 색
const TEAM_COLOR:Record<string,[string,string]>={"":["#148b54","#0b4d2f"],green:["#148b54","#0b4d2f"],orange:["#e0772a","#8f3c0c"],blue:["#2f55b4","#172b66"],red:["#d9443a","#7c1712"],purple:["#6d5bd0","#33277a"],black:["#2a2f2c","#0c0e0d"],yellow:["#e3b21c","#8a6300"]};
const colorsOf=(c:string)=>TEAM_COLOR[c]??TEAM_COLOR[""];
const GROUP_ORDER=["GK","DF","MF","FW"];
const GROUP_KO:Record<string,string>={GK:"골키퍼",DF:"수비",MF:"미드필더",FW:"공격"};

function font(ctx:Ctx,size:number,weight=800){ctx.font=weight+" "+size+"px "+FONT}
// 칸 너비에 맞게 글자 크기를 줄인다.
function fit(ctx:Ctx,text:string,max:number,size:number,weight=800,min=18){let s=size;font(ctx,s,weight);while(ctx.measureText(text).width>max&&s>min){s-=2;font(ctx,s,weight)}return s}
function rr(ctx:Ctx,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function shirt(ctx:Ctx,cx:number,cy:number,s:number,fill:string,stroke:string,num:string,numColor:string){
 ctx.save();ctx.translate(cx-20*s,cy-19*s);ctx.scale(s,s);ctx.beginPath();
 ctx.moveTo(13,3);ctx.lineTo(6,6);ctx.lineTo(1,14);ctx.lineTo(7,18);ctx.lineTo(9,15);ctx.lineTo(9,36);ctx.lineTo(31,36);ctx.lineTo(31,15);ctx.lineTo(33,18);ctx.lineTo(39,14);ctx.lineTo(34,6);ctx.lineTo(27,3);ctx.quadraticCurveTo(20,9,13,3);ctx.closePath();
 ctx.shadowColor="rgba(0,0,0,.35)";ctx.shadowBlur=6/s*2;ctx.shadowOffsetY=2;ctx.fillStyle=fill;ctx.fill();ctx.shadowColor="transparent";ctx.lineWidth=1.4;ctx.strokeStyle=stroke;ctx.stroke();
 ctx.fillStyle=numColor;font(ctx,13,900);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(num,20,23);ctx.restore();
}
async function loadImg(src?:string):Promise<HTMLImageElement|null>{if(!src)return null;return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src})}
function initials(name:string){const x=name.replace(/\s|FC|유나이티드/g,"");return x.slice(0,2)||"?"}
async function crest(ctx:Ctx,d:Data,cx:number,cy:number,r:number,ring="#fff"){
 const img=await loadImg(d.team.logo?imageUrl(d.team.logo):undefined);const [c1]=colorsOf(d.team.color);
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=img?"#fff":c1;ctx.fill();ctx.clip();
 if(img){const s=Math.max(2*r/img.width,2*r/img.height);ctx.drawImage(img,cx-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s)}
 else{ctx.fillStyle="#fff";font(ctx,r*0.8,900);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(initials(d.team.name),cx,cy+2)}
 ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.lineWidth=Math.max(3,r*0.07);ctx.strokeStyle=ring;ctx.stroke();
}
async function photo(ctx:Ctx,p:Player,x:number,y:number,w:number,h:number,radius:number,bg:string,fg:string){
 const img=await loadImg(p.photo?imageUrl(p.photo):undefined);
 ctx.save();rr(ctx,x,y,w,h,radius);ctx.fillStyle=bg;ctx.fill();ctx.clip();
 if(img){const s=Math.max(w/img.width,h/img.height);ctx.drawImage(img,x+w/2-img.width*s/2,y+h/2-img.height*s/2,img.width*s,img.height*s)}
 else{ctx.fillStyle=fg;font(ctx,Math.min(w,h)*0.34,900);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(p.name.slice(-2),x+w/2,y+h/2+4)}
 ctx.restore();
}
const byGroup=(ps:Player[])=>GROUP_ORDER.map(g=>({g,list:ps.filter(p=>p.group===g).sort((a,b)=>(a.number??999)-(b.number??999))})).filter(x=>x.list.length);
const num=(p:Player)=>p.number==null?"-":String(p.number);
function footer(ctx:Ctx,color:string,text:string){ctx.fillStyle=color;font(ctx,24,700);ctx.textAlign="right";ctx.textBaseline="alphabetic";ctx.fillText("TEAMKICK",W-56,H-44);ctx.textAlign="left";ctx.fillText(text,56,H-44)}

// ───────── 선수 명단 5가지 ─────────
async function rosterPitch(ctx:Ctx,d:Data){
 for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#136c42":"#177a4a";ctx.fillRect(0,i*H/10,W,H/10)}
 ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=4;const top=250,bot=H-70,L=60,R=W-60,mid=(top+bot)/2;
 ctx.strokeRect(L,top,R-L,bot-top);ctx.beginPath();ctx.moveTo(L,mid);ctx.lineTo(R,mid);ctx.stroke();ctx.beginPath();ctx.arc(W/2,mid,110,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(W/2-250,top,500,190);ctx.strokeRect(W/2-250,bot-190,500,190);
 const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,"rgba(4,24,14,.95)");g.addColorStop(1,"rgba(4,24,14,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,300);
 await crest(ctx,d,120,120,62);
 ctx.fillStyle="#fff";const s=fit(ctx,d.team.name,W-300,72,900);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText(d.team.name,210,122);
 ctx.fillStyle="#c4ef75";font(ctx,28,800);ctx.fillText("SQUAD · "+d.date,212,168);void s;
 // 라인업이 있으면 그 자리대로, 없으면 포지션 묶음으로 4-4-2 에 채운다.
 const f=FORMATIONS[d.lineup?.formation??"4-4-2"]??FORMATIONS["4-4-2"];
 let placed:{x:number;y:number;p:Player}[]=[];
 // 라인업이 8명 이상 채워져 있을 때만 그대로 쓴다(몇 명만 넣어 둔 라인업이면 명단으로 채운다).
 if(d.lineup&&Object.keys(d.lineup.slots).length>=8){for(const sl of f){const w=d.lineup.slots[sl.k];if(w)placed.push({x:sl.x,y:sl.y,p:{name:String(w.name),number:w.number??null,position:sl.k,group:"MF"}})}}
 else{const pool=[...d.players];const take=(g:string)=>{const i=pool.findIndex(p=>p.group===g);return i>=0?pool.splice(i,1)[0]:pool.shift()};
  placed=f.map(sl=>{const g=sl.k==="GK"?"GK":/B$|CB|WB/.test(sl.k)?"DF":/S$|ST|W$/.test(sl.k)?"FW":"MF";const p=take(g);return p?{x:sl.x,y:sl.y,p}:null}).filter(Boolean) as typeof placed}
 for(const q of placed){const x=L+(R-L)*q.x/100,y=top+(bot-top)*q.y/100;
  shirt(ctx,x,y-14,2.8,"#fff","#0d3b24",num(q.p),"#0d3b24");
  const nm=q.p.name;font(ctx,26,800);const tw=Math.min(ctx.measureText(nm).width,190)+22;
  rr(ctx,x-tw/2,y+44,tw,40,10);ctx.fillStyle="rgba(4,24,14,.72)";ctx.fill();ctx.fillStyle="#fff";fit(ctx,nm,190,26,800);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(nm,x,y+65);}
 ctx.fillStyle="rgba(255,255,255,.7)";font(ctx,22,700);ctx.textAlign="right";ctx.textBaseline="alphabetic";ctx.fillText("TEAMKICK",W-70,H-30);
}
async function rosterNight(ctx:Ctx,d:Data){
 ctx.fillStyle="#0b0f0d";ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(W*0.72,-60);ctx.rotate(0.38);ctx.fillStyle="#c4ef75";ctx.fillRect(0,0,70,H*1.6);ctx.fillStyle="rgba(196,239,117,.18)";ctx.fillRect(100,0,26,H*1.6);ctx.restore();
 ctx.save();ctx.globalAlpha=.07;ctx.fillStyle="#fff";font(ctx,330,900);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText("SQUAD",-20,H-60);ctx.restore();
 await crest(ctx,d,110,120,52,"#c4ef75");
 ctx.fillStyle="#fff";fit(ctx,d.team.name.toUpperCase(),W-400,64,900);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText(d.team.name.toUpperCase(),190,118);
 ctx.fillStyle="#c4ef75";font(ctx,26,800);ctx.fillText("MATCHDAY SQUAD  "+d.date,192,160);
 let y=250;const colX=[70,570];let col=0;
 for(const grp of byGroup(d.players)){
  if(y+60+grp.list.length*58>H-120&&col===0){col=1;y=250}
  ctx.fillStyle="#c4ef75";font(ctx,24,900);ctx.fillText(grp.g+"  "+GROUP_KO[grp.g],colX[col],y);y+=18;
  ctx.fillStyle="rgba(196,239,117,.5)";ctx.fillRect(colX[col],y,420,3);y+=44;
  for(const p of grp.list){ctx.fillStyle="#c4ef75";font(ctx,40,900);ctx.textAlign="right";ctx.fillText(num(p),colX[col]+64,y);ctx.textAlign="left";ctx.fillStyle="#fff";fit(ctx,p.name,320,34,700);ctx.fillText(p.name,colX[col]+90,y);y+=58;
   if(y>H-120&&col===0){col=1;y=250}}
  y+=26;
 }
 footer(ctx,"rgba(255,255,255,.55)",d.players.length+"명");
}
async function rosterCobalt(ctx:Ctx,d:Data){
 ctx.fillStyle="#fbfbfd";ctx.fillRect(0,0,W,H);ctx.fillStyle="#1d3fd6";ctx.fillRect(0,0,W,300);
 ctx.fillStyle="rgba(255,255,255,.08)";for(let i=0;i<14;i++){ctx.fillRect(i*84,0,42,300)}
 await crest(ctx,d,W-150,150,86);
 ctx.fillStyle="#fff";font(ctx,30,800);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText("OFFICIAL SQUAD",64,96);
 fit(ctx,d.team.name,W-330,88,900);ctx.fillText(d.team.name,60,196);font(ctx,28,600);ctx.fillStyle="rgba(255,255,255,.8)";ctx.fillText([d.team.region,d.date].filter(Boolean).join(" · "),64,248);
 const list=byGroup(d.players).flatMap(g=>g.list);const half=Math.ceil(list.length/2);const rowH=Math.min(68,(H-440)/Math.max(half,1));
 list.forEach((p,i)=>{const c=i<half?0:1,r=i<half?i:i-half;const x=64+c*490,y=370+r*rowH;
  ctx.fillStyle="#1d3fd6";font(ctx,Math.min(46,rowH*0.7),900);ctx.textAlign="right";ctx.fillText(num(p),x+70,y);ctx.textAlign="left";
  ctx.fillStyle="#10152e";fit(ctx,p.name,250,Math.min(34,rowH*0.52),800);const nw=Math.min(ctx.measureText(p.name).width,250);ctx.fillText(p.name,x+96,y);
  ctx.fillStyle="#7c86b6";font(ctx,Math.min(22,rowH*0.34),700);ctx.fillText(p.position||p.group,x+96+nw+14,y);
  ctx.fillStyle="#e4e8f7";ctx.fillRect(x,y+rowH*0.36,440,2);});
 footer(ctx,"#7c86b6",d.players.length+" PLAYERS");
}
async function rosterTeamColor(ctx:Ctx,d:Data){
 const [c1,c2]=colorsOf(d.team.color);const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="rgba(255,255,255,.06)";ctx.beginPath();ctx.arc(W*0.85,H*0.18,380,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(W*0.1,H*0.95,300,0,Math.PI*2);ctx.fill();
 await crest(ctx,d,W/2,170,96);
 ctx.fillStyle="#fff";fit(ctx,d.team.name,W-160,78,900);ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillText(d.team.name,W/2,346);
 font(ctx,26,700);ctx.fillStyle="rgba(255,255,255,.8)";ctx.fillText("OUR SQUAD · "+d.date,W/2,392);
 const list=byGroup(d.players).flatMap(g=>g.list);const cols=3,cw=(W-120-2*20)/cols,ch=Math.min(116,(H-520)/Math.ceil(list.length/cols)-14);
 list.forEach((p,i)=>{const x=60+(i%cols)*(cw+20),y=440+Math.floor(i/cols)*(ch+14);
  rr(ctx,x,y,cw,ch,20);ctx.fillStyle="rgba(255,255,255,.14)";ctx.fill();ctx.strokeStyle="rgba(255,255,255,.28)";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#fff";font(ctx,Math.min(44,ch*0.42),900);ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(num(p),x+22,y+ch/2);
  fit(ctx,p.name,cw-110,Math.min(30,ch*0.3),800);ctx.fillText(p.name,x+96,y+ch/2-(ch>80?12:0));
  if(ch>80){ctx.fillStyle="rgba(255,255,255,.72)";font(ctx,20,700);ctx.fillText(p.position||GROUP_KO[p.group],x+96,y+ch/2+22)}});
 footer(ctx,"rgba(255,255,255,.7)",d.players.length+"명");
}
async function rosterJerseys(ctx:Ctx,d:Data){
 ctx.fillStyle="#15181a";ctx.fillRect(0,0,W,H);const [c1]=colorsOf(d.team.color);
 ctx.fillStyle=c1;ctx.fillRect(0,0,W,14);
 await crest(ctx,d,108,118,50,c1);ctx.fillStyle="#fff";fit(ctx,d.team.name,W-260,60,900);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText(d.team.name,184,116);
 ctx.fillStyle="#8b949e";font(ctx,24,700);ctx.fillText("THE SQUAD · "+d.date,186,156);
 const list=byGroup(d.players).flatMap(g=>g.list);const cols=4,cw=(W-100)/cols;const rows=Math.ceil(list.length/cols);const ch=Math.min(250,(H-300)/Math.max(rows,1));const sc=Math.min(3.2,ch/80);
 list.forEach((p,i)=>{const cx=50+cw*(i%cols)+cw/2,cy=230+ch*Math.floor(i/cols)+ch*0.42;
  shirt(ctx,cx,cy,sc,c1,"rgba(255,255,255,.85)",num(p),"#fff");
  ctx.fillStyle="#fff";fit(ctx,p.name,cw-20,Math.min(28,ch*0.14),800);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(p.name,cx,cy+sc*26);
  ctx.fillStyle="#8b949e";font(ctx,Math.min(20,ch*0.1),700);ctx.fillText(p.position||p.group,cx,cy+sc*26+Math.min(30,ch*0.15))});
 footer(ctx,"#8b949e",d.players.length+"명");
}

// ───────── 영입 소식 5가지 ─────────
async function tfHereWeGo(ctx:Ctx,d:Data){const p=d.who!;
 ctx.fillStyle="#050807";ctx.fillRect(0,0,W,H);
 const g=ctx.createRadialGradient(W/2,560,40,W/2,560,620);g.addColorStop(0,"rgba(34,197,94,.35)");g.addColorStop(1,"rgba(34,197,94,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.beginPath();ctx.arc(W/2,520,250,0,Math.PI*2);ctx.clip();await photo(ctx,p,W/2-250,270,500,500,0,"#123524","#8fe3b3");ctx.restore();
 ctx.beginPath();ctx.arc(W/2,520,258,0,Math.PI*2);ctx.lineWidth=12;ctx.strokeStyle="#22c55e";ctx.stroke();
 await crest(ctx,d,W/2+190,700,62,"#050807");
 ctx.save();ctx.translate(W/2,960);ctx.transform(1,0,-0.18,1,0,0);ctx.fillStyle="#fff";fit(ctx,"HERE WE GO!",W-120,150,900);ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillText("HERE WE GO!",0,0);ctx.restore();
 ctx.strokeStyle="#22c55e";ctx.lineWidth=14;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(210,995);ctx.quadraticCurveTo(W/2,1030,W-210,990);ctx.stroke();
 ctx.fillStyle="#fff";fit(ctx,p.name+" → "+d.team.name,W-140,56,900);ctx.textAlign="center";ctx.fillText(p.name+" → "+d.team.name,W/2,1110);
 ctx.fillStyle="#9fb3a8";font(ctx,32,700);ctx.fillText([p.position,p.number!=null?"#"+p.number:""].filter(Boolean).join("  ·  ")+"  ·  "+d.date,W/2,1170);
 footer(ctx,"#5b6f64","OFFICIAL");
}
async function tfWelcome(ctx:Ctx,d:Data){const p=d.who!;const [c1,c2]=colorsOf(d.team.color);
 ctx.fillStyle=c2;ctx.fillRect(0,0,W,H);ctx.fillStyle=c1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*0.72,0);ctx.lineTo(W*0.38,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
 await photo(ctx,p,W*0.40,180,W*0.54,760,28,"rgba(255,255,255,.14)","#fff");
 ctx.save();ctx.globalAlpha=.16;ctx.fillStyle="#fff";font(ctx,520,900);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText(num(p),30,760);ctx.restore();
 await crest(ctx,d,120,130,60);
 ctx.fillStyle="#fff";font(ctx,34,800);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText("WELCOME TO",60,1030);
 fit(ctx,p.name,W-120,110,900);ctx.fillText(p.name,56,1140);font(ctx,34,700);ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillText(d.team.name+"  ·  "+[p.position,p.number!=null?p.number+"번":""].filter(Boolean).join(" "),60,1200);
 footer(ctx,"rgba(255,255,255,.7)",d.date);
}
async function tfBreaking(ctx:Ctx,d:Data){const p=d.who!;
 ctx.fillStyle="#f6f6f4";ctx.fillRect(0,0,W,H);ctx.fillStyle="#d61f26";ctx.fillRect(0,0,W,150);
 ctx.fillStyle="#fff";font(ctx,68,900);ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText("BREAKING",56,78);font(ctx,30,800);ctx.textAlign="right";ctx.fillText("영입 발표 · "+d.date,W-56,80);
 await photo(ctx,p,56,200,W-112,640,18,"#dcdcd6","#8a8a84");
 ctx.fillStyle="#d61f26";ctx.fillRect(56,880,14,220);
 ctx.fillStyle="#111";ctx.textAlign="left";ctx.textBaseline="alphabetic";fit(ctx,"HERE WE GO!",W-160,96,900);ctx.fillText("HERE WE GO!",96,960);
 fit(ctx,p.name+", "+d.team.name+" 합류",W-160,58,900);ctx.fillText(p.name+", "+d.team.name+" 합류",96,1040);
 ctx.fillStyle="#555";font(ctx,32,600);ctx.fillText([p.position,p.number!=null?"등번호 "+p.number:""].filter(Boolean).join(" · ")||"새 식구를 환영해요",96,1094);
 await crest(ctx,d,W-150,1180,70,"#f6f6f4");footer(ctx,"#999","");
}
async function tfCard(ctx:Ctx,d:Data){const p=d.who!;
 ctx.fillStyle="#101312";ctx.fillRect(0,0,W,H);
 const x=150,y=110,w=W-300,h=1030;const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,"#f3d98b");g.addColorStop(.5,"#c9a24a");g.addColorStop(1,"#8e6a1f");
 ctx.save();ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+70);ctx.lineTo(x+w,y+h-150);ctx.lineTo(x+w/2,y+h);ctx.lineTo(x,y+h-150);ctx.lineTo(x,y+70);ctx.closePath();ctx.fillStyle=g;ctx.shadowColor="rgba(201,162,74,.45)";ctx.shadowBlur=60;ctx.fill();ctx.restore();
 ctx.fillStyle="#3a2a06";font(ctx,120,900);ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText(num(p),x+60,y+200);
 font(ctx,44,900);ctx.fillText(positionGroup(p.position)===p.position?p.position:p.position||p.group,x+64,y+262);
 await crest(ctx,d,x+120,y+350,54,"#3a2a06");
 await photo(ctx,p,x+w-450,y+120,390,470,24,"rgba(58,42,6,.15)","#3a2a06");
 ctx.fillStyle="#3a2a06";ctx.fillRect(x+80,y+640,w-160,4);
 ctx.textAlign="center";fit(ctx,p.name,w-140,84,900);ctx.fillText(p.name,x+w/2,y+740);
 font(ctx,34,800);ctx.fillText(d.team.name,x+w/2,y+800);
 ctx.fillStyle="#fff";ctx.textAlign="center";fit(ctx,"HERE WE GO!",W-200,84,900);ctx.fillText("HERE WE GO!",W/2,H-80);
}
async function tfMinimal(ctx:Ctx,d:Data){const p=d.who!;const [c1]=colorsOf(d.team.color);
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
 await photo(ctx,p,0,0,W,860,0,"#eef1ef","#b4bdb8");
 const g=ctx.createLinearGradient(0,600,0,860);g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(1,"rgba(255,255,255,1)");ctx.fillStyle=g;ctx.fillRect(0,600,W,260);
 ctx.save();ctx.translate(W-200,150);ctx.rotate(-0.2);rr(ctx,-130,-50,260,100,14);ctx.lineWidth=6;ctx.strokeStyle=c1;ctx.stroke();ctx.fillStyle=c1;font(ctx,44,900);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("OFFICIAL",0,2);ctx.restore();
 ctx.fillStyle="#111";ctx.textAlign="left";ctx.textBaseline="alphabetic";fit(ctx,"HERE WE GO!",W-120,120,900);ctx.fillText("HERE WE GO!",56,1000);
 ctx.fillStyle=c1;fit(ctx,p.name,W-300,72,900);ctx.fillText(p.name,56,1090);
 ctx.fillStyle="#6b7570";font(ctx,32,700);ctx.fillText(d.team.name+"  ·  "+[p.position,p.number!=null?"#"+p.number:""].filter(Boolean).join(" "),58,1150);
 await crest(ctx,d,W-130,1080,70,"#fff");footer(ctx,"#9aa39e",d.date);
}

export const ROSTER_STYLES:[string,string,(c:Ctx,d:Data)=>Promise<void>][]=[["pitch","축구장",rosterPitch],["night","매치데이",rosterNight],["cobalt","오피셜",rosterCobalt],["color","팀 컬러",rosterTeamColor],["jersey","유니폼",rosterJerseys]];
export const TRANSFER_STYLES:[string,string,(c:Ctx,d:Data)=>Promise<void>][]=[["herewego","HERE WE GO",tfHereWeGo],["welcome","웰컴",tfWelcome],["breaking","속보",tfBreaking],["card","선수 카드",tfCard],["minimal","미니멀",tfMinimal]];

const today=()=>{const d=new Date(Date.now()+9*3600e3);return d.getUTCFullYear()+"."+String(d.getUTCMonth()+1).padStart(2,"0")+"."+String(d.getUTCDate()).padStart(2,"0")};
export function ShareStudio({v,team,kind,memberId}:{v:Row;team:Row;kind:"roster"|"transfer";memberId?:string}){
 const styles=kind==="roster"?ROSTER_STYLES:TRANSFER_STYLES;
 const [style,setStyle]=useState(0),[busy,setBusy]=useState(true);
 const ref=useRef<HTMLCanvasElement>(null);
 const data:Data=useMemo(()=>{
  const act:Row[]=(v.members??[]).filter((m:Row)=>m.status==="active");
  const players=act.map(m=>({name:m.name,number:m.number??null,position:m.position??"",group:positionGroup(m.position),photo:m.photo}));
  // 가장 가까운 다음 경기의 1쿼터 라인업(있으면 축구장 그림에 그대로)
  const next=(v.games??[]).filter((g:Row)=>g.status==="scheduled"&&Date.parse(g.end)>Date.now()).sort((a:Row,b:Row)=>String(a.start).localeCompare(String(b.start)))[0];
  const side=next?(v.sides??[]).find((z:Row)=>z.gameId===next.id):null;
  const who=memberId?players[act.findIndex(m=>m.id===memberId)]:undefined;
  return {team:{name:team?.name??"우리 팀",color:team?.color??"",logo:team?.logo,region:team?.region},players,date:today(),lineup:side?.lineups?.[0]??null,who};
 },[v,team,memberId]);
 useEffect(()=>{let live=true;const c=ref.current;if(!c)return;const ctx=c.getContext("2d")!;
  (async()=>{setBusy(true);try{await document.fonts?.load('900 40px "Pretendard Variable"').catch(()=>null);ctx.clearRect(0,0,W,H);ctx.save();
   if(kind==="transfer"&&!data.who){ctx.fillStyle="#111";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";font(ctx,40,800);ctx.textAlign="center";ctx.fillText("선수를 찾을 수 없어요",W/2,H/2)}
   else await styles[style][2](ctx,data);ctx.restore()}finally{if(live)setBusy(false)}})();
  return()=>{live=false}},[style,data,kind,styles]);
 async function blob(){return new Promise<Blob|null>(res=>ref.current?.toBlob(res,"image/png"))}
 const fileName=()=>(kind==="roster"?"teamkick-squad-":"teamkick-herewego-")+styles[style][0]+".png";
 async function share(){const b=await blob();if(!b){toast.error("이미지를 만들지 못했어요.");return}
  const file=new File([b],fileName(),{type:"image/png"});
  const nav=navigator as Navigator&{canShare?:(d:ShareData)=>boolean};
  if(nav.share&&nav.canShare?.({files:[file]})){try{await nav.share({files:[file],title:data.team.name})}catch{}return}
  download(b);toast("이 브라우저는 바로 공유가 안 돼서 이미지로 저장했어요.");}
 function download(b?:Blob|null){const go=(x:Blob)=>{const u=URL.createObjectURL(x);const a=document.createElement("a");a.href=u;a.download=fileName();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)};
  if(b)go(b);else blob().then(x=>x&&go(x))}
 return <div className="share-studio">
  <div className="share-styles">{styles.map(([k,label],i)=><button key={k} type="button" className={"chip-btn"+(style===i?" on":"")} onClick={()=>setStyle(i)}>{label}</button>)}</div>
  <div className="share-canvas"><canvas ref={ref} width={W} height={H}/>{busy&&<span className="share-busy"><LoaderCircle className="loader" size={22}/></span>}</div>
  <div className="row share-actions"><button type="button" className="btn btn-green" disabled={busy} onClick={share}><Share2 size={16}/>공유하기</button><button type="button" className="btn" disabled={busy} onClick={()=>download()}><Download size={16}/>이미지 저장</button></div>
  <p className="data-note">팀이 올린 로고·선수 사진과 이름·등번호로 팀킥이 그린 이미지예요. 사진 속 사람에게 올려도 되는지 먼저 물어봐 주세요.</p>
 </div>;
}
