"use client";
// 1.21 매칭 지도 보기(사장님 승인 시안). 카카오 지도 JavaScript SDK 로 구장마다 핀을 찍고, 핀 숫자는 지금 조건(날짜·시간대)의
// 모집 수다. 핀을 누르면 아래 목록이 그 구장의 모집으로 바뀐다(목록은 screens.tsx 가 그린다).
// 키는 카카오 개발자센터의 JavaScript 키(도메인 제한이 걸린 공개용 키)다. 서버 환경변수에서 로그인한 사람에게만 내려준다.
// 내 위치는 쓰지 않는다(위치정보법). 처음 화면은 구장 핀이 모두 보이게, 핀이 없으면 우리 팀 지역 근처.
import {useEffect,useRef,useState} from "react";

type Venue={key:string;name:string;lat?:number;lng?:number;count:number};
type KMap={setBounds:(b:unknown)=>void;setCenter:(p:unknown)=>void;setLevel:(n:number)=>void;relayout:()=>void};
type Kakao={maps:{load:(f:()=>void)=>void;LatLng:new(a:number,b:number)=>unknown;LatLngBounds:new()=>{extend:(p:unknown)=>void};Map:new(el:HTMLElement,o:Record<string,unknown>)=>KMap;CustomOverlay:new(o:Record<string,unknown>)=>{setMap:(m:KMap|null)=>void}}};
declare global{interface Window{kakao?:Kakao}}

let sdk:Promise<Kakao>|null=null;
function loadSdk(key:string){
 if(!sdk)sdk=new Promise<Kakao>((ok,no)=>{
  const done=()=>window.kakao!.maps.load(()=>ok(window.kakao!));
  if(window.kakao?.maps){done();return}
  const s=document.createElement("script");s.src="https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey="+encodeURIComponent(key);s.async=true;
  s.onload=()=>window.kakao?.maps?done():no(new Error("sdk"));s.onerror=()=>no(new Error("load"));document.head.appendChild(s);
 }).catch(e=>{sdk=null;throw e});
 return sdk;
}
// 지역 이름 → 처음 보여줄 대략의 중심(핀이 하나도 없을 때만 쓴다)
const AREA:Record<string,[number,number]>={"서울":[37.5665,126.978],"경기 남부":[37.32,127.1],"경기 북부":[37.74,127.05],"인천":[37.456,126.705],"강원":[37.75,128.2],"대전":[36.35,127.385],"세종":[36.48,127.29],"충북":[36.64,127.49],"충남":[36.66,126.67],"광주":[35.16,126.85],"전북":[35.82,127.15],"전남":[34.82,126.46],"대구":[35.87,128.6],"경북":[36.02,129.34],"부산":[35.18,129.075],"울산":[35.54,129.31],"경남":[35.23,128.68],"제주":[33.5,126.53]};

export function VenueMap({apiKey,venues,selected,onSelect,region}:{apiKey:string;venues:Venue[];selected:string;onSelect:(k:string)=>void;region?:string}){
 const box=useRef<HTMLDivElement>(null),map=useRef<KMap|null>(null),pins=useRef<{setMap:(m:KMap|null)=>void}[]>([]);
 const [state,setState]=useState<"loading"|"ok"|"error">("loading");
 const placed=venues.filter(x=>typeof x.lat==="number"&&typeof x.lng==="number"&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
 const sig=placed.map(x=>x.key+":"+x.count).join("|")+"#"+selected;
 useEffect(()=>{let live=true;
  loadSdk(apiKey).then(k=>{if(!live||!box.current)return;
   if(!map.current){const c=AREA[region??""]??AREA["서울"];map.current=new k.maps.Map(box.current,{center:new k.maps.LatLng(c[0],c[1]),level:8})}
   setState("ok");
  }).catch(()=>live&&setState("error"));
  return()=>{live=false};
 },[apiKey,region]);
 // 핀 다시 그리기(조건·선택이 바뀔 때)
 useEffect(()=>{const k=window.kakao,m=map.current;if(state!=="ok"||!k||!m)return;
  pins.current.forEach(p=>p.setMap(null));pins.current=[];
  const bounds=new k.maps.LatLngBounds();
  for(const v of placed){
   const el=document.createElement("button");el.type="button";el.className="vm-pin"+(v.count?"":" zero")+(v.key===selected?" on":"");
   el.setAttribute("aria-label",v.name+" 모집 "+v.count+"건");
   const b=document.createElement("b");b.textContent=String(v.count);const n=document.createElement("span");n.textContent=v.name;el.appendChild(b);el.appendChild(n);
   el.addEventListener("click",()=>onSelect(v.key));
   const pos=new k.maps.LatLng(v.lat!,v.lng!);bounds.extend(pos);
   const o=new k.maps.CustomOverlay({position:pos,content:el,yAnchor:1,clickable:true});o.setMap(m);pins.current.push(o);
  }
  if(placed.length)m.setBounds(bounds);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[state,sig]);
 return <div className="vm">
  <div ref={box} className="vm-map" aria-label="구장 지도"/>
  {state==="loading"&&<p className="vm-note">지도를 불러오는 중…</p>}
  {state==="error"&&<p className="vm-note">지도를 불러오지 못했어요. 카카오 개발자센터의 Web 도메인 등록과 JavaScript 키를 확인해 주세요. 아래 구장 목록은 그대로 쓸 수 있어요.</p>}
  {venues.length>placed.length&&<p className="vm-miss">지도에 없는 구장 {venues.length-placed.length}곳(직접 입력한 구장) — 아래 칩에서 골라요.</p>}
 </div>;
}
