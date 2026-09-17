import TeamKick from "./teamkick";
export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 return <TeamKick resetToken={typeof params.reset==="string"?params.reset:""} verifyToken={typeof params.verify==="string"?params.verify:""} kakaoNote={typeof params.kakao==="string"?params.kakao:typeof params.social==="string"?params.social:""}/>;
}
