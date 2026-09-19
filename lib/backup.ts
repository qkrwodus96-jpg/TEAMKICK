import {env} from "cloudflare:workers";
import {AppError,blank,collections,iso,type State} from "./model";
import {BUILD} from "./schema";
import {load,commit} from "./store";

// 운영 데이터를 파일 하나로 내보내고 되돌린다.
// ChatGPT Sites 프로젝트가 사라지거나 D1 연결이 바뀌면 복구할 방법이 없어서 둔다.
//
// 파일에 담지 않는 것: 비밀번호 해시, 세션 토큰, 비밀번호 재설정·이메일 확인 토큰,
// 접속 제한 기록. 백업 파일이 새어 나가도 남의 계정으로 로그인할 수 없어야 한다.
// 그래서 복원해도 비밀번호는 살아나지 않고, 각자 "비밀번호 찾기"로 다시 정해야 한다.
// 카카오로 가입한 계정은 원래 비밀번호가 없으므로 복원 즉시 그대로 로그인된다.
export const FORMAT=2;
export const CONFIRM="복원합니다";
// 이것들이 빠진 파일은 백업이 아니라고 본다.
const CORE:readonly string[]=["users","teams","members","games","sides","settings"];

type AccountRow={id:string;email:string;name:string;provider:string|null;provider_id?:string|null;kakao_id:string|null;verified_at:string|null;at:string};
export type Backup={format:number;build:string;exportedAt:string;version:number;counts:Record<string,number>;accounts:AccountRow[];data:Record<string,unknown[]>};

const ACCOUNT_COLUMNS="id,email,name,provider,provider_id,kakao_id,verified_at,at";
function db(){if(!env.DB)throw new AppError("데이터 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",503);return env.DB}

export const fileName=(at=iso())=>"teamkick-backup-"+at.slice(0,19).replace(/[:T]/g,"-")+".json";

export async function exportAll():Promise<Backup>{
 const {state,version}=await load();
 const accounts=((await db().prepare("SELECT "+ACCOUNT_COLUMNS+" FROM accounts").all<AccountRow>()).results??[]) as AccountRow[];
 const data:Record<string,unknown[]>={},counts:Record<string,number>={};
 for(const kind of collections){const rows=state[kind as keyof State] as unknown[];data[kind]=rows;counts[kind]=rows.length}
 counts.accounts=accounts.length;
 return {format:FORMAT,build:BUILD,exportedAt:iso(),version,accounts,counts,data};
}

// 파일을 그대로 믿지 않는다. 모양이 어긋나면 아무것도 쓰지 않고 멈춘다.
export function readBackup(input:unknown):Backup{
 const file=input as Partial<Backup>|null;
 if(!file||typeof file!=="object")throw new AppError("백업 파일을 읽지 못했어요.");
 if(file.format!==1&&file.format!==FORMAT)throw new AppError("이 백업 파일의 형식("+String(file.format)+")은 지원하지 않아요.");
 const data=file.data as Record<string,unknown>|undefined;
 if(!data||typeof data!=="object")throw new AppError("백업 파일에 데이터가 없어요.");
 const filled:Record<string,unknown[]>={};
 for(const kind of collections){
  const rows=data[kind];
  // 나중에 추가된 표는 옛 백업 파일에 없다. 그건 "비어 있었다"는 뜻이므로 받아준다.
  // 다만 서비스의 뼈대가 통째로 빠진 파일은 받지 않는다. 손상된 파일로 다 지우면 안 된다.
  if(rows===undefined){
   if(CORE.includes(kind))throw new AppError("백업 파일에서 "+kind+" 항목을 찾지 못했어요.");
   filled[kind]=[];continue;
  }
  if(!Array.isArray(rows))throw new AppError("백업 파일의 "+kind+" 항목이 손상되었어요.");
  for(const row of rows)if(!row||typeof row!=="object"||typeof (row as {id?:unknown}).id!=="string"||!(row as {id:string}).id)
   throw new AppError("백업 파일의 "+kind+" 항목이 손상되었어요.");
  filled[kind]=rows;
 }
 const accounts=Array.isArray(file.accounts)?file.accounts:[];
 for(const a of accounts)if(!a||typeof a!=="object"||typeof a.id!=="string"||typeof a.email!=="string"||typeof a.name!=="string")
  throw new AppError("백업 파일의 계정 정보가 손상되었어요.");
 const identities=new Set<string>();
 for(const a of accounts){
  const provider=a.provider??"local";
  if(!["local","kakao","google","naver"].includes(provider))throw new AppError("백업 파일의 로그인 수단이 올바르지 않아요.");
  if(provider==="local")continue;
  const subject=provider==="kakao"?a.kakao_id:a.provider_id;
  if(typeof subject!=="string"||!subject.trim()||subject!==subject.trim())
   throw new AppError("백업 파일에 소셜 계정 식별자가 없어요. 최신 버전에서 백업을 다시 받아주세요.");
  if(a.provider_id!=null&&(typeof a.provider_id!=="string"||!a.provider_id.trim()))
   throw new AppError("백업 파일의 소셜 계정 정보가 손상되었어요.");
  if(provider==="kakao"&&a.provider_id!=null&&a.provider_id!==subject)
   throw new AppError("백업 파일의 카카오 식별자가 서로 달라요.");
  const key=JSON.stringify([provider,subject]);
  if(identities.has(key))throw new AppError("백업 파일에 같은 소셜 계정이 중복되어 있어요.");
  identities.add(key);
 }
 return {...file,accounts,data:filled}as Backup;
}

export async function restoreAll(input:unknown){
 const file=readBackup(input);
 const {state,version}=await load();
 const after=blank();
 for(const kind of collections)(after[kind as keyof State] as unknown[]).push(...file.data[kind]);
 await commit(state,after,version);
 // 계정은 덮어쓰지 않는다. 지금 쓰고 있는 계정을 백업 시점으로 되돌리면
 // 그 사이에 바꾼 비밀번호와 이메일 확인이 사라진다.
 let restored=0;
 for(const a of file.accounts){
  const done=await db().prepare("INSERT OR IGNORE INTO accounts(id,email,name,password,provider,provider_id,kakao_id,verified_at,at) VALUES(?,?,?,'',?,?,?,?,?)")
   .bind(a.id,a.email,a.name,a.provider??"local",a.provider_id??(a.provider==="kakao"?a.kakao_id:null),a.kakao_id??null,a.verified_at??null,a.at??iso()).run();
  if(done.meta?.changes)restored++;
 }
 return {counts:file.counts??{},accounts:restored,exportedAt:file.exportedAt??""};
}
