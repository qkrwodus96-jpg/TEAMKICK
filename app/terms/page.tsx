import type {Metadata} from "next";
import {TERMS} from "@/lib/legal";
import {LegalPage} from "../legal-page";

export const metadata:Metadata={title:"이용약관 · 팀킥"};
export default function Terms(){return <LegalPage title="이용약관" text={TERMS}/>}
