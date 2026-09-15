import {schemaStatus,BUILD} from "@/lib/schema";
import {storageReady} from "@/lib/images";
import {placeSearchReady} from "@/lib/places";
import {mailReady,mailAccount,fromDomain} from "@/lib/mail";
import {hashPassword} from "@/lib/auth";
import {kakaoReady,kakaoSecretSet} from "@/lib/kakao";
export const dynamic="force-dynamic";
// 배포·설정 상태를 눈으로 확인하기 위한 진단 경로. 개인정보와 키는 담지 않는다.
// 공개 전환 전에 없앨지 검토한다(LEGAL.md).
export async function GET(){
 const schema=await schemaStatus();
 // Workers 는 PBKDF2 반복에 상한이 있어 로컬에서만 통과하는 설정이 나올 수 있다.
 // 실제 런타임에서 해싱이 되는지 여기서 직접 확인한다. 결과 값은 버린다.
 let passwordHashing="ok";
 try{await hashPassword("teamkick-health-check")}catch(e){passwordHashing=String(e).slice(0,200)}
 return Response.json({
  build:BUILD,
  database:schema.db,
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
 },{headers:{"Cache-Control":"no-store"}});
}
