// 날짜·시간을 사람이 읽는 말로 적는다. 기준은 한국 시간(Asia/Seoul).
// 1.19 사장님 요청: "10. 7. (수) · 오전 10:00" 처럼 점이 박힌 표기 대신
// "10/7(수) 오전 10시", 시간대는 "오전 10시~12시".
// 서버(알림 문구)와 화면이 같은 표기를 쓰도록 여기 한 곳에 둔다.
const DOW="일월화수목금토";
const kst=(iso:string)=>new Date(Date.parse(iso)+9*3600e3);

function clock(iso:string){
 const d=kst(iso),h=d.getUTCHours(),m=d.getUTCMinutes();
 return {pm:h>=12,text:(h%12||12)+"시"+(m?" "+m+"분":""),noon:h===12};
}

// 10/7(수)
export function dayText(iso:string){
 const d=kst(iso);
 return (d.getUTCMonth()+1)+"/"+d.getUTCDate()+"("+DOW[d.getUTCDay()]+")";
}

// 오전 10시 · 오후 7시 30분
export function clockText(iso:string){
 const c=clock(iso);
 return (c.pm?"오후 ":"오전 ")+c.text;
}

// 오전 10시~12시 · 오전 11시~오후 1시 · 오후 7시~9시
// 끝이 같은 오전/오후면 앞말을 한 번만 쓴다. 오전에 시작해 낮 12시에 끝나면
// "오전 10시~12시" 가 자연스러우므로 그때도 뺀다.
export function rangeText(start:string,end?:string){
 if(!end||!Number.isFinite(Date.parse(end)))return clockText(start);
 const a=clock(start),b=clock(end);
 const same=a.pm===b.pm||(!a.pm&&b.noon);
 return clockText(start)+"~"+(same?b.text:(b.pm?"오후 ":"오전 ")+b.text);
}

// 10/7(수) 오전 10시
export const whenText=(iso:string)=>dayText(iso)+" "+clockText(iso);
// 10/7(수) 오전 10시~12시
export const whenRange=(start:string,end?:string)=>dayText(start)+" "+rangeText(start,end);
