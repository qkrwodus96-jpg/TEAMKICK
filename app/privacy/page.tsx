import type {Metadata} from "next";
import {PRIVACY} from "@/lib/legal";
import {LegalPage} from "../legal-page";

export const metadata:Metadata={title:"개인정보처리방침 · 팀킥"};
export default function Privacy(){return <LegalPage title="개인정보처리방침" text={PRIVACY}/>}
