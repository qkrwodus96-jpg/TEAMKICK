import type {Metadata} from "next";
import {DELETE_GUIDE} from "@/lib/legal";
import {LegalPage} from "../legal-page";

// 1.29 앱 밖에서도 계정 삭제 방법을 볼 수 있는 주소(Google Play 데이터 보안 양식에 적는 곳).
export const metadata:Metadata={title:"계정 삭제 안내 · 팀킥"};
export default function DeleteAccount(){
 return <LegalPage title="계정 삭제 안내" text={DELETE_GUIDE}>
  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
  <p><a className="btn btn-danger" href="/?to=modal:settings">팀킥 열고 탈퇴하기</a></p>
 </LegalPage>;
}
