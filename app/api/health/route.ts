import {schemaStatus,BUILD} from "@/lib/schema";
import {storageReady} from "@/lib/images";
import {placeSearchReady} from "@/lib/places";
import {mailReady} from "@/lib/mail";
export const dynamic="force-dynamic";
// 배포·설정 상태를 눈으로 확인하기 위한 진단 경로. 개인정보와 키는 담지 않는다.
// 공개 전환 전에 없앨지 검토한다(LEGAL.md).
export async function GET(){
 const schema=await schemaStatus();
 return Response.json({
  build:BUILD,
  database:schema.db,
  tables:schema.tables,
  setupError:schema.error||null,
  mailReady:mailReady(),
  storageReady:storageReady(),
  placeSearchReady:placeSearchReady(),
 },{headers:{"Cache-Control":"no-store"}});
}
