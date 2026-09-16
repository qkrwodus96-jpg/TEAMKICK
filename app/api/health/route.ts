import {schemaStatus,BUILD} from "@/lib/schema";
import {storageReady} from "@/lib/images";
import {placeSearchReady} from "@/lib/places";
import {mailReady,mailAccount,fromDomain} from "@/lib/mail";
import {hashPassword,currentUser} from "@/lib/auth";
import {kakaoReady,kakaoSecretSet} from "@/lib/kakao";
import {ownerCodeFromEnv} from "@/lib/owner-config";
import {pushReady} from "@/lib/push";
import {load} from "@/lib/store";

export const dynamic="force-dynamic";
const no=(x:unknown)=>Response.json(x,{headers:{"Cache-Control":"no-store"}});

// 배포·설정 상태를 눈으로 확인하기 위한 진단 경로. 개인정보와 키는 담지 않는다.
//
// 자세한 내용은 서비스 운영자에게만 보여준다. 어떤 기능이 켜져 있고 어떤 표가
// 준비되었는지는 그 자체가 공격자에게 쓸모 있는 지도가 된다.
// 다만 운영자가 아직 없는 처음 설치 상태에서는 전부 보여준다. 그때는 감출 것이
// 없고, 운영자 등록에 필요한 정보를 볼 방법이 이것뿐이다.
async function ownerView(req:Request){
 try{
  const {state}=await load();
  const ownerId=state.settings.find(x=>x.id==="owner")?.userId;
  if(!ownerId)return true; // 아직 아무도 운영자가 아니다 — 설정 중
  const user=await currentUser(req);
  return !!user&&user.userId===ownerId;
 }catch{
  // 표가 아직 없으면 여기서 막지 않는다. 그 상태를 확인하려고 쓰는 경로다.
  return true;
 }
}

export async function GET(req:Request){
 const schema=await schemaStatus();
 // 배포가 반영됐는지 확인하는 데 쓰므로 build 와 연결 여부는 누구에게나 준다.
 // 둘 다 비밀이 아니고, 이것까지 막으면 배포 확인 수단이 사라진다.
 const open={build:BUILD,database:schema.db};
 if(!await ownerView(req))return no(open);

 // Workers 는 PBKDF2 반복에 상한이 있어 로컬에서만 통과하는 설정이 나올 수 있다.
 // 실제 런타임에서 해싱이 되는지 여기서 직접 확인한다. 결과 값은 버린다.
 let passwordHashing="ok";
 try{await hashPassword("teamkick-health-check")}catch(e){passwordHashing=String(e).slice(0,200)}
 return no({
  ...open,
  tables:schema.tables,
  setupError:schema.error||null,
  passwordHashing,
  mailReady:mailReady(),
  mailAccount:await mailAccount(),
  mailFromDomain:fromDomain(),
  storageReady:storageReady(),
  placeSearchReady:placeSearchReady(),
  kakaoReady:kakaoReady(),
  kakaoSecret:kakaoSecretSet()?"set":"missing",
  ownerSetupCode:ownerCodeFromEnv()?"env":"built-in",
  pushReady:pushReady(),
 });
}
