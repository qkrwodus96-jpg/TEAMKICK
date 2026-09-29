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
