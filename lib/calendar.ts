// 경기를 폰 캘린더에 넣는 .ics 파일(RFC 5545)과 구글 캘린더 링크. 외부 API 없이 만든다.
export type CalEvent={id:string;title:string;start:string;end:string;location:string;description:string;url:string};
const stamp=(iso:string)=>new Date(iso).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
// 쉼표·세미콜론·역슬래시·줄바꿈은 이스케이프해야 캘린더 앱이 깨지지 않는다.
export const icsText=(s:string)=>String(s??"").replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
// 한 줄은 75바이트까지 — 넘으면 줄을 접는다(다음 줄은 공백으로 시작). 한글은 3바이트라 글자 단위로 센다.
function fold(line:string){
 const enc=new TextEncoder();const out:string[]=[];let cur="",bytes=0;
 for(const ch of line){const b=enc.encode(ch).length;if(bytes+b>(out.length?74:75)){out.push(cur);cur=ch;bytes=b}else{cur+=ch;bytes+=b}}
 out.push(cur);return out.join("\r\n ");
}
export function icsFor(e:CalEvent,now=Date.now()){
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//TeamKick//팀킥//KO","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
  "UID:"+e.id+"@teamkick.co.kr","DTSTAMP:"+stamp(new Date(now).toISOString()),"DTSTART:"+stamp(e.start),"DTEND:"+stamp(e.end),
  "SUMMARY:"+icsText(e.title),"LOCATION:"+icsText(e.location),"DESCRIPTION:"+icsText(e.description),"URL:"+e.url,
  // 경기 3시간 전 알림
  "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsText(e.title),"TRIGGER:-PT3H","END:VALARM",
  "END:VEVENT","END:VCALENDAR"];
 return lines.map(fold).join("\r\n")+"\r\n";
}
export function googleCalendarUrl(e:CalEvent){
 return "https://calendar.google.com/calendar/render?"+new URLSearchParams({action:"TEMPLATE",text:e.title,dates:stamp(e.start)+"/"+stamp(e.end),location:e.location,details:e.description}).toString();
}
