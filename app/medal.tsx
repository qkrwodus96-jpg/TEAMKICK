// 1.22 1·2·3등 메달(사장님이 보낸 그림 느낌 — 금·은·동 동전, 두꺼운 테두리, 기울어진 검은 숫자).
// 그림 파일 없이 SVG 로 그린다(어느 크기에서도 선명, 저작권 걱정 없음). 4등부터는 쓰지 않는다.
const TONE:Record<number,[string,string,string,string]>={ // 밝은 면, 어두운 면, 옆면(두께), 안쪽 테
 1:["#ffe27a","#f0b21f","#c48a10","#d99a16"],
 2:["#f4f5f7","#c3c7cd","#8e939a","#a7acb3"],
 3:["#f6b98c","#dd8550","#a8572c","#c46c3c"],
};
export function Medal({n,size=40,title}:{n:number;size?:number;title?:string}){
 const t=TONE[n];if(!t)return null;const id="tkm"+n;
 return <svg className="medal" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title??n+"등"}>
  <defs><linearGradient id={id} x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor={t[0]}/><stop offset="1" stopColor={t[1]}/></linearGradient></defs>
  <circle cx="35" cy="33.5" r="27.5" fill={t[2]}/>
  <circle cx="31.5" cy="31.5" r="27.5" fill={`url(#${id})`}/>
  <circle cx="31.5" cy="31.5" r="21" fill="none" stroke={t[3]} strokeWidth="2.6"/>
  <circle cx="31.5" cy="31.5" r="27" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1"/>
  <text x="31.5" y="42" textAnchor="middle" fontSize="30" fontWeight="900" fontStyle="italic" fill="#1d1e21" fontFamily="'Anton','Pretendard Variable',system-ui,sans-serif">{n}</text>
 </svg>;
}
