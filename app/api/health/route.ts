import {schemaStatus,BUILD} from "@/lib/schema";
import {APP_VERSION} from "@/lib/version";
import {storageReady} from "@/lib/images";
import {placeSearchReady,mapKeyName} from "@/lib/places";
import {mailReady,mailAccount,fromDomain} from "@/lib/mail";
import {hashPassword,currentUser} from "@/lib/auth";
import {kakaoReady,kakaoSecretSet} from "@/lib/kakao";
import {ownerCodeFromEnv} from "@/lib/owner-config";
import {pushReady} from "@/lib/push";
import {socialReady} from "@/lib/social";
import {newsSource} from "@/lib/news-server";
import {weatherReady} from "@/lib/weather-server";
import {load} from "@/lib/store";
import {cronReady} from "@/lib/cron";

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
 // 배포가 반영됐는지 확인하는 데 쓰므로 build·version 과 연결 여부는 누구에게나 준다.
 // 셋 다 비밀이 아니고(version 은 앱 화면 아래에도 적혀 있다), 이것까지 막으면
 // 배포 확인 수단이 사라진다.
 const open={build:BUILD,version:APP_VERSION,database:schema.db};
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
  // 1.21 매칭 지도: 카카오 JavaScript 키가 들어 있는지와 어느 이름으로 들어갔는지(값은 보여주지 않는다)
  mapReady:!!mapKeyName(),
  mapKeyName:mapKeyName()||null,
  kakaoReady:kakaoReady(),
  kakaoSecret:kakaoSecretSet()?"set":"missing",
  googleReady:socialReady("google"),
  naverReady:socialReady("naver"),
  ownerSetupCode:ownerCodeFromEnv()?"env":"built-in",
  pushReady:pushReady(),
  // 축구 소식: hub(NAVER API HUB 키) / developers(예전 개발자센터 키) / none
  newsSource:newsSource(),
  // 경기 날씨·미세먼지: 공공데이터포털 키(DATA_GO_KR_KEY)가 들어 있는지
  weatherReady:weatherReady(),
  // 예약 실행(/api/cron) 비밀값(CRON_SECRET, 16자 이상)이 들어 있는지
  cronReady:cronReady(),
 });
}
