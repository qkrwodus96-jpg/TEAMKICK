import {load,commit} from "./store";
import {applyCommand,prune,AppError} from "./model";
import {closeAccount,socialAccountOwner} from "./auth";
import {unlink,type UnlinkProvider} from "./unlink";

// 소셜 계정의 탈퇴. 순서가 중요하다:
// 1) 시작할 때 탈퇴할 수 있는지(주장·운영자 등) 먼저 본다 — 카카오까지 다녀온 뒤에 막히면 헛걸음이다.
// 2) 돌아오면 그 사업자 계정이 지금 로그인한 팀킥 계정과 같은 사람인지 본다.
// 3) 팀킥에서 먼저 지운다(법적 의무). 4) 그다음 사업자 쪽 연결을 끊는다 — 실패해도 탈퇴는 끝난 것이고,
//    직접 끊는 방법을 안내한다.
const LABEL:Record<UnlinkProvider,string>={kakao:"카카오",google:"구글",naver:"네이버"};
const SETTINGS:Record<UnlinkProvider,string>={
 kakao:"카카오계정 > 연결된 서비스 관리",google:"구글 계정 > 보안 > 서드 파티 앱 및 서비스",naver:"네이버 내정보 > 보안설정 > 외부 사이트 연결 정보"};

const conflict=(e:unknown)=>String(e).includes("revision_matches")||String(e).includes("CHECK constraint");

// 저장하지 않고 탈퇴 조건만 확인한다. 막히면 AppError 를 던진다.
export async function checkClosable(userId:string){
 const {state}=await load();
 applyCommand(structuredClone(state),{id:userId,name:""},{type:"closeAccount",mutationId:"check"});
}

// 팀킥 쪽 탈퇴(화면의 "회원 탈퇴" 와 같은 처리).
export async function closeEverywhere(userId:string,name:string){
 for(let attempt=0;attempt<4;attempt++){
  const {state,version}=await load();
  const after=structuredClone(state);
  applyCommand(after,{id:userId,name},{type:"closeAccount",mutationId:crypto.randomUUID()});
  prune(after);
  try{await commit(state,after,version)}
  catch(e){if(conflict(e)&&attempt<3)continue;throw e}
  await closeAccount(userId);
  return;
 }
}

export async function finishSocialClose(user:{userId:string;fullName?:string},provider:UnlinkProvider,subject:string,accessToken:string){
 const label=LABEL[provider];
 if(!await socialAccountOwner(user.userId,provider,subject))
  throw new AppError("팀킥에 가입한 "+label+" 계정과 다른 계정으로 로그인했어요. 가입한 계정으로 다시 해주세요. 탈퇴는 되지 않았어요.",403);
 await closeEverywhere(user.userId,user.fullName??"팀원");
 const done=await unlink(provider,accessToken).catch(e=>{console.error("TeamKick unlink "+provider,e instanceof Error?e.message:"error");return false});
 return done
  ?"탈퇴했어요. "+label+" 연결도 끊었어요."
  :"탈퇴했어요. "+label+" 연결은 끊지 못했어요. "+SETTINGS[provider]+"에서 직접 끊을 수 있어요.";
}
