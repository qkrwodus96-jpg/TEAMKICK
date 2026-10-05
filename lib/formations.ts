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
export const FORMATION_NAMES=Object.keys(FORMATIONS);
// 자리 이름 → 포지션 묶음(색 표시용)
export const slotGroup=(k:string)=>k==="GK"?"GK":/B$|CB|WB/.test(k)?"DF":/S$|ST|W$/.test(k)?"FW":"MF";

// 1.20 포지션대로 자리 넣기: 선수 포지션(LB·CB·CDM·ST…)과 같은 자리를 먼저, 그다음 같은 줄(수비·미드·공격)에서
// 왼쪽 포지션은 왼쪽 자리·오른쪽은 오른쪽 자리, 마지막에 남는 자리(골키퍼 자리는 맨 끝)에 넣는다.
// 공유 포스터와 라인업 자동 분배가 같은 규칙을 쓴다.
const POS_SLOTS:Record<string,string[]>={GK:["GK"],LB:["LB","LWB"],RB:["RB","RWB"],CB:["LCB","RCB","CB"],LCB:["LCB","CB"],RCB:["RCB","CB"],LWB:["LWB","LB","LM"],RWB:["RWB","RB","RM"],
 CDM:["CDM","LDM","RDM","CM"],DM:["CDM","LDM","RDM"],CM:["CM","LCM","RCM","CDM"],CAM:["CAM","LAM","RAM","CM"],AM:["CAM","LAM","RAM"],LM:["LM","LAM","LW","LWB"],RM:["RM","RAM","RW","RWB"],
 LW:["LW","LAM","LM","LS"],RW:["RW","RAM","RM","RS"],ST:["ST","LS","RS"],CF:["ST","LS","RS","CAM"],SS:["LS","RS","ST","CAM"],FW:["ST","LS","RS","LW","RW"],DF:["LCB","RCB","CB","LB","RB"],MF:["CM","LCM","RCM","CDM","CAM","LM","RM"]};
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
