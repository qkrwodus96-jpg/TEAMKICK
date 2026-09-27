// 경기 날 날씨·미세먼지. 공공데이터포털(기상청 단기예보, 한국환경공단 에어코리아) 응답을 화면용으로 바꾼다.
// 외부로 보내는 것은 **구장 위치(격자 좌표)와 지역 이름**뿐이다. 이용자 정보·위치는 보내지 않는다.

// 기상청 격자 변환(람베르트 정각원추도법, 기상청 단기예보 조회서비스 활용가이드의 공식).
export function toGrid(lat:number,lng:number){
 const RE=6371.00877,GRID=5.0,SLAT1=30.0,SLAT2=60.0,OLON=126.0,OLAT=38.0,XO=43,YO=136;
 const D=Math.PI/180,re=RE/GRID,slat1=SLAT1*D,slat2=SLAT2*D,olon=OLON*D,olat=OLAT*D;
 let sn=Math.tan(Math.PI*0.25+slat2*0.5)/Math.tan(Math.PI*0.25+slat1*0.5);sn=Math.log(Math.cos(slat1)/Math.cos(slat2))/Math.log(sn);
 let sf=Math.tan(Math.PI*0.25+slat1*0.5);sf=Math.pow(sf,sn)*Math.cos(slat1)/sn;
 let ro=Math.tan(Math.PI*0.25+olat*0.5);ro=re*sf/Math.pow(ro,sn);
 let ra=Math.tan(Math.PI*0.25+lat*D*0.5);ra=re*sf/Math.pow(ra,sn);
 let theta=lng*D-olon;if(theta>Math.PI)theta-=2*Math.PI;if(theta<-Math.PI)theta+=2*Math.PI;theta*=sn;
 return {nx:Math.floor(ra*Math.sin(theta)+XO+0.5),ny:Math.floor(ro-ra*Math.cos(theta)+YO+0.5)};
}
export const inKorea=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33&&lat<=39&&lng>=124&&lng<=132;

const kst=(ms:number)=>new Date(ms+9*3600e3);
const pad=(n:number)=>String(n).padStart(2,"0");
export const ymd=(ms:number)=>{const k=kst(ms);return k.getUTCFullYear()+pad(k.getUTCMonth()+1)+pad(k.getUTCDate())};
export const ymdDash=(ms:number)=>{const s=ymd(ms);return s.slice(0,4)+"-"+s.slice(4,6)+"-"+s.slice(6)};

// 단기예보는 하루 8번(02·05·08·11·14·17·20·23시) 발표되고 발표 10분쯤 뒤부터 받을 수 있다.
// 여유를 두고 15분이 지난 가장 최근 발표를 쓴다.
export function baseFor(now:number){
 const hours=[2,5,8,11,14,17,20,23];const k=kst(now-15*60e3);const h=k.getUTCHours();
 const past=hours.filter(x=>x<=h);
 if(past.length)return {date:ymd(now-15*60e3),time:pad(past[past.length-1])+"00"};
 return {date:ymd(now-15*60e3-24*3600e3),time:"2300"};
}

export type Forecast={temp:number|null;pop:number|null;pty:number;sky:number;wind:number|null;label:string;rainy:boolean};
type Item={category?:string;fcstDate?:string;fcstTime?:string;fcstValue?:string};
// 경기 시작 시각(한국 시간, 시 단위로 내림)의 예보를 고른다. 그 시각이 예보 범위 밖이면 null.
export function pickForecast(items:Item[],startMs:number):Forecast|null{
 const date=ymd(startMs),time=pad(kst(startMs).getUTCHours())+"00";
 const at=items.filter(x=>x.fcstDate===date&&x.fcstTime===time);if(!at.length)return null;
 const v=(c:string)=>at.find(x=>x.category===c)?.fcstValue;const num=(c:string)=>{const n=Number(v(c));return v(c)===undefined||!Number.isFinite(n)?null:n};
 const pty=num("PTY")??0,sky=num("SKY")??1,pop=num("POP");
 const label=pty===1?"비":pty===2?"비/눈":pty===3?"눈":pty===4?"소나기":sky===4?"흐림":sky===3?"구름많음":"맑음";
 return {temp:num("TMP"),pop,pty,sky,wind:num("WSD"),label,rainy:pty>0||(pop??0)>=60};
}

// 대기질 예보(에어코리아)의 권역 이름. 팀·경기 지역(REGIONS)에서 바꾼다. 강원은 경도로 영동/영서를 나눈다.
export function airRegion(region:string,lng?:number|null){
 const r=String(region??"").trim();
 if(r==="경기 남부")return "경기남부";if(r==="경기 북부")return "경기북부";
 if(r==="강원")return (lng??0)>=128.6?"영동":"영서";
 return r;
}
// informGrade 예: "서울 : 보통,제주 : 좋음,경기북부 : 나쁨"
export function pickAir(items:{informCode?:string;informData?:string;informGrade?:string}[],code:"PM10"|"PM25",dateDash:string,region:string){
 const row=items.find(x=>x.informCode===code&&x.informData===dateDash);if(!row?.informGrade)return null;
 for(const part of row.informGrade.split(",")){const [name,grade]=part.split(":").map(x=>x.trim());if(name===region&&grade)return grade}
 return null;
}
export type GameWeather={status:"ok"|"far"|"past";forecast?:Forecast|null;air?:{pm10:string|null;pm25:string|null}|null};
