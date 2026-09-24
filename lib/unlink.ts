import {config} from "./social";

// 탈퇴할 때 카카오·구글·네이버 쪽 연결도 끊는다.
// 우리는 소셜 토큰을 저장하지 않는다(PROJECT_CONTEXT 4-4). 그래서 탈퇴할 때 그 사업자로
// 한 번 더 로그인해 새 토큰을 받고, 그 토큰으로 바로 끊는다. 관리자 키가 필요 없고,
// 탈퇴하는 사람이 정말 그 계정 주인인지도 함께 확인된다.
//
// 요청 모양(2026-09-24 확인, 공식 문서 직접 열람은 이 환경에서 막혀 검색 요약으로 확인):
// - 카카오: POST https://kapi.kakao.com/v1/user/unlink, Authorization: Bearer <토큰>
// - 구글: POST https://oauth2.googleapis.com/revoke, 본문 token=<토큰>
// - 네이버: https://nid.naver.com/oauth2.0/token?grant_type=delete&client_id&client_secret&access_token&service_provider=NAVER
//   실패해도 200 이 올 수 있어 본문의 result 가 "success" 인지 본다.
export type UnlinkProvider="kakao"|"google"|"naver";

export async function unlink(provider:UnlinkProvider,accessToken:string):Promise<boolean>{
 if(provider==="kakao"){
  const res=await fetch("https://kapi.kakao.com/v1/user/unlink",{method:"POST",headers:{Authorization:"Bearer "+accessToken}});
  if(!res.ok)console.error("TeamKick unlink kakao",res.status);
  return res.ok;
 }
 if(provider==="google"){
  const res=await fetch("https://oauth2.googleapis.com/revoke",{method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:accessToken}).toString()});
  if(!res.ok)console.error("TeamKick unlink google",res.status);
  return res.ok;
 }
 const c=config("naver");
 const params=new URLSearchParams({grant_type:"delete",client_id:c.id(),client_secret:c.secret(),access_token:accessToken,service_provider:"NAVER"});
 const res=await fetch("https://nid.naver.com/oauth2.0/token?"+params.toString(),{method:"POST"});
 const body=await res.json().catch(()=>({})) as {result?:string;error?:string};
 // 토큰이 담긴 주소는 남기지 않는다. 상태 번호와 오류 이름만.
 if(!res.ok||body.result!=="success")console.error("TeamKick unlink naver",res.status,body.error??"");
 return res.ok&&body.result==="success";
}
