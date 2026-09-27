import {currentUser} from "@/lib/auth";
import {fetchNews} from "@/lib/news-server";
import {AppError} from "@/lib/model";
export const dynamic="force-dynamic";
// 로그인한 사람만 부를 수 있다(네이버 호출 한도를 남이 쓰지 못하게).
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":status===200?"private, max-age=300":"no-store"}});
export async function GET(req:Request){
 try{
  const user=await currentUser(req);if(!user)throw new AppError("로그인하면 축구 소식을 볼 수 있어요.",401);
  return json(await fetchNews(String(new URL(req.url).searchParams.get("topic")??"")));
 }catch(e){
  if(!(e instanceof AppError))console.error("TeamKick news",e);
  return json({error:e instanceof AppError?e.message:"지금은 소식을 불러올 수 없어요. 잠시 뒤 다시 시도해주세요."},e instanceof AppError?e.status:503);
 }
}
