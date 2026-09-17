import {handle} from "@/lib/social-route";
export const dynamic="force-dynamic";
export const GET=(req:Request)=>handle(req,"google");
