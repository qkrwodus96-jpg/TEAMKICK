import {currentUser} from "@/lib/auth";
import {searchPlaces,checkQuery} from "@/lib/places";
import {AppError} from "@/lib/model";
export const dynamic="force-dynamic";
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:Request){
 try{
  const user=await currentUser(req);if(!user)throw new AppError("먼저 로그인해주세요.",401);
  const places=await searchPlaces(checkQuery(new URL(req.url).searchParams.get("q")));
  return json({places});
 }catch(e){
  if(!(e instanceof AppError))console.error("TeamKick places",e);
  return json({error:e instanceof AppError?e.message:"장소 검색에 실패했어요. 구장 이름과 주소를 직접 입력해주세요."},e instanceof AppError?e.status:503);
 }
}
