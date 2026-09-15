import {env} from "cloudflare:workers";
import {AppError,ensure} from "./model";

// 구장 검색. 카카오 로컬 키워드 장소 검색을 서버에서 대신 호출한다.
// 키를 클라이언트로 내려보내지 않으려고 서버를 거친다.
const ENDPOINT="https://dapi.kakao.com/v2/local/search/keyword.json";
const key=()=>(env as unknown as {KAKAO_REST_KEY?:string}).KAKAO_REST_KEY??"";
export const placeSearchReady=()=>!!key();

type KakaoPlace={place_name?:string;address_name?:string;road_address_name?:string;x?:string;y?:string;category_name?:string};
export type Place={name:string;address:string;lotAddress:string;category:string;lat:number;lng:number};

export function checkQuery(v:unknown){
 const query=String(v??"").trim();
 ensure(query.length>0&&query.length<=50,"검색어를 1~50자로 입력해주세요.");
 return query;
}

export async function searchPlaces(query:string):Promise<Place[]>{
 ensure(key(),"장소 검색이 아직 설정되지 않았어요. 구장 이름과 주소를 직접 입력해주세요.",503);
 const res=await fetch(ENDPOINT+"?size=10&query="+encodeURIComponent(query),{headers:{Authorization:"KakaoAK "+key()}});
 if(!res.ok){
  console.error("TeamKick places",res.status);
  throw new AppError(res.status===401||res.status===403
   ?"장소 검색 설정을 확인해야 해요. 구장 이름과 주소를 직접 입력해주세요."
   :"장소 검색이 지금 응답하지 않아요. 구장 이름과 주소를 직접 입력해주세요.",503);
 }
 const body=await res.json() as {documents?:KakaoPlace[]};
 // 검색 결과에 없는 주소를 만들어내지 않는다. 받은 값만 정리해 내려준다.
 return (body.documents??[]).map(x=>({
  name:String(x.place_name??""),
  address:String(x.road_address_name||x.address_name||""),
  lotAddress:String(x.address_name??""),
  category:String(x.category_name??"").split(">").pop()?.trim()??"",
  lat:Number(x.y),lng:Number(x.x),
 })).filter(x=>x.name&&x.address&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
}
