// 처리방침·약관을 따로 된 주소로 보여준다. 앱 스토어 심사와 카카오·구글·네이버
// 로그인 설정에서 "처리방침 주소"를 요구해서 만들었다. 글은 가입 화면과 같은 원문이다.
import {LegalText} from "./legal-text";
export function LegalPage({title,text}:{title:string;text:string}){
 return <main className="legal-page">
  {/* next/link 는 vinext 에서 이 서버 화면에 넣으면 hook 오류로 깨진다(2026-09-24 확인). 홈은 새로 여는 게 맞다. */}
  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
  <p><a className="text-link" href="/">← 팀킥으로</a></p>
  <h1>{title}</h1>
  <LegalText text={text}/>
 </main>;
}
