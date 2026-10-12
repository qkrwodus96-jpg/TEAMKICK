// 포메이션(1.18). 세로 축구장 기준 좌표: x 0(왼쪽)~100(오른쪽), y 0(상대 골대)~100(우리 골대).
// 자리 이름(k)은 한 포메이션 안에서 겹치지 않는다. 화면은 이 좌표에 선수(유니폼·등번호·이름)를 놓는다.
export type Slot={k:string;x:number;y:number};
const GK:Slot={k:"GK",x:50,y:91};
const BACK4:Slot[]=[{k:"LB",x:14,y:71},{k:"LCB",x:37,y:76},{k:"RCB",x:63,y:76},{k:"RB",x:86,y:71}];
const BACK3:Slot[]=[{k:"LCB",x:27,y:75},{k:"CB",x:50,y:77},{k:"RCB",x:73,y:75}];
const TWO_UP:Slot[]=[{k:"LS",x:37,y:20},{k:"RS",x:63,y:20}];
const THREE_UP:Slot[]=[{k:"LW",x:18,y:25},{k:"ST",x:50,y:17},{k:"RW",x:82,y:25}];
export const FORMATIONS:Record<string,Slot[]>={
 "4-4-2":[GK,...BACK4,{k:"LM",x:14,y:47},{k:"LCM",x:37,y:51},{k:"RCM",x:63,y:51},{k:"RM",x:86,y:47},...TWO_UP],
 "4-3-3":[GK,...BACK4,{k:"LCM",x:28,y:51},{k:"CM",x:50,y:56},{k:"RCM",x:72,y:51},...THREE_UP],
 "4-2-3-1":[GK,...BACK4,{k:"LDM",x:37,y:59},{k:"RDM",x:63,y:59},{k:"LAM",x:18,y:37},{k:"CAM",x:50,y:39},{k:"RAM",x:82,y:37},{k:"ST",x:50,y:17}],
 "4-1-4-1":[GK,...BACK4,{k:"CDM",x:50,y:61},{k:"LM",x:14,y:43},{k:"LCM",x:37,y:45},{k:"RCM",x:63,y:45},{k:"RM",x:86,y:43},{k:"ST",x:50,y:17}],
 "3-5-2":[GK,...BACK3,{k:"LWB",x:10,y:48},{k:"LCM",x:32,y:51},{k:"CDM",x:50,y:59},{k:"RCM",x:68,y:51},{k:"RWB",x:90,y:48},...TWO_UP],
 "3-4-3":[GK,...BACK3,{k:"LM",x:13,y:49},{k:"LCM",x:37,y:52},{k:"RCM",x:63,y:52},{k:"RM",x:87,y:49},...THREE_UP],
 "5-3-2":[GK,{k:"LWB",x:10,y:64},{k:"LCB",x:30,y:75},{k:"CB",x:50,y:77},{k:"RCB",x:70,y:75},{k:"RWB",x:90,y:64},{k:"LCM",x:28,y:48},{k:"CM",x:50,y:52},{k:"RCM",x:72,y:48},...TWO_UP],
};
// 축구 포메이션 이름(라인업·포스터의 고르기 칩). 풋살 포메이션은 아래에서 FORMATIONS 에 합친다.
export const FORMATION_NAMES=Object.keys(FORMATIONS);
// 1.31 풋살(세로 풋살장 기준, 좌표 규칙은 위와 같다). 자리 이름: GK 골키퍼, FX 픽소(맨 뒤 수비),
// LA·RA·CA 알라(왼쪽·오른쪽·가운데), PV 피보(맨 앞). 둘이면 L·R 를 붙인다(LFX·RFX, LPV·RPV).
const FGK:Slot={k:"GK",x:50,y:90};
export const FUTSAL_FORMATIONS:Record<string,Slot[]>={
 "1-1-1":[FGK,{k:"FX",x:50,y:70},{k:"CA",x:50,y:47},{k:"PV",x:50,y:22}],
 "2-1":[FGK,{k:"LFX",x:30,y:67},{k:"RFX",x:70,y:67},{k:"PV",x:50,y:26}],
 "1-2":[FGK,{k:"FX",x:50,y:69},{k:"LA",x:24,y:34},{k:"RA",x:76,y:34}],
 "1-2-1":[FGK,{k:"FX",x:50,y:71},{k:"LA",x:17,y:47},{k:"RA",x:83,y:47},{k:"PV",x:50,y:22}],
 "2-2":[FGK,{k:"LFX",x:30,y:68},{k:"RFX",x:70,y:68},{k:"LPV",x:30,y:30},{k:"RPV",x:70,y:30}],
 "3-1":[FGK,{k:"LA",x:17,y:63},{k:"FX",x:50,y:70},{k:"RA",x:83,y:63},{k:"PV",x:50,y:25}],
 "1-2-2":[FGK,{k:"FX",x:50,y:72},{k:"LA",x:18,y:50},{k:"RA",x:82,y:50},{k:"LPV",x:32,y:22},{k:"RPV",x:68,y:22}],
 "2-2-1":[FGK,{k:"LFX",x:30,y:71},{k:"RFX",x:70,y:71},{k:"LA",x:16,y:45},{k:"RA",x:84,y:45},{k:"PV",x:50,y:21}],
 "2-1-2":[FGK,{k:"LFX",x:30,y:71},{k:"RFX",x:70,y:71},{k:"CA",x:50,y:48},{k:"LPV",x:28,y:23},{k:"RPV",x:72,y:23}],
};
// 경기 형식(인원)별로 고를 수 있는 풋살 포메이션. 첫 번째가 기본값.
export const FUTSAL_BY_FORMAT:Record<string,string[]>={"4인제":["1-1-1","2-1","1-2"],"5인제":["1-2-1","2-2","3-1"],"6인제":["1-2-2","2-2-1","2-1-2"]};
Object.assign(FORMATIONS,FUTSAL_FORMATIONS);
// 경기에 맞는 포메이션 목록: 축구는 축구 포메이션 전부, 풋살은 그 인원의 것만.
export const formationsFor=(g:{[key:string]:unknown}|null|undefined)=>g?.sport==="futsal"?(FUTSAL_BY_FORMAT[String(g.format??"")]??FUTSAL_BY_FORMAT["5인제"]):FORMATION_NAMES;
// 화면에 보일 자리 이름. 축구는 영어 약자 그대로, 풋살은 한국에서 쓰는 이름.
const FUTSAL_SLOT:Record<string,string>={FX:"픽소",LFX:"픽소",RFX:"픽소",LA:"알라",RA:"알라",CA:"알라",PV:"피보",LPV:"피보",RPV:"피보"};
export const slotLabel=(k:string)=>FUTSAL_SLOT[k]??k;
// 자리 이름 → 포지션 묶음(색 표시용)
export const slotGroup=(k:string)=>k==="GK"?"GK":/FX$/.test(k)?"DF":/PV$/.test(k)?"FW":/B$|CB|WB/.test(k)?"DF":/S$|ST|W$/.test(k)?"FW":"MF";

