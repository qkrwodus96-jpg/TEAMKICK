import {handle,startSocialClose} from "@/lib/social-route";
export const dynamic="force-dynamic";
export const GET=(req:Request)=>handle(req,"naver");
export const POST=(req:Request)=>startSocialClose(req,"naver");
