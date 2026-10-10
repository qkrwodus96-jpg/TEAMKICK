import {currentUser} from "@/lib/auth";
import {assertWritable} from "@/lib/migrate";
import {load} from "@/lib/store";
import {AppError,ensure,membership,teamOf,rankPhotoOpen} from "@/lib/model";
import {getImage,putImage,pruneOthers,parseKey,teamLogoPrefix,memberPhotoPrefix,teamPhotoPrefix,removeImage,MAX_BYTES} from "@/lib/images";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});
const failed=(e:unknown)=>{
 console.error("TeamKick image",e instanceof AppError?e.message:e);
 return json({error:e instanceof AppError?e.message:"이미지를 처리하지 못했어요. 다시 시도해주세요."},e instanceof AppError?e.status:503);
};

export async function POST(req:Request){
 try{
  await assertWritable();
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("허용되지 않은 요청이에요.",403);
  const form=await req.formData();
  const file=form.get("file");
  ensure(file&&typeof file!=="string","올릴 이미지를 선택해주세요.");
  const blob=file as File;
  ensure(blob.size<=MAX_BYTES,"이미지는 2MB 이하만 올릴 수 있어요.",413);
  const teamId=String(form.get("teamId")??""),memberId=String(form.get("memberId")??""),kind=String(form.get("kind")??"");
  const {state}=await load();
  const mine=membership(state,teamId,user.userId);
  ensure(teamOf(state,teamId)?.status==="active","현재 이용 가능한 팀이 아니에요.",403);
  ensure(mine,"이 팀에서 해당 작업을 할 권한이 없어요.",403);
  let prefix:string;
  if(kind==="teamLogo"){
   ensure(mine!.role==="captain","팀 로고는 주장만 바꿀 수 있어요.",403);
   prefix=teamLogoPrefix(teamId);
  }else if(kind==="memberPhoto"){
   const target=state.members.find(x=>x.id===memberId&&x.teamId===teamId);
   ensure(target,"팀원을 찾을 수 없어요.",404);
   ensure(target!.status==="active","활동 중인 팀원의 사진만 바꿀 수 있어요.");
   ensure(target!.id===mine!.id||mine!.role==="captain","본인 또는 주장만 선수 사진을 바꿀 수 있어요.",403);
   prefix=memberPhotoPrefix(teamId,memberId);
  }else if(kind==="teamPhoto"){
   // 팀 프로필 사진(인스타식 격자). 여러 장이라 예전 사진을 지우지 않는다. 운영진만.
   ensure(["captain","manager"].includes(mine!.role),"팀 사진은 주장·운영진만 올릴 수 있어요.",403);
   ensure((teamOf(state,teamId)?.photos??[]).length<30,"팀 사진은 30장까지 올릴 수 있어요.",409);
   prefix=teamPhotoPrefix(teamId);
  }else throw new AppError("지원하지 않는 이미지 종류예요.");
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const key=await putImage(prefix,blob.type,bytes);
  if(kind!=="teamPhoto")await pruneOthers(prefix,key);
  return json({ok:true,key});
 }catch(e){return failed(e)}
}

export async function GET(req:Request){
 try{
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const key=new URL(req.url).searchParams.get("key")??"";
  ensure(key,"이미지 주소를 확인해주세요.");
  const where=parseKey(key);
  const {state}=await load();
  // 팀 로고·팀 사진은 로그인한 이용자에게 보이지만(팀 찾기·팀 프로필)(팀 찾기·매칭 목록에 쓰인다)
  // 선수 사진은 그 팀의 활동 팀원에게만 보여준다.
  // 1.23: 랭킹에서 프로필 공개를 켠 선수의 사진은 다른 팀 이용자도 볼 수 있다(rankPhotoOpen).
  if(where.kind==="memberPhoto")ensure(membership(state,where.teamId,user.userId)||rankPhotoOpen(state,where.teamId,where.memberId),"이 사진을 볼 권한이 없어요.",403);
  else ensure(teamOf(state,where.teamId),"팀을 찾을 수 없어요.",404);
  const image=await getImage(key);
  if(!image)return json({error:"이미지를 찾을 수 없어요."},404);
  // 이미지 주소는 올릴 때마다 새로 만들어지고, 같은 주소의 내용은 바뀌지 않는다.
  // 그래서 오래 보관해도 낡은 그림이 보일 일이 없다. 주소가 바뀌면 새로 받아온다.
  // 팀 로고는 로그인한 사람이면 누구나 볼 수 있으므로 길게 보관한다.
  // 선수 사진은 팀을 나가면 더 보이면 안 되므로 짧게만 보관한다(공용 캐시에는 넣지 않는다).
  const cache=where.kind!=="memberPhoto"?"private, max-age=604800, immutable":"private, max-age=300";
  return new Response(image.body,{headers:{
   "Content-Type":image.type,
   "Cache-Control":cache,
   "Content-Security-Policy":"default-src 'none'; sandbox",
   "X-Content-Type-Options":"nosniff",
  }});
 }catch(e){return failed(e)}
}

// 팀 사진 지우기. 팀 프로필에서 사진을 빼면(removeTeamPhoto) 저장소의 파일도 지운다.
// 아직 프로필에 걸려 있는 사진은 지우지 않는다 — 순서가 어긋나도 보이는 사진이 깨지지 않게.
export async function DELETE(req:Request){
 try{
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)throw new AppError("요청 출처를 확인할 수 없어요.",403);
  const key=new URL(req.url).searchParams.get("key")??"";
  const where=parseKey(key);ensure(where.kind==="teamPhoto","지울 수 없는 이미지예요.",400);
  const {state}=await load();
  const mine=membership(state,where.teamId,user.userId);
  ensure(mine&&["captain","manager"].includes(mine.role),"팀 사진은 주장·운영진만 지울 수 있어요.",403);
  ensure(!(teamOf(state,where.teamId)?.photos??[]).some((p:{key:string})=>p.key===key),"프로필에서 먼저 사진을 빼주세요.",409);
  await removeImage(key);
  return json({ok:true});
 }catch(e){return failed(e)}
}
