import {env} from "cloudflare:workers";
import {AppError,ensure,id} from "./model";

// 팀 로고·선수 사진 파일 저장. 파일은 R2에 두고 앱 상태에는 키만 저장한다.
export const MAX_BYTES=2*1024*1024;
const TYPES:Record<string,{ext:string;magic:number[][]}>={
 "image/png":{ext:"png",magic:[[0x89,0x50,0x4e,0x47]]},
 "image/jpeg":{ext:"jpg",magic:[[0xff,0xd8,0xff]]},
 "image/webp":{ext:"webp",magic:[[0x52,0x49,0x46,0x46]]},
};

export const storageReady=()=>!!bucket();
function bucket(){return (env as unknown as {BUCKET?:R2Bucket}).BUCKET}
function need(){
 const value=bucket();
 ensure(value,"이미지 저장소가 아직 연결되지 않았어요. 관리자에게 문의해주세요.",503);
 return value!;
}

const startsWith=(bytes:Uint8Array,magic:number[])=>magic.every((b,i)=>bytes[i]===b);

// 선언한 종류를 믿지 않고 실제 바이트로 확인한다.
export function checkImage(type:string,bytes:Uint8Array){
 ensure(bytes.length>0,"파일이 비어 있어요.");
 ensure(bytes.length<=MAX_BYTES,"이미지는 2MB 이하만 올릴 수 있어요.");
 const spec=TYPES[type];
 ensure(spec,"PNG, JPG, WEBP 이미지만 올릴 수 있어요.");
 ensure(spec!.magic.some(magic=>startsWith(bytes,magic)),"이미지 파일이 아니거나 형식이 달라요.");
 return spec!.ext;
}

export const teamLogoPrefix=(teamId:string)=>"teams/"+teamId+"/";
export const memberPhotoPrefix=(teamId:string,memberId:string)=>"members/"+teamId+"/"+memberId+"/";

export async function putImage(prefix:string,type:string,bytes:Uint8Array){
 const ext=checkImage(type,bytes);
 const key=prefix+id()+"."+ext;
 await need().put(key,bytes,{httpMetadata:{contentType:type}});
 return key;
}

// 같은 자리의 이전 이미지는 지워 저장소에 버려진 파일이 쌓이지 않게 한다.
export async function pruneOthers(prefix:string,keep:string){
 const listed=await need().list({prefix});
 for(const object of listed.objects)if(object.key!==keep)await need().delete(object.key);
}

export async function getImage(key:string){
 const object=await need().get(key);
 if(!object)return null;
 return {body:object.body,type:object.httpMetadata?.contentType??"application/octet-stream"};
}

export async function removeImage(key:string){
 if(!key||!storageReady())return;
 try{await need().delete(key)}catch(e){console.error("TeamKick image delete",e)}
}

// 키에서 소속을 되읽어 접근 권한을 판단한다. 형식이 어긋나면 거부한다.
export function parseKey(key:string){
 ensure(/^[A-Za-z0-9/_.-]+$/.test(key)&&!key.includes(".."),"이미지 주소를 확인해주세요.",400);
 const parts=key.split("/");
 if(parts[0]==="teams"&&parts.length===3)return {kind:"teamLogo" as const,teamId:parts[1],memberId:""};
 if(parts[0]==="members"&&parts.length===4)return {kind:"memberPhoto" as const,teamId:parts[1],memberId:parts[2]};
 throw new AppError("이미지 주소를 확인해주세요.",400);
}