// 1.20 포지션대로 자리 넣기: 선수 포지션(LB·CB·CDM·ST…)과 같은 자리를 먼저, 그다음 같은 줄(수비·미드·공격)에서
// 왼쪽 포지션은 왼쪽 자리·오른쪽은 오른쪽 자리, 마지막에 남는 자리(골키퍼 자리는 맨 끝)에 넣는다.
// 공유 포스터와 라인업 자동 분배가 같은 규칙을 쓴다.
// 뒤쪽 FX·LA·PV 등은 풋살 자리(1.31) — 그 포메이션에 있는 자리만 쓰이므로 축구 결과는 그대로다.
const POS_SLOTS:Record<string,string[]>={GK:["GK"],LB:["LB","LWB","LFX","LA"],RB:["RB","RWB","RFX","RA"],CB:["LCB","RCB","CB","FX","LFX","RFX"],LCB:["LCB","CB","LFX","FX"],RCB:["RCB","CB","RFX","FX"],LWB:["LWB","LB","LM","LA","LFX"],RWB:["RWB","RB","RM","RA","RFX"],
 CDM:["CDM","LDM","RDM","CM","FX","CA"],DM:["CDM","LDM","RDM","FX","CA"],CM:["CM","LCM","RCM","CDM","CA","LA","RA"],CAM:["CAM","LAM","RAM","CM","CA","PV"],AM:["CAM","LAM","RAM","CA","PV"],LM:["LM","LAM","LW","LWB","LA"],RM:["RM","RAM","RW","RWB","RA"],
 LW:["LW","LAM","LM","LS","LA","LPV"],RW:["RW","RAM","RM","RS","RA","RPV"],ST:["ST","LS","RS","PV","LPV","RPV"],CF:["ST","LS","RS","CAM","PV","LPV","RPV"],SS:["LS","RS","ST","CAM","LPV","RPV","PV"],FW:["ST","LS","RS","LW","RW","PV","LPV","RPV"],DF:["LCB","RCB","CB","LB","RB","FX","LFX","RFX"],MF:["CM","LCM","RCM","CDM","CAM","LM","RM","CA","LA","RA"]};
