"use client";
import {useState,useEffect} from "react";

// 앱을 열면 잠깐 로고를 보여준다.
// 위쪽은 나중에 광고가 들어갈 자리로 비워 둔다. 그때 로고만 아래로 내리면 되도록
// 지금부터 같은 구조로 만들어 둔다. 나중에 화면을 갈아엎지 않기 위해서다.
const SHOWN="teamkick_splash_shown";
export const SPLASH_MS=2000;


// 로고. 파일로 불러오면 받는 동안 빈 화면이 보여서 직접 그린다.
function Mark(){
 return <svg className="splash-mark" viewBox="0 0 512 512" role="img" aria-label="팀킥">
  <g transform="skewX(-13)" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontWeight="900"
     fill="#ffffff" stroke="#ffffff" strokeWidth="7" strokeLinejoin="round">
   <text x="118" y="236" fontSize="128" textLength="372" lengthAdjust="spacingAndGlyphs">TEAM</text>
   <text x="118" y="356" fontSize="128" textLength="372" lengthAdjust="spacingAndGlyphs">KICK</text>
  </g>
  <polygon points="182,378 452,378 438,414 168,414" fill="#16f08a" transform="skewX(-13)"/>
 </svg>;
}

export function Splash({ad=false}:{ad?:boolean}){
 const [show,setShow]=useState(false);

 useEffect(()=>{
  // 한 번 본 사람에게 매번 2초를 쓰게 하지 않는다. 탭을 닫으면 다시 보여준다.
  let seen=true;
  try{seen=sessionStorage.getItem(SHOWN)==="1"}catch{seen=false}
  if(seen)return;
  try{sessionStorage.setItem(SHOWN,"1")}catch{}
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 화면을 그린 뒤에만 읽을 수 있다
  setShow(true);
  const t=setTimeout(()=>setShow(false),SPLASH_MS);
  return()=>clearTimeout(t);
 },[]);

 if(!show)return null;
 return <div className="splash" data-ad={ad?"true":"false"} role="presentation"
   onClick={()=>setShow(false)} onKeyDown={()=>setShow(false)}>
  {/* 광고 자리. 지금은 비어 있고 자리만 잡는다. */}
  <div className="splash-ad" aria-hidden/>
  <Mark/>
 </div>;
}
