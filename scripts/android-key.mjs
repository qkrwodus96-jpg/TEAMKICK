// 안드로이드 업로드 키를 처음 한 번 만든다 — GitHub Actions "Android upload key" 버튼이 부른다.
// 비밀번호는 GitHub 비밀값 ANDROID_KEY_PASSWORD 에만 있다(값은 어디에도 출력하지 않는다).
// 키 파일(android/upload-key.p12)은 그 비밀번호로 암호화된 PKCS12 라서 저장소(공개)에 올려도 비밀번호 없이는 쓸 수 없다.
// Play 앱 서명을 쓰므로 진짜 앱 서명 키는 Google 이 보관하고, 이 업로드 키를 잃거나 새면 Play Console 에서 재설정할 수 있다.
// 이미 키가 있으면 만들지 않는다(바꾸면 Play 에 올린 것과 맞지 않게 된다).
import {execFileSync} from "node:child_process";
import fs from "node:fs";

const FILE="android/upload-key.p12";
const pw=process.env.ANDROID_KEY_PASSWORD??"";
if(pw.length<24){console.error("GitHub 비밀값 ANDROID_KEY_PASSWORD 가 없거나 24자보다 짧아요.");process.exit(1)}
if(fs.existsSync(FILE)){console.error(FILE+" 가 이미 있어요. 새로 만들지 않아요.");process.exit(1)}
execFileSync("keytool",["-genkeypair","-alias","upload","-keyalg","RSA","-keysize","4096","-validity","25000",
 "-storetype","PKCS12","-keystore",FILE,"-storepass:env","ANDROID_KEY_PASSWORD","-keypass:env","ANDROID_KEY_PASSWORD",
 "-dname","CN=TEAMKICK, O=TEAMKICK, C=KR"],{stdio:["ignore","ignore","inherit"]});
const info=execFileSync("keytool",["-list","-v","-keystore",FILE,"-storetype","PKCS12","-storepass:env","ANDROID_KEY_PASSWORD"],{encoding:"utf8"});
const sha=(info.match(/SHA256:\s*([0-9A-F:]+)/)??[])[1];
console.log("업로드 키를 만들었어요. 인증서 SHA-256(공개 정보): "+sha);