export const LINE_ORDER=["GK","DF","MF","FW"];
type Placeable={position:string;group:string;number?:number|null};
export function placeByPosition<T extends Placeable>(formation:string,players:T[]):Record<string,T>{
 const slots=FORMATIONS[formation]??FORMATIONS["4-4-2"];
 const free=new Map(slots.map(s=>[s.k,s]));const out:Record<string,T>={};const left:T[]=[];
 const order=[...players].sort((a,b)=>LINE_ORDER.indexOf(a.group)-LINE_ORDER.indexOf(b.group)||(a.number??999)-(b.number??999));
 for(const p of order){const want=POS_SLOTS[p.position.toUpperCase()]??[];const k=want.find(x=>free.has(x));if(k){out[k]=p;free.delete(k)}else left.push(p)}
 const side=(pos:string)=>/^L/.test(pos)?0:/^R/.test(pos)?100:50;
 const rest:T[]=[];for(const p of left){const pos=p.position.toUpperCase();const cand=[...free.values()].filter(x=>slotGroup(x.k)===p.group).sort((a,b)=>Math.abs(a.x-side(pos))-Math.abs(b.x-side(pos)));
  const k=cand[0]?.k;if(k){out[k]=p;free.delete(k)}else rest.push(p)}
 for(const p of rest){const k=[...free.keys()].find(x=>x!=="GK")??[...free.keys()][0];if(!k)break;out[k]=p;free.delete(k)}
 return out;
}

// 1.20 쿼터 자동 분배: 참여한 사람이 되도록 같은 쿼터 수만큼 뛰게 나눈다.
// 쿼터마다 지금까지 덜 뛴 사람 → 바로 앞 쿼터에 쉰 사람 → 명단 순서로 고른다. 골키퍼 포지션이 있으면
// 그중 덜 뛴 한 명을 먼저 넣는다(골키퍼가 한 명뿐이면 그 선수는 모든 쿼터에 들어간다).
// 결과: 쿼터별 자리 배치. 같은 입력이면 늘 같은 결과(무작위 없음)라 다시 눌러도 바뀌지 않는다.
export function splitQuarters<T extends Placeable&{id:string}>(formation:string,players:T[],quarters:number):Record<string,T>[]{
 const size=Math.min((FORMATIONS[formation]??FORMATIONS["4-4-2"]).length,players.length);
 const played=new Map(players.map(p=>[p.id,0]));let last=new Set<string>();const out:Record<string,T>[]=[];
 for(let q=0;q<quarters;q++){
  const rank=(a:T,b:T)=>played.get(a.id)!-played.get(b.id)!||Number(last.has(a.id))-Number(last.has(b.id))||players.indexOf(a)-players.indexOf(b);
  const pick:T[]=[];const gk=players.filter(p=>p.group==="GK").sort(rank)[0];if(gk&&size>0)pick.push(gk);
  for(const p of [...players].sort(rank)){if(pick.length>=size)break;if(!pick.includes(p)&&!(gk&&p.group==="GK"))pick.push(p)}
  // 필드 선수가 모자라면 남은 골키퍼 포지션도 필드로 넣는다
  for(const p of [...players].sort(rank)){if(pick.length>=size)break;if(!pick.includes(p))pick.push(p)}
  for(const p of pick)played.set(p.id,played.get(p.id)!+1);last=new Set(pick.map(p=>p.id));
  // 골키퍼로 뽑힌 사람만 GK 포지션으로 두고, 나머지 골키퍼 포지션은 필드(수비) 쪽으로 보낸다.
  out.push(placeByPosition(formation,pick.map(p=>p.group==="GK"&&p!==gk?{...p,position:"CB",group:"DF"}:p)) as Record<string,T>);
 }
 return out;
}
