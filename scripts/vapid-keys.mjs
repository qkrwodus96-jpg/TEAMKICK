// 휴대폰 알림 키(VAPID) 한 쌍 만들기. lib/push.ts 가 읽는 형식:
// 공개키 = 비압축 점(0x04+X+Y, 65바이트), 개인키 = d(32바이트), 둘 다 base64url.
import {generateKeyPairSync} from "node:crypto";
export function makeVapidKeys(){
 const jwk=generateKeyPairSync("ec",{namedCurve:"prime256v1"}).privateKey.export({format:"jwk"});
 const pub=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,"base64url"),Buffer.from(jwk.y,"base64url")]);
 if(pub.length!==65||Buffer.from(jwk.d,"base64url").length!==32)throw new Error("키 길이가 맞지 않아요.");
 return {VAPID_PUBLIC_KEY:pub.toString("base64url"),VAPID_PRIVATE_KEY:jwk.d};
}
