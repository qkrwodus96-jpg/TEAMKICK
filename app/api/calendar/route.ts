import {currentUser} from "@/lib/auth";
import {load} from "@/lib/store";
import {canSeeGame,gameTitle} from "@/lib/model";
import {icsFor} from "@/lib/calendar";
export const dynamic="force-dynamic";
// 경기 하나를 .ics 파일로 내려준다. 그 경기 팀원·승인된 용병만 받을 수 있다.
export async function GET(req:Request){
 const text=(msg:string,status:number)=>new Response(msg,{status,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
 try{
  const user=await currentUser(req);if(!user)return text("로그인한 뒤 다시 눌러주세요.",401);
  const url=new URL(req.url);const {state}=await load();
  const g=canSeeGame(state,user.userId,String(url.searchParams.get("game")??""));
  if(!g)return text("이 경기를 볼 수 없어요.",404);
  const title="[팀킥] "+gameTitle(state,g);
  const body=icsFor({id:g.id,title,start:g.start,end:g.end,location:[g.venue,g.address].filter(Boolean).join(" "),
   description:[g.format,"참석 투표·경기 정보: "+url.origin].filter(Boolean).join("\n"),url:url.origin});
  const day=new Date(Date.parse(g.start)+9*3600e3).toISOString().slice(0,10).replace(/-/g,"");
  return new Response(body,{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":`attachment; filename="teamkick-${day}.ics"`,"Cache-Control":"no-store"}});
 }catch(e){console.error("TeamKick calendar",e);return text("캘린더 파일을 만들지 못했어요. 잠시 뒤 다시 시도해주세요.",503)}
}
