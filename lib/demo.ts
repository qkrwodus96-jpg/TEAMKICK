import {blank,newSide,id,type State,type Row,iso} from "./model";
export function demoState():State{
 const s=blank(),now=new Date(),d=new Date(now.getTime()+9*3600e3);d.setUTCHours(10,0,0,0);d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7||7));const next=d.getTime()-9*3600e3;
 s.settings=[{id:"owner",userId:"demo-a"}];
 s.teams=[{id:"team-a",name:"한강 FC",region:"서울",description:"일요일 아침, 함께 뛰는 즐거움. 매너 있는 축구를 지향하는 한강 FC입니다.",days:"일요일 오전",format:"11인제",level:"중급",status:"active",applicant:"demo-a",applicantName:"김지훈",at:iso(next-90*864e5),color:"green"},{id:"team-b",name:"서울 유나이티드",region:"서울",description:"꾸준하게, 즐겁게 함께 뛰는 팀입니다.",days:"주말",format:"11인제",level:"중급",status:"active",applicant:"demo-b",applicantName:"이준호",at:iso(next-60*864e5),color:"orange"},{id:"team-c",name:"분당 FC",region:"경기 남부",description:"신규 팀 등록을 신청합니다.",status:"pending",applicant:"demo-c",applicantName:"최민수",at:iso(),format:"11인제",color:"blue"}];
 const names=["김지훈","김민준","이도현","정우진","김태훈","박성민","최현우","이준서","강민석","오지훈","한승우","윤서진","장민호","조영준"];
 for(const team of ["a","b"]){names.forEach((n,i)=>{const uid=i===0?"demo-"+team:"demo-"+team+"-"+i;s.users.push({id:uid,name:team==="a"?n:(i===0?"이준호":n)});s.members.push({id:team+"-p"+i,userId:uid,teamId:"team-"+team,name:team==="a"?n:i===0?"이준호":n,number:[7,10,9,8,6,4,5,11,14,17,20,1,3,12][i],position:i===11?"GK":i<3?"FW":i<7?"MF":"DF",role:i===0?"captain":i===3?"manager":"member",status:"active",periods:[{start:iso(next-120*864e5)}],at:iso()})})}
 s.members.push({id:"join-1",userId:"new-user",teamId:"team-a",name:"김지성",number:18,position:"MF",role:"member",status:"pending",periods:[],at:iso()});
 for(let i=0;i<6;i++){
 const isPast=i>=3,when=isPast?next-(i-2)*7*864e5:next+i*7*864e5;
 const g:any={id:"game-"+i,home:"team-a",away:i===0?"team-b":null,external:i===1?"":i===0?"":["","","마포 FC","서강 FC","용산 FC","여의도 FC"][i],start:iso(when),end:iso(when+2*3600e3),venue:i===1?"월드컵공원 축구장":"난지천공원 인조잔디축구장",address:i===1?"서울 마포구 하늘공원로 108":"서울 마포구 월드컵로 365",region:"서울",format:"11인제",secured:true,cost:100000,status:isPast?"completed":"scheduled",listing:i===1?"open":i===0?"matched":"none",revision:1,result:isPast?{a:i===4?2:3,b:i===4?2:1,status:"confirmed",revision:1}:null};
 s.games.push(g);const z=newSide(g,"team-a");z.note="초록색 유니폼을 준비해주세요. 경기 시작 20분 전 집합합니다.";z.meeting="09:40";
 for(const m of s.members.filter(x=>x.teamId==="team-a"&&x.status==="active")){const n=Number(m.id.split("p")[1]);if(n!==0)z.votes[m.id]=[{value:n<10?"yes":n===10?"no":n===11?"maybe":"none",at:iso(when-2*864e5)}];}
 if(isPast){(z as any).roster=s.members.filter(x=>x.teamId==="team-a"&&x.status==="active").map(x=>({id:x.id,name:x.name,number:x.number,position:x.position}));z.attendance=Object.fromEntries((z as any).roster.map((m:any,j:number)=>[m.id,j<12]));z.attendanceFinal=true;z.records={"a-p0":{goals:1,assists:0},"a-p1":{goals:1,assists:1},...(i===4?{}:{"a-p2":{goals:1,assists:0}})};z.recordsFinal=true;}
 s.sides.push(z);if(g.away)s.sides.push(newSide(g,g.away));
 }
 const open={id:"game-other",home:"team-b",away:null,external:"",start:iso(next+864e5),end:iso(next+864e5+2*3600e3),venue:"강서 개화축구장",address:"서울 강서구 방화동 47",region:"서울",format:"11인제",secured:true,cost:80000,status:"scheduled",listing:"open",revision:1,result:null};s.games.push(open);s.sides.push(newSide(open,"team-b"));
 s.notices=[{id:"notice-1",teamId:"team-a",title:"이번 주 유니폼은 초록색입니다",body:"홈 유니폼(초록색)과 흰색 양말을 준비해주세요. 경기 시작 20분 전까지 모여주세요.",pinned:true,at:iso(next-4*864e5)},{id:"notice-2",teamId:"team-a",title:"9월 회비 납부 안내",body:"회비 납부 여부는 주장에게 확인해주세요.",pinned:false,at:iso(next-7*864e5)}];
 // 1.11.0 샘플: 팀 회칙, 지난 자체전(팀 나누기·기록·MVP 마감), 가장 최근 경기의 진행 중인 MVP 투표.
 s.teams[0].rules="[출석]\n- 참여 투표는 경기 전날 밤 10시까지 해주세요.\n- 늦으면 단톡방에 미리 알려주세요.\n\n[회비]\n- 월 회비 2만 원, 매월 5일까지\n\n[매너]\n- 거친 태클은 하지 않아요. 부상 방지가 먼저예요.";
 const active=s.members.filter(x=>x.teamId==="team-a"&&x.status==="active");
 const roster=active.map(x=>({id:x.id,name:x.name,number:x.number,position:x.position}));
 // 늘 이틀 전(요일에 따라 미래가 되지 않게 지금 기준으로 잡는다)
 const when=Math.floor((Date.now()-2*864e5)/3600e3)*3600e3;
 const ig:Row={id:"game-intra",home:"team-a",away:null,external:"",kind:"intra",squads:2,start:iso(when),end:iso(when+2*3600e3),venue:"난지천공원 인조잔디축구장",address:"서울 마포구 하늘공원로 108-2",region:"서울",format:"11인제",secured:true,cost:0,status:"completed",listing:"none",revision:1,at:iso(when-5*864e5)};
 const iz:Row=newSide(ig,"team-a");iz.roster=roster;iz.attendance=Object.fromEntries(roster.map((m,j)=>[m.id,j<12]));iz.attendanceFinal=true;
 iz.squads=Object.fromEntries(roster.slice(0,12).map((m,j)=>[m.id,j%2]));iz.records={"a-p1":{goals:2,assists:0},"a-p2":{goals:1,assists:1},"a-p3":{goals:0,assists:1},"a-p0":{goals:1,assists:0}};iz.squadExtra=[0,0];iz.recordsFinal=true;
 ig.result={status:"confirmed",squads:[1,3],by:"team-a",revision:1,at:iso(when+3*3600e3)};
 iz.mvp={openAt:iso(when+3*3600e3),closesAt:iso(when+51*3600e3),votes:{"a-p0":"a-p1","a-p2":"a-p1","a-p3":"a-p1","a-p4":"a-p2","a-p5":"a-p1"}};
 s.games.push(ig);s.sides.push(iz);
 const recent=s.sides.find(z=>z.gameId==="game-3");
 const hour=Math.floor(Date.now()/3600e3)*3600e3;
 if(recent)recent.mvp={openAt:iso(hour-3600e3),closesAt:iso(hour+47*3600e3),votes:{"a-p2":"a-p1","a-p3":"a-p4"}};
 // 전국 랭킹 샘플: 몇 명만 참여를 켜 둔다(샘플 주장 본인은 꺼 둬서 참여 안내가 보이게).
 for(const u of s.users)if(/^demo-a-[1-6]$/.test(String(u.id)))u.rankPublic=true;
 return s;
}
