"use client";
import {useState,useEffect,useRef,type ChangeEvent,type FormEvent} from "react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "@/components/ui/alert-dialog";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Checkbox} from "@/components/ui/checkbox";
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from "@/components/ui/table";
import {toast} from "sonner";
import {Upload,Plus,Search,MapPin,CalendarDays,Clock,Users,ShieldCheck,Copy,ExternalLink,Settings,Check,CheckCircle2,X,ArrowLeft,LogOut,Download,Pin,LoaderCircle,Goal,Handshake,Bell} from "lucide-react";
import {Picker,Crest,imageUrl,Empty,GameBadge,GuestBadge,PlayerPhoto,Vote,koreanDate,time,localDay,inputTime,fromInput,opponent} from "./teamkick";
import {currentVote,guestStatusOf,REGIONS,FORMATS,LEVELS,DAYS,levelOf,type Row} from "@/lib/model";
import {TERMS,PRIVACY} from "@/lib/legal";
import {APP_VERSION} from "@/lib/version";
import {NotifyToggle} from "./notify";
export function AuthPanel({onDemo,mailReady=true,kakaoReady=false,googleReady=false,naverReady=false,resetToken=""}:{onDemo:()=>void;mailReady?:boolean;kakaoReady?:boolean;googleReady?:boolean;naverReady?:boolean;resetToken?:string}){
 const [mode,setMode]=useState(resetToken?"reset":"login"),[form,setForm]=useState<Record<string,string>>({email:"",password:"",password2:"",name:""});
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState("");
 const [token,setToken]=useState(resetToken);
 const signup=mode==="signup",forgot=mode==="forgot",reset=mode==="reset",[legal,setLegal]=useState("");
 const [sent,setSent]=useState(false);
 const field=(key:string)=>({value:form[key]??"",onChange:(e:ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,[key]:e.target.value}))});
 async function submit(e:FormEvent){
  e.preventDefault();
  // 서버로 보내기 전에 확인한다. 잘못 친 비밀번호로 가입하면 원인을 모른 채 로그인이 막힌다.
  if((signup||reset)&&form.password!==(form.password2??"")){setFailure("비밀번호가 서로 달라요. 확인란을 다시 입력해주세요.");return}
  setBusy(true);setFailure("");
  try{
   const action=signup?"signup":forgot?"forgot":reset?"reset":"login";
   const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,email:form.email,password:form.password,name:form.name,token,agree:form.agree==="y",adult:form.adult==="y"})});
   const out=await res.json().catch(()=>({})) as {error?:string};
   // 서버가 아니라 앞단에서 막히면 본문이 JSON 이 아닐 수 있다. 그때도 이유를 알려준다.
   if(!res.ok)throw new Error(out.error||(res.status===429
    ?"요청이 너무 잦아요. 잠시 후 다시 시도해주세요."
    :"처리하지 못했어요. 잠시 후 다시 시도해주세요. (응답 "+res.status+")"));
   if(forgot){setSent(true);setBusy(false);return}
   window.location.replace("/");
  }catch(err){setFailure(err instanceof Error?err.message:"처리하지 못했어요. 잠시 후 다시 시도해주세요.");setBusy(false)}
 }
 return <section className="onboarding panel">
  <h2 className="view-heading">{signup?"팀킥 회원가입":forgot?"비밀번호 찾기":reset?"새 비밀번호 정하기":"팀킥 로그인"}</h2>
  <p className="small muted" style={{marginBottom:20,lineHeight:1.7}}>{signup?"가입한 뒤 팀을 등록하거나 소속 팀에 가입을 신청할 수 있어요.":forgot?"가입한 이메일로 재설정 링크를 보내드려요.":reset?"새로 쓸 비밀번호를 정해주세요. 다른 기기에서는 모두 로그아웃돼요.":"가입한 이메일과 비밀번호로 로그인하세요."}</p>
  {failure&&<p className="error-bar" role="alert">{failure}</p>}
  {sent&&<p className="data-note" role="status" style={{lineHeight:1.8}}>가입된 주소라면 재설정 링크를 보냈어요. 받은 편지함을 확인해주세요. 링크는 1시간 동안 한 번만 쓸 수 있어요.</p>}
  {!forgot&&!reset&&(kakaoReady||googleReady||naverReady)&&<>
   {/* 세 단추가 서로 붙어 있어 한 덩어리로 보였다. 사이를 띄운다. */}
   <div className="social-login">
    {kakaoReady&&<a className="btn btn-kakao" href="/api/kakao">카카오로 시작하기</a>}
    {naverReady&&<a className="btn btn-naver" href="/api/naver">네이버로 시작하기</a>}
    {googleReady&&<a className="btn btn-google" href="/api/google">구글로 시작하기</a>}
   </div>
   <p className="data-note" style={{textAlign:"center",margin:"16px 0 18px"}}>또는 이메일로</p>
  </>}
  <form className="form-grid" onSubmit={submit}>
   {signup&&<label>이름<input type="text" required maxLength={30} autoComplete="name" {...field("name")}/></label>}
   {!reset&&<label>이메일<input type="email" required autoComplete="email" {...field("email")}/></label>}
   {!forgot&&<label>{reset?"새 비밀번호":"비밀번호"}<input type="password" required minLength={8} autoComplete={signup||reset?"new-password":"current-password"} {...field("password")}/></label>}
   {(signup||reset)&&<label>비밀번호 확인<input type="password" required minLength={8} autoComplete="new-password" {...field("password2")}/></label>}
   {(signup||reset)&&<p className="data-note">비밀번호는 8자 이상으로 정해주세요. 확인란에 같은 값을 한 번 더 입력해주세요.</p>}
   {signup&&<label className="row" style={{gap:9,fontWeight:400,fontSize:14,alignItems:"flex-start"}}>
    <input type="checkbox" required style={{width:"auto",marginTop:3}} checked={form.agree==="y"} onChange={e=>setForm(f=>({...f,agree:e.target.checked?"y":""}))}/>
    <span>(필수) <button type="button" className="text-link" style={{display:"inline"}} onClick={()=>setLegal("terms")}>이용약관</button>과 <button type="button" className="text-link" style={{display:"inline"}} onClick={()=>setLegal("privacy")}>개인정보 수집·이용</button>에 동의합니다.</span>
   </label>}
   {signup&&<label className="row" style={{gap:9,fontWeight:400,fontSize:14,alignItems:"flex-start"}}>
    <input type="checkbox" required style={{width:"auto",marginTop:3}} checked={form.adult==="y"} onChange={e=>setForm(f=>({...f,adult:e.target.checked?"y":""}))}/>
    <span>(필수) 만 14세 이상입니다.</span>
   </label>}
   <button type="submit" className="btn btn-green" disabled={busy}>{busy&&<LoaderCircle className="loader" size={16}/>} {signup?"가입하고 시작하기":forgot?"재설정 링크 받기":reset?"비밀번호 바꾸기":"로그인"}</button>
  </form>
  <div className="action-strip">
   {reset?<button className="btn" onClick={()=>{setToken("");setMode("login");setFailure("")}}>로그인으로 돌아가기</button>
    :<button className="btn" onClick={()=>{setMode(signup||forgot?"login":"signup");setFailure("");setSent(false)}}>{signup||forgot?"로그인으로 돌아가기":"처음이에요 · 회원가입"}</button>}
   {mode==="login"&&mailReady&&<button className="btn btn-ghost" onClick={()=>{setMode("forgot");setFailure("");setSent(false)}}>비밀번호를 잊으셨나요?</button>}
   <button className="btn btn-ghost" onClick={onDemo}>샘플 팀 둘러보기</button>
  </div>
  <p className="data-note" style={{marginTop:14}}>
   <button type="button" className="text-link" onClick={()=>setLegal("terms")}>이용약관</button>
   {" · "}
   <button type="button" className="text-link" onClick={()=>setLegal("privacy")}>개인정보처리방침</button>
  </p>
  <Dialog open={!!legal} onOpenChange={o=>!o&&setLegal("")}><DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl">
   <DialogHeader><DialogTitle>{legal==="terms"?"이용약관":"개인정보처리방침"}</DialogTitle>
   <DialogDescription>가입 전에 확인해주세요.</DialogDescription></DialogHeader>
   <p className="small" style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{legal==="terms"?TERMS:PRIVACY}</p>
  </DialogContent></Dialog>
 </section>;
}
// 올리기 전에 브라우저에서 줄여 저장 용량과 전송량을 아낀다.
async function shrink(file:File,max=512){
 try{
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  if(scale===1&&file.size<=400*1024)return file;
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext("2d");if(!ctx)return file;
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const type=file.type==="image/png"?"image/png":"image/jpeg";
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,type,0.85));
  return blob?new File([blob],file.name,{type}):file;
 }catch{return file}
}
// 올린 그림을 앱 안에서 키우고 옮겨 저장 범위를 맞춘다.
// 팀마다 로고 모양이 제각각이라 그냥 잘라 넣으면 귀퉁이가 날아간다.
// 동그란 테두리 안에 보이는 그대로가 저장된다.
const CROP_SIZE=512;       // 저장하는 크기(정사각)
const STAGE=240;           // 화면에서 보이는 크기. 저장할 때 비율만 환산한다.

export function ImageCropper({file,busy,onCancel,onDone}:{file:File;busy:boolean;onCancel:()=>void;onDone:(f:File)=>void}){
 // 그림을 다 읽은 뒤에 한 번에 담는다. 크기를 모른 채 그리면 한 번 튄다.
 const [loaded,setLoaded]=useState({url:"",w:0,h:0});
 const [zoom,setZoom]=useState(1);
 const [offset,setOffset]=useState({x:0,y:0});
 const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);

 useEffect(()=>{
  const u=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{setLoaded({url:u,w:img.naturalWidth,h:img.naturalHeight});setZoom(1);setOffset({x:0,y:0})};
  img.src=u;
  return ()=>URL.revokeObjectURL(u);
 },[file]);

 // 짧은 쪽을 테두리에 맞춘다. 이래야 어떻게 옮겨도 빈 곳이 생기지 않는다.
 const base=loaded.w&&loaded.h?STAGE/Math.min(loaded.w,loaded.h):1;
 const scale=base*zoom;
 // 그림이 테두리를 벗어나 빈 곳이 보이지 않도록 옮길 수 있는 범위를 제한한다.
 const limit=(length:number)=>Math.max(0,(length*scale-STAGE)/2);
 const clamp=(x:number,y:number)=>({
  x:Math.max(-limit(loaded.w),Math.min(limit(loaded.w),x)),
  y:Math.max(-limit(loaded.h),Math.min(limit(loaded.h),y)),
 });
 // 크기를 바꾸면 옮길 수 있는 범위도 바뀐다. 그릴 때마다 다시 가두면
 // 따로 손볼 필요가 없다(값을 고치는 useEffect 를 두지 않는다).
 const pos=clamp(offset.x,offset.y);

 function down(e:React.PointerEvent){
  if(busy)return;
  (e.target as Element).setPointerCapture?.(e.pointerId);
  drag.current={x:e.clientX,y:e.clientY,ox:pos.x,oy:pos.y};
 }
 function move(e:React.PointerEvent){
  const d=drag.current;if(!d)return;
  setOffset(clamp(d.ox+(e.clientX-d.x),d.oy+(e.clientY-d.y)));
 }
 const up=()=>{drag.current=null};

 async function save(){
  const canvas=document.createElement("canvas");
  canvas.width=CROP_SIZE;canvas.height=CROP_SIZE;
  const ctx=canvas.getContext("2d");
  if(!ctx){onDone(file);return}
  // 화면에서 보이던 그대로를 저장 크기로 환산한다.
  const factor=CROP_SIZE/STAGE;
  const w=loaded.w*scale*factor,h=loaded.h*scale*factor;
  const bitmap=await createImageBitmap(file);
  ctx.drawImage(bitmap,CROP_SIZE/2+pos.x*factor-w/2,CROP_SIZE/2+pos.y*factor-h/2,w,h);
  const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,"image/png"));
  onDone(blob?new File([blob],"logo.png",{type:"image/png"}):file);
 }

 return <div className="cropper">
  <div className="crop-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
   {loaded.url&&<img src={loaded.url} alt="" draggable={false}
     style={{width:loaded.w*scale,height:loaded.h*scale,
       transform:`translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`}}/>}
  </div>
  <label className="crop-zoom">크기
   <input type="range" min={1} max={3} step={0.01} value={zoom} disabled={busy}
     onChange={e=>setZoom(Number(e.target.value))} aria-label="이미지 크기"/>
  </label>
  <p className="data-note" style={{margin:0,textAlign:"center"}}>끌어서 위치를 옮기고, 막대로 크기를 맞추세요.<br/>동그라미 안에 보이는 그대로 저장돼요.</p>
  <div className="crop-actions">
   <button type="button" className="btn" onClick={onCancel} disabled={busy}>취소</button>
   <button type="button" className="btn btn-green" onClick={save} disabled={busy||!loaded.w}>
    {busy?<LoaderCircle className="loader" size={16}/>:null}{busy?" 올리는 중":"이 모습으로 저장"}
   </button>
  </div>
 </div>;
}

export function ImageField({title,current,kind,teamId,memberId,onSaved,disabled,ready=true}:{title:string;current?:string;kind:string;teamId:string;memberId?:string;onSaved:(key:string)=>Promise<unknown>|unknown;disabled?:boolean;ready?:boolean}){
 const [state,setState]=useState({busy:false,error:""});
 // 고른 그림을 바로 올리지 않는다. 먼저 크기·위치를 맞추게 한다.
 const [chosen,setChosen]=useState<File|null>(null);
 function pick(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value="";
  if(!file)return;
  setState({busy:false,error:""});
  setChosen(file);
 }
 async function upload(file:File){
  setState({busy:true,error:""});
  try{
   const small=await shrink(file);
   const body=new FormData();
   body.append("file",small,file.name);body.append("kind",kind);body.append("teamId",teamId);
   if(memberId)body.append("memberId",memberId);
   const res=await fetch("/api/image",{method:"POST",body});
   const out=await res.json().catch(()=>({})) as {key?:string;error?:string};
   if(!res.ok||!out.key)throw new Error(out.error||"이미지를 올리지 못했어요.");
   await onSaved(out.key);
   setState({busy:false,error:""});
   setChosen(null);
  }catch(err){setState({busy:false,error:err instanceof Error?err.message:"이미지를 올리지 못했어요."})}
 }
 if(!ready)return <div><label style={{marginBottom:8}}>{title}</label><p className="data-note">이미지 저장소가 아직 연결되지 않아 사진을 올릴 수 없어요. 관리자가 저장소를 연결하면 바로 쓸 수 있어요.</p></div>;
 if(chosen)return <div>
  <label style={{marginBottom:8}}>{title}</label>
  <ImageCropper file={chosen} busy={state.busy} onCancel={()=>{setChosen(null);setState({busy:false,error:""})}} onDone={upload}/>
  {state.error&&<p className="error-bar" role="alert" style={{marginTop:10}}>{state.error}</p>}
 </div>;
 return <div>
  <label style={{marginBottom:8}}>{title}</label>
  <div className="image-field">
   {current?<img className="preview" src={imageUrl(current)} alt={title}/>:<span className="preview">없음</span>}
   <label className="btn" style={{margin:0}}>{state.busy?<LoaderCircle className="loader" size={16}/>:<Upload size={16}/>}{state.busy?" 올리는 중":" 이미지 선택"}
    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled||state.busy} onChange={pick}/>
   </label>
   {current&&!state.busy&&<button type="button" className="btn" onClick={()=>onSaved("")}>삭제</button>}
  </div>
  <p className="data-note">PNG · JPG · WEBP, 2MB 이하. 고른 뒤 크기와 위치를 맞출 수 있어요.</p>
  {state.error&&<p className="error-bar" role="alert" style={{marginTop:10}}>{state.error}</p>}
 </div>;
}
type PickedPlace={venue?:string;name?:string;address:string;lotAddress?:string;category?:string;lat?:number|string;lng?:number|string};
// 운영 데이터를 파일로 내려받고 되돌린다. D1 이 사라지면 복구할 다른 수단이 없다.
export function BackupPanel(){
 const [file,setFile]=useState<File|null>(null),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false);
 async function restore(e:FormEvent){
  e.preventDefault();
  if(!file)return toast.error("백업 파일을 골라주세요.");
  setBusy(true);
  try{
   const text=await file.text();
   let parsed:unknown;
   try{parsed=JSON.parse(text)}catch{throw new Error("백업 파일을 읽지 못했어요. JSON 파일이 맞는지 확인해주세요.")}
   const res=await fetch("/api/backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm,file:parsed})});
   const out=await res.json().catch(()=>({})) as {error?:string;accounts?:number;exportedAt?:string};
   if(!res.ok)throw new Error(out.error||"복원하지 못했어요.");
   toast.success("복원했어요. 계정 "+(out.accounts??0)+"개를 되살렸어요. 화면을 새로고침해주세요.");
   setFile(null);setConfirm("");
  }catch(err){toast.error(err instanceof Error?err.message:"복원하지 못했어요.")}
  finally{setBusy(false)}
 }
 return <section className="panel" style={{marginTop:24}}>
  <h2 className="view-heading">데이터 백업</h2>
  <p className="data-note">팀·경기·투표·출석·기록을 파일 하나로 내려받아요. 정기적으로 받아 안전한 곳에 보관해주세요.</p>
  <p className="data-note">비밀번호와 로그인 정보는 담기지 않아요. 그래서 복원해도 각자 &quot;비밀번호 찾기&quot;로 다시 정해야 해요. 카카오로 가입한 분은 그대로 로그인돼요.</p>
  <div className="action-strip"><a className="btn" href="/api/backup"><Download size={16}/>백업 파일 내려받기</a></div>
  <form className="form-grid" style={{marginTop:24}} onSubmit={restore}>
   <h3>백업 파일로 복원</h3>
   <p className="data-note">지금 저장된 팀·경기·기록을 <strong>모두 파일 내용으로 바꿔요.</strong> 되돌릴 수 없으니 먼저 위에서 지금 상태를 내려받아 두세요.</p>
   <label>백업 파일<input type="file" accept="application/json,.json" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)}/></label>
   <label>확인 문구<input value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="복원합니다"/></label>
   <p className="data-note">위 칸에 <strong>복원합니다</strong> 를 그대로 입력해야 진행돼요.</p>
   <button type="submit" className="btn btn-danger" disabled={busy||!file}>{busy?<LoaderCircle className="loader" size={16}/>:null}백업 파일로 복원하기</button>
  </form>
 </section>;
}
export function VenuePicker({v,field,ready,demo=false}:{v:{games?:Row[]};field:(k:string,value:unknown)=>void;ready:boolean;demo?:boolean}){
 const [query,setQuery]=useState(""),[places,setPlaces]=useState<PickedPlace[]>([]),[picked,setPicked]=useState<PickedPlace|null>(null);
 const [state,setState]=useState({busy:false,error:"",searched:false});
 const recent:PickedPlace[]=[...new Map<string,PickedPlace>((v.games??[]).filter((g:Row)=>g.venue&&g.address)
  .sort((a:Row,b:Row)=>String(b.start).localeCompare(String(a.start)))
  .map((g:Row)=>[g.venue+"|"+g.address,{venue:g.venue,address:g.address,lat:g.lat,lng:g.lng}] as [string,PickedPlace])).values()].slice(0,4);
 async function search(){
  const q=query.trim();if(!q)return;
  setState({busy:true,error:"",searched:true});
  try{
   const res=await fetch("/api/places?q="+encodeURIComponent(q));
   const out=await res.json().catch(()=>({})) as {places?:PickedPlace[];error?:string};
   if(!res.ok)throw new Error(out.error||"장소 검색에 실패했어요.");
   setPlaces(out.places??[]);setState({busy:false,error:"",searched:true});
  }catch(err){setPlaces([]);setState({busy:false,error:err instanceof Error?err.message:"장소 검색에 실패했어요.",searched:true})}
 }
 function choose(p:PickedPlace){
  field("venue",p.venue??p.name??"");field("address",p.address);
  field("lat",p.lat??"");field("lng",p.lng??"");
  // 고르고 나면 후보 목록은 치운다. 남겨두면 무엇을 골랐는지 알기 어렵다.
  setPicked(p);setPlaces([]);setQuery("");setState({busy:false,error:"",searched:false});
 }
 return <div className="gap-grid" style={{gap:10}}>
  {demo?<p className="data-note">샘플에서는 구장 검색을 쓸 수 없어요. 구장 이름과 주소는 아래에 직접 입력해보세요.</p>:ready?<>
   <label>구장 검색
    <div className="row" style={{gap:8,marginTop:7}}>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="예: 수지체육공원 축구장"
      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();search()}}}/>
     <button type="button" className="btn" disabled={state.busy} onClick={search}>{state.busy?<LoaderCircle className="loader" size={16}/>:<Search size={16}/>}</button>
    </div>
   </label>
   {picked&&<p className="data-note" role="status">고른 구장: <strong>{picked.venue??picked.name}</strong> · {picked.address} <button type="button" className="text-link" onClick={()=>setPicked(null)}>다시 검색</button></p>}
   {state.error&&<p className="data-note">{state.error}</p>}
   {places.map((p,i)=><button type="button" key={i} className="notice" style={{textAlign:"left",width:"100%",border:0,background:"none",padding:"12px 0"}} onClick={()=>choose(p)}>
    <p><strong>{p.name}</strong>{p.category?<span className="badge" style={{marginLeft:8}}>{p.category}</span>:null}</p>
    <span>{p.address}{p.lotAddress&&p.lotAddress!==p.address?" · "+p.lotAddress:""}</span>
   </button>)}
   {state.searched&&!state.busy&&!state.error&&!places.length&&<p className="data-note">검색 결과가 없어요. 아래에 직접 입력해주세요.</p>}
  </>:<p className="data-note">장소 검색이 설정되지 않았어요. 구장 이름과 주소를 직접 입력해주세요.</p>}
  {!!recent.length&&<div><label style={{marginBottom:6}}>자주 쓰는 구장</label><div className="filter-bar" style={{marginBottom:0}}>{recent.map((r,i)=><button type="button" key={i} className="btn" onClick={()=>choose(r)}>{r.venue}</button>)}</div></div>}
 </div>;
}
export function Matching(p:any){
 const {v,busy,setModal,run,captain,manager}=p,[tab,setTab]=useState(v.teamId?"open":"guest");
 // 검색어는 치는 대로가 아니라 **검색 단추를 눌렀을 때** 반영한다(사용자 요청).
 // `draft` 는 입력칸에 보이는 글, `query` 는 실제로 적용된 글이다.
 const [draft,setDraft]=useState(""),[query,setQuery]=useState("");
 const [region,setRegion]=useState("all"),[format,setFormat]=useState("all"),[date,setDate]=useState("");
 // 예전에는 지역이 검색어 안에 섞여 있어 따로 고를 수 없었고, 주소는 아예 찾지 못했다.
 // (`서울 마포구 월드컵로` 로 등록한 구장을 "마포" 로 찾으면 아무것도 안 나왔다.)
 const hay=(g:Row)=>[g.region,g.venue,g.address,v.teams.find((t:Row)=>t.id===g.home)?.name].filter(Boolean).join(" ");
 const term=query.trim();
 const matches=(g:Row)=>(region==="all"||g.region===region)&&(format==="all"||g.format===format)
  &&(!date||localDay(g.start)===date)&&(!term||hay(g).includes(term));
 // 가까운 경기부터 보여준다. 예전에는 저장된 차례 그대로라 새 모집글이 아래에 묻혔다.
 const byDate=(a:Row,b:Row)=>String(a.start).localeCompare(String(b.start));
 const listings=v.listings.filter(matches).sort(byDate);
 const filtered=region!=="all"||format!=="all"||!!date||!!term;
 function resetFilters(){setDraft("");setQuery("");setRegion("all");setFormat("all");setDate("")}
 const searchBar=<div className="filter-bar search-bar">
  <form className="search-line" onSubmit={e=>{e.preventDefault();setQuery(draft)}}>
   <div className="search-input"><Search size={17} className="muted"/>
    <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="구장 · 주소 · 팀 이름" aria-label="구장, 주소 또는 팀 이름 검색" style={{border:0}}/>
   </div>
   <button type="submit" className="btn btn-green">검색</button>
  </form>
  <div className="search-line">
   <Picker value={region} onChange={setRegion} options={[{value:"all",label:"모든 지역"},...REGIONS]}/>
   <Picker value={format} onChange={setFormat} options={[{value:"all",label:"모든 경기 형식"},"11인제","8인제","6인제","5인제"]}/>
   <input aria-label="경기 날짜" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
  </div>
  {filtered&&<button type="button" className="text-link" onClick={resetFilters}>조건 지우기</button>}
 </div>;
 const mine=v.requests.filter((r:Row)=>r.teamId===v.teamId),received=v.requests.filter((r:Row)=>v.games.some((g:Row)=>g.id===r.gameId&&g.home===v.teamId));
 const teamGuests=(v.guests??[]).filter((x:Row)=>["pending","approved"].includes(x.status));
 const guestLabel:Record<string,string>={pending:"승인 대기",approved:"용병 확정",rejected:"거절됨",withdrawn:"철회됨",closed:"모집 마감",cancelled:"취소됨"};
 const status:any={pending:"수락 대기",accepted:"매칭 확정",rejected:"거절됨",withdrawn:"철회됨",closed:"모집 종료",changed:"조건 변경 · 재신청 필요"};
 return <><Tabs value={tab} onValueChange={setTab}><TabsList className="mb-5 flex-wrap h-auto"><TabsTrigger value="open">모집 중</TabsTrigger><TabsTrigger value="mine">내가 신청한 매칭</TabsTrigger>{captain&&<TabsTrigger value="received">받은 신청 {received.filter((r:Row)=>r.status==="pending").length||""}</TabsTrigger>}<TabsTrigger value="guest">용병 {teamGuests.filter((x:Row)=>x.status==="pending").length||""}</TabsTrigger><TabsTrigger value="confirmed">확정 매칭</TabsTrigger></TabsList></Tabs>
 {tab==="open"&&<>{searchBar}<div className="match-list-grid">{listings.map((g:Row)=>{const t=v.teams.find((t:Row)=>t.id===g.home),sent=mine.find((r:Row)=>r.gameId===g.id&&r.status==="pending");return <article key={g.id} className="panel listing"><div className="row between"><span className="badge badge-green">상대팀 모집 중</span><span className="small muted">{g.format} · {t?.level??"실력 협의"}</span></div><h3>{t?.name}</h3><span className="meta-pair"><CalendarDays/>{koreanDate(g.start)} {time(g.start)} – {time(g.end)}</span><span className="meta-pair"><MapPin/>{g.venue}</span><span className="meta-pair"><ShieldCheck/>{g.secured?"구장 확보 완료":"구장 협의 중"} · 비용 안내 {Number(g.cost).toLocaleString()}원</span><p className="data-note">{g.address}</p>{g.home===v.teamId?<button className="btn" onClick={()=>setModal({kind:"game",id:g.id})}>우리 팀 모집글 관리</button>:<button disabled={busy||!captain||!!sent} className="btn btn-green" onClick={()=>setModal({kind:"applyMatch",game:g})}>{sent?"신청 완료":captain?"매칭 신청하기":"주장만 신청할 수 있어요"}</button>}</article>})}</div>{!listings.length&&<section className="panel"><Empty title={filtered?"조건에 맞는 모집글이 없어요":"모집 중인 경기가 없어요"} description={filtered
  ? "위 조건을 지우면 모든 모집글을 볼 수 있어요."
  : v.listings.length?"":"경기를 만들 때 \u0027상대팀을 모집할게요\u0027 를 체크해야 이 목록에 올라와요. 이미 만든 경기는 일정에서 열어 모집을 열 수 있어요."}/>
  {filtered&&<button type="button" className="btn" style={{marginTop:14}} onClick={resetFilters}>조건 지우기</button>}</section>}</>}
 {(tab==="mine"||tab==="received")&&<section className="panel">{(tab==="mine"?mine:received).length?(tab==="mine"?mine:received).map((r:Row)=>{const g=[...v.games,...v.listings].find((g:Row)=>g.id===r.gameId);return <div className="notice" key={r.id}><div className="row between"><strong>{tab==="mine"?v.teams.find((t:Row)=>t.id===g?.home)?.name??"상대팀 경기":v.teams.find((t:Row)=>t.id===r.teamId)?.name}</strong><span className="badge">{status[r.status]??r.status}</span></div><p className="data-note">{g?koreanDate(g.start)+" · "+g.venue:"신청한 경기"}{r.message&&" · "+r.message}</p>{r.status==="pending"&&captain&&<div className="action-strip">{tab==="received"?<><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"acceptMatch",teamId:v.teamId,gameId:r.gameId,requestId:r.id})}>매칭 수락</button><button className="btn" disabled={busy} onClick={()=>run({type:"rejectMatch",teamId:v.teamId,gameId:r.gameId,requestId:r.id})}>거절</button></>:<button className="btn" disabled={busy} onClick={()=>run({type:"withdrawMatch",teamId:v.teamId,gameId:r.gameId,requestId:r.id})}>신청 철회</button>}</div>}</div>}):<Empty title={tab==="mine"?"신청한 매칭이 없어요":"받은 신청이 없어요"}/>}</section>}
 {tab==="guest"&&<>
 <div className="match-list-grid">{(v.guestListings??[]).map((z:Row)=><article key={z.id} className="panel listing"><div className="row between"><span className="badge badge-orange">용병 모집 중</span><span className="small muted">{z.format} · {z.approved}/{z.needed}명</span></div><h3>{z.teamName}</h3><span className="meta-pair"><CalendarDays/>{koreanDate(z.start)} {time(z.start)} – {time(z.end)}</span><span className="meta-pair"><MapPin/>{z.venue}</span><span className="meta-pair"><ShieldCheck/>{z.secured?"구장 확보 완료":"구장 협의 중"} · 비용 안내 {Number(z.cost).toLocaleString()}원</span><p className="data-note">{z.address}</p>{z.teamId===v.teamId?<button className="btn" onClick={()=>setModal({kind:"game",id:z.gameId})}>우리 팀 모집 관리</button>:<button className="btn btn-green" disabled={busy||!!z.applied} onClick={()=>setModal({kind:"applyGuest",listing:z})}>{z.applied==="approved"?"용병 확정":z.applied?"신청 완료":"용병 신청하기"}</button>}</article>)}</div>
 {!(v.guestListings??[]).length&&<section className="panel"><Empty title="모집 중인 용병 자리가 없어요" description="다른 팀이 용병을 모집하면 여기에 표시돼요."/></section>}
 {!!(v.myGuests??[]).length&&<section className="panel" style={{marginTop:18}}><h2 className="view-heading">내 용병 신청</h2>{v.myGuests.map((r:Row)=><div className="notice" key={r.id}><div className="row between"><strong>{r.teamName}</strong><span className={"badge "+(r.status==="approved"?"badge-green":r.status==="pending"?"badge-orange":"")}>{guestLabel[r.status]??r.status}</span></div><p className="data-note">{r.start?koreanDate(r.start)+" · "+r.venue:"경기 정보를 확인할 수 없어요"}</p>{r.status==="pending"&&<div className="action-strip"><button className="btn" disabled={busy} onClick={()=>run({type:"withdrawGuest",teamId:r.teamId,gameId:r.gameId,guestId:r.id})}>신청 철회</button></div>}</div>)}</section>}
 {manager&&!!teamGuests.length&&<section className="panel" style={{marginTop:18}}><h2 className="view-heading">우리 팀 용병 신청</h2>{teamGuests.map((x:Row)=>{const gm=v.games.find((y:Row)=>y.id===x.gameId);return <div className="attendance-item" key={x.id}><div><strong>{x.name}</strong><p className="data-note">{x.position} · 등번호 {x.number}{gm?" · "+koreanDate(gm.start)+" "+gm.venue:""}{x.message?" · "+x.message:""}</p></div><div className="row">{x.status==="pending"?<><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"approveGuest",teamId:v.teamId,gameId:x.gameId,guestId:x.id})}>승인</button><button className="btn" disabled={busy} onClick={()=>run({type:"rejectGuest",teamId:v.teamId,gameId:x.gameId,guestId:x.id})}>거절</button></>:<><span className="badge badge-green">용병 확정</span><button className="btn" disabled={busy} onClick={()=>run({type:"cancelGuest",teamId:v.teamId,gameId:x.gameId,guestId:x.id})}>취소</button></>}</div></div>})}</section>}
 </>}
 {tab==="confirmed"&&(()=>{
  // 모집 중 탭과 같은 카드 모양으로 맞춘다. 예전에는 일정 화면용 줄 컴포넌트를
  // 그대로 가져다 써서 같은 화면 안에서 생김새가 따로 놀았다.
  const done=v.games.filter((g:Row)=>g.away&&g.status!=="cancelled")
   .sort((a:Row,b:Row)=>String(a.start).localeCompare(String(b.start)));
  if(!done.length)return <section className="panel"><Empty title="확정된 매칭이 없어요" description="모집글에 신청하거나 받은 신청을 수락하면 여기에서 확인할 수 있어요."/></section>;
  return <div className="match-list-grid">{done.map((g:Row)=>{
   const us=v.teams.find((t:Row)=>t.id===v.teamId)?.name??"우리 팀",them=opponent(v,g)||"상대팀 미정";
   const score=g.result?.status==="confirmed"?(g.home===v.teamId?g.result.a+" : "+g.result.b:g.result.b+" : "+g.result.a):"";
   return <article key={g.id} className="panel listing">
    <div className="row between"><GameBadge g={g}/><span className="small muted">{g.format}</span></div>
    <h3>{us} <span className="muted" style={{fontWeight:400}}>vs</span> {them}</h3>
    <span className="meta-pair"><CalendarDays/>{koreanDate(g.start)} {time(g.start)} – {time(g.end)}</span>
    <span className="meta-pair"><MapPin/>{g.venue||"구장 미정"}</span>
    <span className="meta-pair"><ShieldCheck/>{g.secured?"구장 확보 완료":"구장 협의 중"}{Number(g.cost)>0?" · 비용 안내 "+Number(g.cost).toLocaleString()+"원":""}</span>
    {score&&<p className="data-note">최종 스코어 {score}</p>}
    <button className="btn" onClick={()=>setModal({kind:"game",id:g.id})}>경기 상세 보기</button>
   </article>})}</div>;
 })()}</>
}
// 팀 이름의 일부나 지역만 쳐도 찾히게 한다. "oz" 로 "FCOZ" 를 찾는 식이라
// 대소문자를 가리지 않는다. 이름을 정확히 몰라도 로고와 지역으로 알아볼 수 있어야 한다.
export const teamMatches=(t:Row,q:string)=>{
 const needle=String(q??"").trim().toLowerCase();
 if(!needle)return true;
 return (String(t.name??"")+" "+String(t.region??"")).toLowerCase().includes(needle);
};
export function Management(p:any){
 const {v,team,onboarding,admin,busy,setModal,run,captain}=p,[query,setQuery]=useState("");
 if(admin)return <>{v.isOwner?<><div className="stats-grid" style={{marginBottom:24}}>{[{label:"등록 팀",v:v.teams.length},{label:"승인 대기",v:v.teams.filter((t:Row)=>t.status==="pending").length},{label:"활성 팀",v:v.teams.filter((t:Row)=>t.status==="active").length}].map(x=><div className="stat-card" key={x.label}><div className="stat-label">{x.label}</div><div className="stat-value">{x.v}</div></div>)}</div><div className="admin-grid">{v.teams.map((t:Row)=><section className="panel" key={t.id}><div className="row between"><h3>{t.name}</h3><span className={"badge "+(t.status==="pending"?"badge-orange":t.status==="active"?"badge-green":"badge-red")}>{({pending:"승인 대기",active:"승인 완료",rejected:"반려",suspended:"이용 정지"} as any)[t.status]}</span></div><p className="data-note">{t.region} · 신청자 {t.applicantName}</p><p className="small muted" style={{marginTop:12}}>{t.description}</p>{t.reason&&<p className="data-note">사유: {t.reason}</p>}<div className="action-strip">{t.status==="pending"&&<><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"approveTeam",teamId:t.id})}>팀 승인</button><button className="btn" onClick={()=>setModal({kind:"reason",command:"rejectTeam",teamId:t.id,title:"팀 등록 반려"})}>반려</button></>}{t.status==="active"&&<button className="btn btn-danger" onClick={()=>setModal({kind:"reason",command:"suspendTeam",teamId:t.id,title:"팀 이용 정지"})}>이용 정지</button>}{t.status==="suspended"&&<button className="btn btn-green" disabled={busy} onClick={()=>run({type:"restoreTeam",teamId:t.id})}>이용 복구</button>}</div></section>)}</div>{!!(v.retired??[]).length&&<section className="panel" style={{marginTop:24}}>
  <h2 className="view-heading">탈퇴한 분의 기록</h2>
  <p className="data-note">탈퇴해도 과거 경기·출석·골 기록은 팀의 공동 기록으로 남고, 그때의 표시 이름도 함께 남아요.</p>
  <p className="data-note">본인이 이름을 지워달라고 요청하면 아래에서 가려주세요. 기록 자체는 그대로 남고 <strong>이름만</strong> 바뀌어요.</p>
  {(v.retired as Row[]).map((r:Row)=><div className="notice" key={r.userId}>
   <div className="row between">
    <strong>{r.hidden?"탈퇴한 선수":r.name}</strong>
    <span className="small muted">기록 {r.teams}건</span>
   </div>
   <div className="action-strip">{r.hidden
    ? <span className="badge">이름 가림 완료</span>
    : <button className="btn btn-danger" disabled={busy} onClick={()=>setModal({kind:"confirmAnon",userId:r.userId,name:r.name})}>이름 가리기</button>}</div>
  </div>)}
 </section>}<BackupPanel/><section className="panel" style={{marginTop:24}}><h2 className="view-heading">최근 운영 이력</h2>{v.audit.slice(0,12).map((a:Row)=><p className="data-note" key={a.id}>{localDay(a.at)} {time(a.at)} · {a.type} {a.reason?"· "+a.reason:""}</p>)}</section></>:<Empty title="서비스 운영자 권한이 필요해요"/>}</>;
 if(onboarding)return <section className="onboarding"><h1>함께 뛸 우리 팀을 연결하세요</h1><p>새 팀은 서비스 운영자가, 팀원 가입은 팀 주장이 승인합니다.</p><div className="two-col"><section className="panel"><ShieldCheck color="#168b53" size={27}/><h2 className="view-heading" style={{marginTop:18}}>새 팀 만들기</h2><p className="small muted" style={{lineHeight:1.7}}>팀 이름과 활동 지역을 등록하면 운영자가 신청을 확인해요.</p><button className="btn btn-green" style={{marginTop:20}} onClick={()=>setModal({kind:"createTeam"})}><Plus/>팀 등록 신청</button></section><section className="panel"><Users color="#168b53" size={27}/><h2 className="view-heading" style={{marginTop:18}}>기존 팀 가입하기</h2><p className="small muted" style={{lineHeight:1.7}}>아래에서 소속 팀을 찾고 가입을 신청하세요. 승인 후 일정이 보여요.</p></section></div>{v.ownTeams?.length>0&&<section className="panel" style={{marginTop:20}}><h3 className="view-heading">내 팀 등록 신청</h3>{v.ownTeams.map((t:Row)=><div className="notice" key={t.id}><div className="row between"><strong>{t.name}</strong><span className="badge">{({pending:"운영자 승인 대기",rejected:"반려",active:"승인 완료"} as any)[t.status]??t.status}</span></div>{t.reason&&<p className="data-note">{t.reason}</p>}</div>)}</section>}<section className="panel" style={{marginTop:20}}><div className="panel-title"><h2>가입할 팀 찾기</h2></div><input placeholder="팀 이름 일부나 지역 (예: oz, 경기 남부)" value={query} onChange={e=>setQuery(e.target.value)}/>{v.teams.filter((t:Row)=>t.status==="active"&&teamMatches(t,query)).map((t:Row)=>{const m=v.mine?.find((m:Row)=>m.teamId===t.id);return <div className="notice" key={t.id}><div className="row between" style={{gap:12}}><div className="row" style={{gap:12,minWidth:0}}><Crest name={t.name} color={t.color} logo={t.logo}/><div style={{minWidth:0}}><strong>{t.name}</strong><p className="data-note" style={{marginTop:4}}>{t.region} · {t.format} · {levelOf(t.level)}</p></div></div>{m?.status==="pending"?<button className="btn" disabled={busy} onClick={()=>run({type:"cancelJoin",teamId:t.id})}>승인 대기 · 신청 취소</button>:<button className="btn" onClick={()=>setModal({kind:"joinTeam",team:t})}>가입 신청</button>}</div></div>})}{!v.teams.some((t:Row)=>t.status==="active")&&<Empty title="아직 등록된 팀이 없어요"/>}</section>{(v.setupNeeded||v.ownerMissing)&&<p className="data-note">서비스를 처음 설정하는 운영자이신가요? <button className="text-link" onClick={()=>setModal({kind:"setup"})}>운영자 초기 설정</button></p>}{v.isOwner&&<button className="btn" style={{marginTop:18}} onClick={()=>p.setView("admin")}>서비스 관리 열기</button>}</section>;
 const pending=v.members.filter((m:Row)=>m.status==="pending"),active=v.members.filter((m:Row)=>m.status==="active"),me=active.find((m:Row)=>m.userId===v.user.id);
 return <div className="gap-grid"><section className="panel"><div className="row between"><div className="team-header"><Crest name={team?.name} color={team?.color} logo={team?.logo}/><div><h2>{team?.name}</h2><p>{team?.region} · {team?.format} · {levelOf(team?.level)} · {team?.days}</p></div></div>{captain&&<button className="icon-button" aria-label="팀 정보 수정" onClick={()=>setModal({kind:"editTeam"})}><Settings size={19}/></button>}</div><p className="small muted" style={{lineHeight:1.8,marginTop:20}}>{team?.description}</p><div className="action-strip">{captain&&<button className="btn btn-green" onClick={()=>setModal({kind:"invite"})}><Plus/>팀원 초대</button>}<button className="btn" onClick={()=>setModal({kind:"profile",member:me})}>내 선수 정보 수정</button><button className="btn" onClick={()=>setModal({kind:"createTeam"})}>다른 팀 등록 신청</button><button className="btn" onClick={()=>setModal({kind:"findTeam"})}>다른 팀 가입</button></div>{team?.transferTo===me?.id&&<button className="btn btn-green" style={{marginTop:16}} disabled={busy} onClick={()=>run({type:"acceptCaptain",teamId:v.teamId,memberId:me.id})}>주장 인계 수락</button>}</section>
 {captain&&pending.length>0&&<section className="panel"><h2 className="view-heading">가입 승인 대기 <span className="badge badge-orange">{pending.length}</span></h2>{pending.map((m:Row)=><div key={m.id} className="attendance-item"><div><strong>{m.name}</strong><p className="data-note">{m.position} · 희망 등번호 {m.number}</p></div><div className="row"><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"approveMember",teamId:v.teamId,memberId:m.id})}>승인</button><button className="btn" disabled={busy} onClick={()=>run({type:"rejectMember",teamId:v.teamId,memberId:m.id})}>거절</button></div></div>)}</section>}
 <section className="panel"><div className="panel-title"><h2>함께 뛰는 선수들 <span className="small muted">{active.length}명</span></h2></div><Table className="roster-table"><TableHeader><TableRow><TableHead>선수</TableHead><TableHead>등번호</TableHead><TableHead>포지션</TableHead><TableHead>역할</TableHead>{captain&&<TableHead>관리</TableHead>}</TableRow></TableHeader><TableBody>{active.map((m:Row)=><TableRow key={m.id}><TableCell><div className="row"><PlayerPhoto name={m.name} photo={m.photo}/><strong>{m.name}</strong></div></TableCell><TableCell>{m.number}</TableCell><TableCell>{m.position}</TableCell><TableCell><span className="badge">{m.role==="captain"?"주장":m.role==="manager"?"운영진":"팀원"}</span></TableCell>{captain&&<TableCell>{m.role!=="captain"&&<button className="text-link" onClick={()=>setModal({kind:"member",member:m})}>관리</button>}</TableCell>}</TableRow>)}</TableBody></Table></section>
 <section className="panel"><div className="panel-title"><h2>팀 공지</h2>{captain&&<button className="btn" onClick={()=>setModal({kind:"notice"})}><Plus/>공지 작성</button>}</div>{v.notices.map((n:Row)=><div className="notice" key={n.id} onClick={()=>setModal({kind:"noticeDetail",notice:n})}><p>{n.pinned&&<Pin className="pin"/>}{n.title}</p><span>{localDay(n.at)}</span></div>)}{!v.notices.length&&<p className="small muted">등록된 공지가 없어요.</p>}</section><MyHub {...p}/></div>
}

// 우리팀(MY) 화면 아래쪽. 팀을 넘어선 "내 것"들을 모아 둔다.
// 참고한 앱들처럼 내 기록 → 프로필 → 문의 → 공지 → 버전 순으로 내려간다.
export function MyHub({v,busy,setModal}:{v:Row;busy:boolean;setModal:(m:{kind:string;member?:Row})=>void}){
 const t=v.myTotals??{teams:0,played:0,attend:0,eligible:0,rate:null,goals:0,assists:0,points:0};
 const me=v.members?.find((m:Row)=>m.userId===v.user?.id&&m.status==="active");
 const open=(v.inquiries??[]).filter((x:Row)=>x.mine&&x.status==="open").length;
 return <>
  <section className="panel">
   <div className="panel-title"><h2>내 전체 기록</h2><span className="small muted">{t.teams}개 팀 합산</span></div>
   <div className="stats-grid">
    {[{label:"뛴 경기",value:t.played,unit:"경기"},
      {label:"출석률",value:t.rate??"—",unit:t.rate===null?"":"%"},
      {label:"골",value:t.goals,unit:"골"},
      {label:"도움",value:t.assists,unit:"도움"}].map(x=>
     <div className="stat-card" key={x.label}>
      <div className="stat-label">{x.label}</div>
      <div className="stat-value">{x.value}<small>{x.unit}</small></div>
     </div>)}
   </div>
   <p className="data-note">출석이 확정된 경기만 출석률에 들어가요. 기록이 확정되면 골·도움에 더해져요.</p>
  </section>

  <section className="panel">
   <h2 className="view-heading">내 정보</h2>
   <div className="notice">
    <div className="row between">
     <div><p><strong>프로필 관리</strong></p><span>사진과 이름, 등번호와 포지션을 바꿔요.</span></div>
     <button className="btn" disabled={busy||!me} onClick={()=>setModal({kind:"profile",member:me})}>{me?"관리":"팀 가입 후 가능"}</button>
    </div>
   </div>
   <NotifyToggle/>
   <div className="notice">
    <div className="row between">
     <div><p><strong>1:1 문의</strong>{open>0&&<span className="badge badge-orange" style={{marginLeft:8}}>답변 대기 {open}</span>}</p><span>운영자에게 직접 물어봐요.</span></div>
     <button className="btn" onClick={()=>setModal({kind:"support"})}>문의 내역</button>
    </div>
   </div>
   <div className="notice">
    <div className="row between">
     <div><p><strong>공지사항</strong></p><span>업데이트와 서비스 소식을 확인해요.</span></div>
     <button className="btn" onClick={()=>setModal({kind:"announcements"})}>{(v.announcements??[]).length}건</button>
    </div>
   </div>
   {v.isOwner&&<div className="action-strip"><button className="btn" disabled={busy} onClick={()=>setModal({kind:"writeAnnouncement"})}><Plus/>공지 올리기</button></div>}
   <p className="data-note" style={{textAlign:"center",marginTop:22}}>팀킥 v{APP_VERSION}</p>
  </section>
 </>;
}

export function AppDialogs(p:any){
 const {modal,setModal,v,team,demo,busy,action,run,manager,captain,setView}=p,[form,setForm]=useState<any>({}),[detailTab,setDetailTab]=useState("info"),[failure,setFailure]=useState(""),[confirm,setConfirm]=useState<any>(null),[install,setInstall]=useState<any>(null);
 const g=v.games?.find((g:Row)=>g.id===modal?.id),side=g?v.sides.find((s:Row)=>s.gameId===g.id):null;
 useEffect(()=>{const listener=(e:any)=>{e.preventDefault();setInstall(e)};window.addEventListener("beforeinstallprompt",listener);return()=>window.removeEventListener("beforeinstallprompt",listener)},[]);
 useEffect(()=>{setFailure("");if(!modal)return;setDetailTab("info");const game=v.games?.find((g:Row)=>g.id===modal.gameId),z=v.sides?.find((s:Row)=>s.gameId===modal.gameId);
  let f:any={};if(modal.kind==="createGame"){const d=new Date(Date.now()+7*864e5);const day=inputTime(d.toISOString()).slice(0,10);
  // 미리 채워둔 끝 시각도 "자동으로 정해진 값"으로 표시해 둔다. 그래야 시작을
  // 바꿨을 때 따라 움직인다. 사용자가 손대면 그 값을 지킨다.
  f={start:day+"T10:00",end:day+"T12:00",autoEnd:day+"T12:00",format:"11인제",secured:true,needed:11,cost:0,listing:modal.listing??false,external:"",region:team?.region??""};}
  if(modal.kind==="changeGame")f={...game,start:inputTime(game.start),end:inputTime(game.end)};
  if(modal.kind==="attendance")f={values:{...(z.attendanceFinal?z.attendance:z.draft)}};
  if(modal.kind==="records"){const values=Object.fromEntries((z.roster??[]).filter((m:Row)=>z.attendance[m.id]).map((m:Row)=>[m.id,z.records[m.id]??{goals:0,assists:0}]));const score=game.home===v.teamId?game.result?.a:game.result?.b;f={values,ownGoals:z.ownGoals??0,unknownGoals:z.unknownGoals??Math.max(0,(score??0)-Object.values(values).reduce((sum:number,x:any)=>sum+x.goals,0))};}
  if(modal.kind==="result")f={own:game?.home===v.teamId?game.result?.a:game?.result?.b,opponent:game?.home===v.teamId?game.result?.b:game?.result?.a};
  if(modal.kind==="profile"||modal.kind==="editMember")f={...modal.member};if(modal.kind==="joinTeam")f={name:v.user?.name==="팀원"?"":v.user?.name,position:"MF",number:0};
  if(modal.kind==="openGuests")f={needed:z?.guestNeeded||2};if(modal.kind==="applyGuest")f={name:v.user?.name==="팀원"?"":v.user?.name,position:"MF",number:0,message:""};if(modal.kind==="editTeam")f={...team};if(modal.kind==="sideSettings")f={...z,deadline:inputTime(z.deadline)};if(modal.kind==="createTeam")f={region:"",format:"11인제",days:"일요일 오전",level:"중급"};setForm(f);
 },[modal]);
 function field(k:string,value:any){setForm((f:any)=>({...f,[k]:value}))}
 // 시작을 정하면 끝을 2시간 뒤로 맞춰 준다. 대부분의 경기가 두 시간이라
 // 매번 두 번 고르게 할 이유가 없다. 사용자가 끝을 직접 바꾸면 그 값을 지킨다.
 const PLAY_HOURS=2;
 function startChanged(value:string){
  setForm((f:Row)=>{
   const next:Row={...f,start:value};
   if(!value)return next;
   const auto=!f.end||f.end===f.autoEnd;   // 손대지 않은 끝 시각만 따라 움직인다
   if(auto){
    const end=new Date(new Date(value+"+09:00").getTime()+PLAY_HOURS*3600e3);
    next.end=new Date(end.getTime()+9*3600e3).toISOString().slice(0,16);
    next.autoEnd=next.end;
   }
   return next;
  });
 }
 // 날짜만 보면 무슨 요일인지 알기 어렵다. 골라둔 값을 사람이 읽는 말로 보여준다.
 // `alone` 은 끝 시각이 없는 값(투표 마감처럼 한 시점)에 쓴다. 그때는
 // "종료 시각을 정해주세요" 를 붙이지 않는다.
 // 알림을 누르면 그 소식이 있는 화면으로 옮겨 준다. 어느 화면인지는 서버가 알림에
 // 함께 적어 준다(`to`). 예전 알림에는 그 값이 없으므로 경기 여부로 되짚는다.
 const VIEW_LABEL:Record<string,string>={home:"홈",schedule:"일정",matching:"매칭",records:"기록",team:"MY",admin:"서비스 관리"};
 const viewOf=(n:Row)=>String(n.to||(n.gameId?"schedule":"home"));
 const viewLabel=(n:Row)=>VIEW_LABEL[viewOf(n)]??"홈";
 function openNotification(n:Row){
  const to=viewOf(n);
  setView(to);
  // 서버가 적어 준 화면이 먼저다. 매칭 신청처럼 경기가 딸려 있어도 갈 곳은 매칭이다.
  // 일정으로 가는 알림일 때만 그 경기 창까지 바로 열어 준다.
  if(to==="schedule"&&n.gameId&&v.games.some((g:Row)=>g.id===n.gameId))setModal({kind:"game",id:n.gameId});
  else setModal(null);
 }
 function whenNote(start?:string,end?:string,alone=false){
  if(!start)return null;
  let text="";
  try{text=koreanDate(fromInput(start))+" "+time(fromInput(start))+(end?" – "+time(fromInput(end)):"")}
  catch{return null}
  return <p className="data-note" role="status">{text}{end||alone?"":" · 종료 시각을 정해주세요."}</p>;
 }
 async function save(c:any,after?:(o:any)=>void){setFailure("");try{const output=await action(c);if(after)after(output);else setModal(null)}catch(e:any){setFailure(e.message)}}
 function copy(value:string){navigator.clipboard.writeText(value).then(()=>toast.success("복사했어요.")).catch(()=>toast.error("복사할 수 없어요. 내용을 직접 선택해 복사해주세요."))}
 const label=(name:string,key:string,type="text",required=true)=><label>{name}<input type={type} required={required} value={form[key]??""} onChange={e=>field(key,type==="number"?e.target.value===""?"":Number(e.target.value):e.target.value)} min={type==="number"?0:undefined}/></label>;
 const submit=(name="저장하기")=><button type="submit" className="btn btn-green" disabled={busy}>{busy&&<LoaderCircle className="loader" size={16}/>} {name}</button>;
 const closed=()=>setModal(null),titles:any={setOpponent:"외부 상대팀 입력",findTeam:"가입할 팀 찾기",createGame:"새 경기 만들기",createTeam:"팀 등록 신청",joinTeam:"팀 가입 신청",profile:"내 선수 정보",editMember:"선수 정보 수정",editTeam:"팀 정보 수정",attendance:"실제 출석 확인",records:"골 · 어시스트 기록",result:"경기 결과 입력",changeGame:"경기 일정 변경",sideSettings:"우리 팀 경기 설정",notice:"팀 공지 작성",invite:"팀원 초대",openGuests:"용병 모집",applyGuest:"용병 신청",applyMatch:"팀 매칭 신청",notifications:"알림",settings:"내 계정과 설정",setup:"운영자 초기 설정",reason:modal?.title,confirmAnon:"이름 가리기",support:"1:1 문의",announcements:"공지사항",writeAnnouncement:"공지 올리기",member:"팀원 관리",player:"선수 기록",noticeDetail:modal?.notice?.title,correct:"기록 정정 요청"};
 // 모달마다 부제가 하나뿐이라 알림함·공지·문의에도 "우리 팀의 정보를 확인하고
 // 관리하세요."가 그대로 붙어 있었다. 팀 정보와 상관없는 창만 제 설명을 갖는다.
 const subtitles:Record<string,string>={notifications:"읽지 않은 소식부터 최근 순으로 보여드려요.",
  noticeDetail:"팀원 모두에게 보이는 공지예요.",notice:"팀원 모두에게 보이는 공지를 올려요.",
  announcements:"팀킥 운영자가 올린 공지사항이에요.",writeAnnouncement:"모든 이용자에게 보이는 공지를 올려요.",
  support:"운영자에게 직접 문의하고 답변을 확인해요.",settings:"내 계정 정보와 알림·탈퇴를 관리해요.",
  findTeam:"가입하고 싶은 팀을 찾아 신청해요.",createTeam:"운영자 승인을 받으면 팀 공간이 열려요.",
  invite:"링크를 받은 사람이 우리 팀에 가입을 신청할 수 있어요.",
  applyGuest:"이 경기에 용병으로 함께 뛰길 신청해요.",openGuests:"이 경기에 필요한 용병 인원을 모집해요."};

 return <><Dialog open={!!modal} onOpenChange={o=>!o&&closed()}><DialogContent className={modal?.kind==="game"||modal?.kind==="records"?"sm:max-w-[720px] max-h-[90vh] overflow-y-auto rounded-2xl":"sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl"}><DialogHeader><DialogTitle>{modal?.kind==="game"?"경기 상세":titles[modal?.kind]??"팀킥"}</DialogTitle><DialogDescription>{modal?.kind==="game"&&g?koreanDate(g.start)+" · "+time(g.start):modal?.kind==="setup"?"전달받은 초기 설정 코드로 서비스 운영자를 등록합니다.":demo?"샘플 팀 공간입니다. 실제 데이터에는 반영되지 않습니다.":subtitles[modal?.kind]??"우리 팀의 정보를 확인하고 관리하세요."}</DialogDescription></DialogHeader>
 {failure&&<p className="error-bar" role="alert">{failure}</p>}
 {modal?.kind==="game"&&g&&<><div className="detail-score"><div className="club"><Crest name={team?.name} logo={team?.logo}/><strong>{team?.name}</strong></div><div style={{textAlign:"center"}}><GameBadge g={g}/><div className="score-big" style={{marginTop:12}}>{g.result?.status==="confirmed"?(g.home===v.teamId?g.result.a:g.result.b)+" : "+(g.home===v.teamId?g.result.b:g.result.a):"VS"}</div></div><div className="club"><Crest name={opponent(v,g)} color="orange" logo={v.teams.find((t:Row)=>t.id===(g.home===v.teamId?g.away:g.home))?.logo}/><strong>{opponent(v,g)||"상대팀 미정"}</strong></div></div><Tabs value={detailTab} onValueChange={setDetailTab}><TabsList className="mb-4"><TabsTrigger value="info">경기 정보</TabsTrigger><TabsTrigger value="attendance">참여 현황</TabsTrigger><TabsTrigger value="record">경기 기록</TabsTrigger></TabsList>
 <TabsContent value="info"><div className="detail-meta"><span className="meta-pair"><CalendarDays/>{koreanDate(g.start)} · {time(g.start)} – {time(g.end)}</span><span className="meta-pair"><MapPin/>{g.venue}</span><p className="small">{g.address}</p><div className="row"><button className="btn" onClick={()=>copy(g.address)}><Copy/>주소 복사</button><a className="btn" target="_blank" rel="noopener noreferrer" href={"https://map.naver.com/p/search/"+encodeURIComponent(g.address)}><ExternalLink/>지도 보기</a></div><p>{g.format} · {g.secured?"구장 확보 완료":"구장 협의 중"} · 비용 안내 {Number(g.cost).toLocaleString()}원</p>{g.external&&<p>상대팀 직접 입력 · 팀 자체 기록</p>}{side?.meeting&&<p>집합 시간 {side.meeting}</p>}{side?.note&&<p style={{whiteSpace:"pre-wrap"}}>{side.note}</p>}</div>
 {g.status==="scheduled"&&<div style={{marginTop:18}}><Vote v={v} g={g} disabled={busy||team?.status!=="active"} onVote={(value:string)=>run({type:"vote",teamId:v.teamId,gameId:g.id,value})}/></div>}
 {g.change&&<div className="panel" style={{marginTop:15}}><strong>일정 변경 제안</strong><p className="data-note">{koreanDate(g.change.start)} {time(g.change.start)} · {g.change.venue}</p>{captain&&g.change.by!==v.teamId&&<div className="action-strip"><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"confirmChange",teamId:v.teamId,gameId:g.id,proposalId:g.change.proposalId,agree:true})}>변경 수락 · 재투표</button><button className="btn" disabled={busy} onClick={()=>run({type:"confirmChange",teamId:v.teamId,gameId:g.id,proposalId:g.change.proposalId,agree:false})}>거절</button></div>}</div>}
 {manager&&g.status!=="cancelled"&&<div className="action-strip"><button className="btn" onClick={()=>setModal({kind:"sideSettings",gameId:g.id})}>팀 안내 수정</button>{captain&&!g.away&&!g.external&&g.listing!=="open"&&<button className="btn" onClick={()=>setModal({kind:"setOpponent",gameId:g.id})}>외부 상대팀 입력</button>}{captain&&g.status==="scheduled"&&Date.now()<Date.parse(g.start)&&<button className="btn" onClick={()=>setModal({kind:"changeGame",gameId:g.id})}>일정 변경{g.away?" 제안":""}</button>}{captain&&g.status==="scheduled"&&Date.now()>=Date.parse(g.end)&&<button className="btn btn-green" disabled={busy} onClick={()=>run({type:"completeGame",teamId:v.teamId,gameId:g.id})}>경기 완료 처리</button>}{captain&&!g.away&&!g.external&&g.status==="scheduled"&&<button className="btn" disabled={busy} onClick={()=>run({type:g.listing==="open"?"closeListing":"openListing",teamId:v.teamId,gameId:g.id})}>{g.listing==="open"?"모집 마감":"상대팀 모집"}</button>}{g.status==="scheduled"&&Date.now()<Date.parse(g.start)&&<button className="btn" disabled={busy} onClick={()=>guestStatusOf(side)==="open"?run({type:"closeGuests",teamId:v.teamId,gameId:g.id}):setModal({kind:"openGuests",gameId:g.id})}>{guestStatusOf(side)==="open"?"용병 모집 마감":"용병 모집"}</button>}{captain&&<button className="btn btn-danger" onClick={()=>setModal({kind:"reason",command:"cancelGame",teamId:v.teamId,gameId:g.id,title:"경기 취소"})}>경기 취소</button>}</div>}
 {guestStatusOf(side)!=="none"&&<div className="panel" style={{marginTop:15}}><div className="row between"><strong>용병 모집</strong><GuestBadge z={side}/></div><p className="data-note">승인 {(v.guests??[]).filter((x:Row)=>x.gameId===g.id&&x.status==="approved").length}명 / 모집 {side?.guestNeeded}명 · 승인 대기자는 인원에 포함되지 않아요.</p>{(v.guests??[]).filter((x:Row)=>x.gameId===g.id&&["pending","approved"].includes(x.status)).map((x:Row)=><div className="attendance-item" key={x.id}><div><strong>{x.name}</strong><p className="data-note">{x.position} · 등번호 {x.number}{x.message?" · "+x.message:""}</p></div><div className="row">{x.status==="approved"&&<span className="badge badge-green">확정</span>}{manager&&(x.status==="pending"?<><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"approveGuest",teamId:v.teamId,gameId:g.id,guestId:x.id})}>승인</button><button className="btn" disabled={busy} onClick={()=>run({type:"rejectGuest",teamId:v.teamId,gameId:g.id,guestId:x.id})}>거절</button></>:<button className="btn" disabled={busy} onClick={()=>run({type:"cancelGuest",teamId:v.teamId,gameId:g.id,guestId:x.id})}>취소</button>)}</div></div>)}{!(v.guests??[]).some((x:Row)=>x.gameId===g.id&&["pending","approved"].includes(x.status))&&<p className="small muted">아직 신청한 용병이 없어요.</p>}</div>}
 {g.status==="cancelled"&&<p className="data-note">취소 사유: {g.reason}</p>}</TabsContent>
 <TabsContent value="attendance"><div className="row" style={{flexWrap:"wrap",marginBottom:16}}>{[{key:"yes",label:"참여"},{key:"no",label:"미참여"},{key:"maybe",label:"미정"},{key:"none",label:"미응답"}].map(x=><span className="badge" key={x.key}>{x.label} {(side?.roster??[]).filter((m:Row)=>currentVote(side,m.id)===x.key).length+(x.key==="yes"?(side?.guestRoster??[]).length:0)}명</span>)}{!!(side?.guestRoster??[]).length&&<span className="badge badge-orange">용병 {(side?.guestRoster??[]).length}명</span>}</div>{(side?.roster??[]).map((m:Row)=><div className="attendance-item" key={m.id}><span>{m.name} <small className="muted">#{m.number}</small></span><span className="badge">{side.attendanceFinal?(side.attendance[m.id]?"출석 확정":"불참 확정"):({yes:"참여 예정",no:"미참여",maybe:"미정",none:"미응답"} as any)[currentVote(side,m.id)]}</span></div>)}
 {/* 용병은 투표를 하지 않는다. 승인된 순간 뛰는 것이 정해지므로 참여로 센다.
     팀원 명단과 섞지 않고 아래에 따로 적는다(출석·선수 통계에는 넣지 않는다). */}
 {(side?.guestRoster??[]).map((m:Row)=><div className="attendance-item" key={m.id}><span>{m.name} <small className="muted">#{m.number} · {m.position}</small></span><span className="badge badge-orange">용병 참여</span></div>)}<p className="data-note">투표는 참석 의사입니다. 경기 완료 후 실제 참석 여부를 확인하면 출석에 반영됩니다.</p>{manager&&g.status==="scheduled"&&<div className="action-strip"><button className="btn" disabled={busy||!(side?.roster??[]).some((m:Row)=>currentVote(side,m.id)==="none")} onClick={()=>save({type:"remindVote",teamId:v.teamId,gameId:g.id},(out:{notified?:number})=>{toast.success(out?.notified+"명에게 알림을 보냈어요.");setModal(null)})}>미응답자에게 알림 보내기</button></div>}{manager&&g.status==="scheduled"&&<p className="data-note">앱 알림함으로 전달돼요. 같은 경기는 6시간에 한 번 보낼 수 있어요.</p>}{manager&&g.status==="completed"&&<button className="btn btn-green" style={{marginTop:18}} onClick={()=>setModal({kind:"attendance",gameId:g.id})}>{side.attendanceFinal?"출석 수정":"출석 확인 · 확정"}</button>}</TabsContent>
 <TabsContent value="record"><p className="status-line">{g.result?.status==="confirmed"?"경기 결과 확정":g.resultProposal?.status==="disputed"?"결과에 이견이 있어요":g.resultProposal?"상대팀 확인 대기":"경기 결과 미입력"}</p>{g.resultProposal&&<section className="panel"><strong>제안된 결과 {g.resultProposal.a} : {g.resultProposal.b}</strong><p className="data-note">{v.teams.find((t:Row)=>t.id===g.home)?.name} : {v.teams.find((t:Row)=>t.id===g.away)?.name} 기준</p>{captain&&g.resultProposal.by!==v.teamId&&<div className="action-strip"><button className="btn btn-green" disabled={busy} onClick={()=>run({type:"confirmResult",teamId:v.teamId,gameId:g.id,revision:g.resultProposal.revision,agree:true})}>결과 확인</button><button className="btn" disabled={busy} onClick={()=>run({type:"confirmResult",teamId:v.teamId,gameId:g.id,revision:g.resultProposal.revision,agree:false})}>결과가 달라요</button></div>}</section>}
 <Table className="roster-table"><TableHeader><TableRow><TableHead>선수</TableHead><TableHead>골</TableHead><TableHead>어시스트</TableHead></TableRow></TableHeader><TableBody>{Object.entries(side?.records??{}).map(([mid,rec]:any)=><TableRow key={mid}><TableCell>{side.roster?.find((m:Row)=>m.id===mid)?.name??v.members.find((m:Row)=>m.id===mid)?.name??"과거 선수"}</TableCell><TableCell>{rec.goals}</TableCell><TableCell>{rec.assists}</TableCell></TableRow>)}</TableBody></Table><p className="data-note">{side?.recordsFinal?"개인 기록 확정":"개인 기록 미확정"} · 상대 자책골 {side?.ownGoals??0} · 득점자 미상 {side?.unknownGoals??0}</p><div className="action-strip">{captain&&g.status==="completed"&&<button className="btn" onClick={()=>setModal({kind:"result",gameId:g.id})}>경기 결과 입력</button>}{manager&&g.status==="completed"&&side?.attendanceFinal&&g.result?.status==="confirmed"&&<button className="btn btn-green" onClick={()=>setModal({kind:"records",gameId:g.id})}>골 · 어시스트 입력</button>}<button className="btn" onClick={()=>setModal({kind:"correct",gameId:g.id})}>기록 정정 요청</button></div></TabsContent></Tabs></>}
 {modal?.kind==="setOpponent"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"setOpponent",teamId:v.teamId,gameId:modal.gameId,external:form.external})}}>{label("상대팀 이름","external")}{submit("상대팀 저장")}</form>}
 {modal?.kind==="createGame"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({...form,type:"createGame",teamId:v.teamId,start:fromInput(form.start),end:fromInput(form.end),deadline:form.deadline?fromInput(form.deadline):""})}}><div className="two-col fields"><label>경기 시작<input type="datetime-local" required value={form.start??""} onChange={e=>startChanged(e.target.value)}/></label><label>경기 종료<input type="datetime-local" required value={form.end??""} onChange={e=>field("end",e.target.value)}/></label></div>{whenNote(form.start,form.end)}<VenuePicker v={v} field={field} ready={v.placeSearchReady!==false} demo={demo}/>{label("구장 이름","venue")}{label("구장 전체 주소","address")}<div className="two-col fields"><label>경기 형식<Picker value={form.format} onChange={(x:string)=>field("format",x)} options={["11인제","8인제","6인제","5인제"]}/></label>{label("필요 인원","needed","number")}</div>{label("투표 마감","deadline","datetime-local",false)}{whenNote(form.deadline,"",true)}<p className="data-note">비워두면 경기 시작 시각에 마감돼요. 경기 시작보다 늦게는 정할 수 없어요.</p><div className="two-col fields"><label>지역<Picker value={form.region} onChange={(x:string)=>field("region",x)} options={REGIONS}/></label>{label("비용 안내 (원)","cost","number")}</div><label className="row"><Checkbox checked={form.secured} onCheckedChange={x=>field("secured",x===true)}/>구장을 확보했어요</label>{captain&&<label className="row"><Checkbox checked={form.listing} onCheckedChange={x=>{field("listing",x===true);if(x)field("external","")}}/>상대팀을 모집할게요</label>}{!form.listing&&label("외부 상대팀 이름 (없으면 미정)","external","text",false)}<label>팀 안내<textarea value={form.note??""} onChange={e=>field("note",e.target.value)}/></label>{submit("경기 등록하기")}</form>}
 {modal?.kind==="editTeam"&&!demo&&<div style={{marginBottom:18}}><ImageField title="팀 로고" ready={v.storageReady!==false} current={team?.logo} kind="teamLogo" teamId={v.teamId} disabled={busy} onSaved={(key:string)=>action({type:"setTeamLogo",teamId:v.teamId,key})}/></div>}
 {(modal?.kind==="createTeam"||modal?.kind==="editTeam")&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({...form,type:modal.kind,teamId:v.teamId})}}>{label("팀 이름","name")}<label>활동 지역<Picker value={form.region} onChange={(x:string)=>field("region",x)} options={REGIONS}/></label><div className="two-col fields"><label>주 경기 형식<Picker value={form.format??"11인제"} onChange={(x:string)=>field("format",x)} options={FORMATS}/></label><label>팀 실력<Picker value={levelOf(form.level)} onChange={(x:string)=>field("level",x)} options={LEVELS}/></label></div><label>주로 뛰는 때<Picker value={DAYS.includes(form.days)?form.days:"상관없음"} onChange={(x:string)=>field("days",x)} options={DAYS}/></label><p className="data-note">상대팀을 찾을 때 보여요. 정해두지 않았으면 <strong>상관없음</strong> 을 고르세요.</p><label>팀 소개<textarea value={form.description??""} onChange={e=>field("description",e.target.value)}/></label>{submit(modal.kind==="createTeam"?"운영자에게 등록 신청":"팀 정보 저장")}</form>}
 {modal?.kind==="openGuests"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"openGuests",teamId:v.teamId,gameId:modal.gameId,needed:Number(form.needed)})}}>{label("모집 인원","needed","number")}<p className="data-note">승인 인원이 모집 인원에 도달하면 서버에서 자동으로 마감돼요. 승인 대기자는 인원에 포함되지 않아요.</p>{submit("용병 모집 시작")}</form>}
 {modal?.kind==="applyGuest"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"applyGuest",teamId:modal.listing.teamId,gameId:modal.listing.gameId,name:form.name,position:form.position,number:form.number,message:form.message})}}><strong>{modal.listing.teamName}</strong><p className="data-note">{koreanDate(modal.listing.start)} {time(modal.listing.start)} · {modal.listing.venue}</p><p className="data-note">용병에게는 경기 정보만 공개되고 팀 내부 정보는 보이지 않아요.</p>{label("이름","name")}<div className="two-col fields">{label("등번호","number","number")}<label>포지션<Picker value={form.position??"MF"} onChange={(x:string)=>field("position",x)} options={["GK","DF","MF","FW"]}/></label></div>{label("남길 말","message","text",false)}{submit("용병 신청")}</form>}
 {(modal?.kind==="profile"||modal?.kind==="editMember")&&!demo&&modal.member&&<div style={{marginBottom:18}}><ImageField title="선수 사진" ready={v.storageReady!==false} current={modal.member.photo} kind="memberPhoto" teamId={v.teamId} memberId={modal.member.id} disabled={busy} onSaved={(key:string)=>action({type:"setMemberPhoto",teamId:v.teamId,memberId:modal.member.id,key}).then(()=>setModal(null))}/></div>}
 {(modal?.kind==="joinTeam"||modal?.kind==="profile"||modal?.kind==="editMember")&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({...form,type:modal.kind==="profile"?"editProfile":modal.kind==="editMember"?"editMember":"joinTeam",teamId:modal.team?.id??v.teamId,memberId:modal.member?.id})}}>{modal.team&&<strong>{modal.team.name}</strong>}{label("선수 이름","name")}<div className="two-col fields">{label("등번호","number","number")}<label>포지션<Picker value={form.position??"MF"} onChange={(x:string)=>field("position",x)} options={["GK","DF","MF","FW"]}/></label></div>{submit(modal.kind==="joinTeam"?"주장에게 가입 신청":"저장하기")}</form>}
 {modal?.kind==="attendance"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"attendance",teamId:v.teamId,gameId:modal.gameId,values:form.values})}}><p className="small muted">참여 투표를 기준으로 초안을 채웠어요. 실제 참석자를 확인해주세요.</p>{Object.entries(form.values??{}).map(([mid,value]:any)=><div className="attendance-item" key={mid}><label><Checkbox checked={value} onCheckedChange={x=>field("values",{...form.values,[mid]:x===true})}/>{v.sides.find((s:Row)=>s.gameId===modal.gameId)?.roster?.find((m:Row)=>m.id===mid)?.name}</label><span className="badge">{value?"출석":"불참"}</span></div>)}{submit("실제 출석 확정")}</form>}
 {modal?.kind==="records"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"records",teamId:v.teamId,gameId:modal.gameId,...form})}}><p className="small muted">출석이 확정된 선수의 골·어시스트를 입력하세요.</p><Table className="roster-table"><TableHeader><TableRow><TableHead>선수</TableHead><TableHead>골</TableHead><TableHead>어시스트</TableHead></TableRow></TableHeader><TableBody>{Object.entries(form.values??{}).map(([mid,rec]:any)=><TableRow key={mid}><TableCell>{v.sides.find((s:Row)=>s.gameId===modal.gameId)?.roster?.find((m:Row)=>m.id===mid)?.name}</TableCell>{["goals","assists"].map(k=><TableCell key={k}><input aria-label={mid+" "+k} type="number" min="0" max="99" className="record-input" value={rec[k]} onChange={e=>field("values",{...form.values,[mid]:{...rec,[k]:Number(e.target.value)}})}/></TableCell>)}</TableRow>)}</TableBody></Table><div className="two-col fields">{label("상대 자책골","ownGoals","number")}{label("득점자 미상","unknownGoals","number")}</div>{submit("개인 기록 확정")}</form>}
 {modal?.kind==="result"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"result",teamId:v.teamId,gameId:modal.gameId,...form})}}><div className="two-col fields">{label("우리 팀 득점","own","number")}{label("상대팀 득점","opponent","number")}</div><p className="data-note">앱 내 매칭 경기는 상대 주장 확인 후 확정됩니다. 외부팀 경기는 우리 팀 자체 기록으로 확정됩니다.</p>{submit("결과 제출")}</form>}
 {modal?.kind==="changeGame"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"changeGame",teamId:v.teamId,gameId:modal.gameId,...form,start:fromInput(form.start),end:fromInput(form.end)})}}><div className="two-col fields"><label>변경 시작<input type="datetime-local" required value={form.start??""} onChange={e=>startChanged(e.target.value)}/></label><label>변경 종료<input type="datetime-local" required value={form.end??""} onChange={e=>field("end",e.target.value)}/></label></div>{whenNote(form.start,form.end)}<VenuePicker v={v} field={field} ready={v.placeSearchReady!==false} demo={demo}/>{label("구장 이름","venue")}{label("구장 주소","address")}{!form.away&&form.listing!=="open"&&label("외부 상대팀 이름","external","text",false)}{label("비용 안내","cost","number")}<p className="data-note">상대팀이 확정되었다면 상대 주장의 동의가 필요합니다. 변경 후 참여 여부를 다시 확인합니다.</p>{submit("일정 변경 제출")}</form>}
 {modal?.kind==="sideSettings"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"sideSettings",teamId:v.teamId,gameId:modal.gameId,note:form.note,meeting:form.meeting,needed:form.needed,...(form.deadline?{deadline:fromInput(form.deadline)}:{})})}}>{label("집합 시간·안내","meeting","text",false)}{label("필요 인원","needed","number")}{label("투표 마감","deadline","datetime-local")}{whenNote(form.deadline,"",true)}<p className="data-note">지금 이후, 경기 시작 시각까지로 정할 수 있어요.</p><label>우리 팀 안내<textarea value={form.note??""} onChange={e=>field("note",e.target.value)}/></label>{submit()}</form>}
 {modal?.kind==="notice"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"createNotice",teamId:v.teamId,...form})}}>{label("공지 제목","title")}<label>내용<textarea required value={form.body??""} onChange={e=>field("body",e.target.value)}/></label><label className="row"><Checkbox checked={form.pinned??false} onCheckedChange={x=>field("pinned",x===true)}/>상단에 고정하기</label><p className="data-note">올리면 팀원 모두의 알림함에 쌓이고, <strong>기기 알림을 켜 둔 팀원에게는 잠금화면 알림도 바로 갑니다.</strong> 따로 보내는 단추는 없어요.</p>{submit("공지 등록")}</form>}
 {modal?.kind==="noticeDetail"&&<><p style={{whiteSpace:"pre-wrap",lineHeight:1.85}}>{modal.notice.body}</p><p className="data-note">{localDay(modal.notice.at)}</p>
 {captain&&<div className="action-strip">
  {/* 올릴 때 한 번 나가는 알림을 못 본 사람이 있다. 주장이 같은 공지를 다시 보낸다. */}
  <button className="btn btn-green" disabled={busy||demo} onClick={()=>save({type:"notifyNotice",teamId:v.teamId,noticeId:modal.notice.id},(out:{notified?:number})=>{toast.success(out?.notified+"명에게 알림을 보냈어요.");setModal(null)})}><Bell size={16}/>알림 보내기</button>
  <button className="btn btn-danger" onClick={()=>setConfirm({title:"공지를 삭제할까요?",command:{type:"deleteNotice",teamId:v.teamId,noticeId:modal.notice.id}})}>공지 삭제</button>
 </div>}
 {captain&&<p className="data-note">팀원 알림함에 쌓이고, 기기 알림을 켜 둔 팀원에게는 잠금화면 알림도 갑니다. 같은 공지는 6시간에 한 번 보낼 수 있어요.</p>}</>}
 {modal?.kind==="applyMatch"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"applyMatch",teamId:v.teamId,gameId:modal.game.id,message:form.message})}}><strong>{koreanDate(modal.game.start)} {time(modal.game.start)}</strong><p className="small muted">{modal.game.venue} · 비용 안내 {Number(modal.game.cost).toLocaleString()}원</p><label>상대팀에 전달할 메시지<textarea value={form.message??""} onChange={e=>field("message",e.target.value)} placeholder="우리 팀 소개나 확인할 내용을 남겨주세요."/></label>{submit("이 조건으로 매칭 신청")}</form>}
 {modal?.kind==="support"&&<div className="gap-grid">
  <form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"askSupport",message:form.message},()=>setForm({}))}}>
   <label>문의 내용<textarea required maxLength={1000} value={form.message??""} onChange={e=>field("message",e.target.value)} placeholder="어떤 점이 불편하셨는지 적어주세요."/></label>
   <p className="data-note">운영자에게 바로 전달돼요. 답변이 등록되면 알림으로 알려드려요.</p>
   {submit("문의 보내기")}
  </form>
  {(v.inquiries??[]).map((x:Row)=><div className="notice" key={x.id}>
   <div className="row between">
    <strong>{x.mine?"내 문의":x.name}</strong>
    <span className={"badge "+(x.status==="open"?"badge-orange":"badge-green")}>{x.status==="open"?"답변 대기":"답변 완료"}</span>
   </div>
   <p>{x.message}</p><span>{localDay(x.at)}</span>
   {(x.replies??[]).map((r:Row,i:number)=><div key={i} className="detail-meta" style={{marginTop:10}}><strong>운영자 답변</strong><p>{r.message}</p><span className="small muted">{localDay(r.at)}</span></div>)}
   {v.isOwner&&<form className="form-grid" style={{marginTop:12}} onSubmit={e=>{e.preventDefault();save({type:"replySupport",inquiryId:x.id,message:form["r"+x.id]},()=>field("r"+x.id,""))}}>
    <label>답변<textarea required maxLength={1000} value={form["r"+x.id]??""} onChange={e=>field("r"+x.id,e.target.value)}/></label>
    <button className="btn btn-green" type="submit" disabled={busy}>답변 보내기</button>
   </form>}
  </div>)}
  {!(v.inquiries??[]).length&&<Empty title="문의 내역이 없어요"/>}
 </div>}
 {modal?.kind==="announcements"&&<div className="gap-grid">
  {(v.announcements??[]).map((n:Row)=><div className="notice" key={n.id}>
   <div className="row between"><strong>{n.title}</strong>{n.version&&<span className="badge">v{n.version}</span>}</div>
   <p style={{whiteSpace:"pre-wrap"}}>{n.body}</p><span>{localDay(n.at)}</span>
   {v.isOwner&&<div className="action-strip"><button className="btn btn-danger" disabled={busy} onClick={()=>action({type:"removeAnnouncement",noticeId:n.id})}>공지 삭제</button></div>}
  </div>)}
  {!(v.announcements??[]).length&&<Empty title="등록된 공지가 없어요"/>}
 </div>}
 {modal?.kind==="writeAnnouncement"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"postAnnouncement",title:form.title,body:form.body,version:form.version})}}>
  {label("제목","title")}
  {label("버전 (없으면 비워두세요)","version","text",false)}
  <label>내용<textarea required maxLength={2000} value={form.body??""} onChange={e=>field("body",e.target.value)}/></label>
  <p className="data-note">모든 사용자에게 보여요. 업데이트 내용을 적을 때 버전을 함께 남기면 찾기 쉬워요.</p>
  {submit("공지 올리기")}
 </form>}
 {modal?.kind==="confirmAnon"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"anonymizeMember",userId:modal.userId})}}>
  <p><strong>{modal.name}</strong> 님의 과거 기록에 남은 이름을 <strong>탈퇴한 선수</strong> 로 바꿀까요?</p>
  <p className="data-note">경기·출석·골 기록은 그대로 남아요. 이름과 사진만 지워집니다. <strong>되돌릴 수 없어요.</strong></p>
  {submit("이름 가리기")}
 </form>}
 {modal?.kind==="reason"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();setConfirm({title:modal.title+"을 진행할까요?",command:{type:modal.command,teamId:modal.teamId,gameId:modal.gameId,reason:form.reason}})}}><label>사유<textarea required value={form.reason??""} onChange={e=>field("reason",e.target.value)}/></label><button className="btn btn-danger" type="submit">확인</button></form>}
 {modal?.kind==="member"&&<><strong>{modal.member.name}</strong><p className="data-note">{modal.member.position} · 등번호 {modal.member.number}</p><div className="gap-grid"><button className="btn" onClick={()=>setModal({kind:"editMember",member:modal.member})}>선수 정보 수정</button><button className="btn" disabled={busy} onClick={()=>save({type:"setRole",teamId:v.teamId,memberId:modal.member.id,role:modal.member.role==="manager"?"member":"manager"})}>{modal.member.role==="manager"?"운영진 권한 해제":"일정·기록 운영진 지정"}</button><button className="btn" onClick={()=>setConfirm({title:"이 선수에게 주장을 인계할까요?",command:{type:"transferCaptain",teamId:v.teamId,memberId:modal.member.id}})}>주장 인계 요청</button><button className="btn btn-danger" onClick={()=>setConfirm({title:"이 팀원을 내보낼까요?",command:{type:"removeMember",teamId:v.teamId,memberId:modal.member.id}})}>팀원 내보내기</button></div></>}
 {modal?.kind==="findTeam"&&(()=>{
  // 팀 이름의 일부만 쳐도 찾히게 한다. "oz" 로 "FCOZ" 를 찾는 식이다.
  // 이름을 정확히 몰라도 로고와 지역을 보고 내 팀을 알아볼 수 있어야 한다.
  const q=String(form.q??"").trim();
  const joinable=v.teams.filter((t:Row)=>t.status==="active"&&!v.mine.some((m:Row)=>m.teamId===t.id&&m.status==="active"));
  const found=joinable.filter((t:Row)=>teamMatches(t,q));
  return <div className="gap-grid">
   <label>팀 찾기<input value={form.q??""} onChange={e=>field("q",e.target.value)} placeholder="팀 이름 일부나 지역 (예: oz, 경기 남부)"/></label>
   {found.map((t:Row)=>{
    const waiting=v.mine.some((m:Row)=>m.teamId===t.id&&m.status==="pending");
    return <div className="row between" key={t.id} style={{gap:12}}>
     <div className="row" style={{gap:12,minWidth:0}}>
      <Crest name={t.name} color={t.color} logo={t.logo}/>
      <div style={{minWidth:0}}>
       <strong>{t.name}</strong>
       <p className="data-note" style={{marginTop:4}}>{t.region} · {t.format} · {levelOf(t.level)}</p>
      </div>
     </div>
     <button className="btn" disabled={waiting} onClick={()=>setModal({kind:"joinTeam",team:t})}>{waiting?"승인 대기":"가입 신청"}</button>
    </div>})}
   {!found.length&&<Empty title={q?"찾는 팀이 없어요":"가입할 수 있는 팀이 없어요"} description={q?"이름 일부나 지역으로 다시 찾아보세요.":"운영자 승인이 끝난 팀만 보여요."}/>}
   <p className="data-note">가입할 수 있는 승인된 팀을 표시합니다. {joinable.length}개 중 {found.length}개.</p>
  </div>;
 })()}
 {modal?.kind==="invite"&&<><p className="small muted">초대받은 팀원은 로그인 후 주장의 가입 승인을 받아야 합니다. 링크는 7일간 유효합니다.</p>{form.link?<><input aria-label="초대 링크" readOnly value={form.link}/><button className="btn btn-green" onClick={()=>copy(form.link)}><Copy/>초대 링크 복사</button></>:<button className="btn btn-green" disabled={busy} onClick={()=>save({type:"invite",teamId:v.teamId},o=>field("link",window.location.origin+"/?invite="+encodeURIComponent(o.invite)))}>초대 링크 만들기</button>}{v.invites.filter((i:Row)=>i.active).map((i:Row)=><div className="row between" key={i.id}><span className="data-note">{localDay(i.expires)}까지 유효</span><button className="text-link" disabled={busy} onClick={()=>run({type:"revokeInvite",teamId:v.teamId,inviteId:i.id})}>링크 폐기</button></div>)}</>}
 {modal?.kind==="notifications"&&<>{v.notifications.length?[...v.notifications].reverse().map((n:Row)=><div className="notification-item notification-go" key={n.id}
   role="button" tabIndex={0} onClick={()=>openNotification(n)} onKeyDown={e=>e.key==="Enter"&&openNotification(n)}>
   <strong className="small">{n.title}</strong><p>{n.body}</p><small>{koreanDate(n.at)} {time(n.at)}</small>
   <span className="text-link" aria-hidden>{n.gameId&&v.games.some((g:Row)=>g.id===n.gameId)?"경기 보기":viewLabel(n)+" 보기"}</span></div>):<Empty title="새로운 알림이 없어요" description="팀 가입과 경기 변경 소식을 이곳에서 확인할 수 있어요."/>}</>}
 {modal?.kind==="player"&&<><div className="team-header"><PlayerPhoto name={modal.player.name} photo={modal.player.photo}/><div><h2>{modal.player.name}</h2><p>#{modal.player.number} · {modal.player.position}</p></div></div><div className="stats-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>{["goals","assists","attend"].map((k,i)=><div className="stat-card" key={k}><span className="stat-label">{["골","어시스트","출석"][i]}</span><div className="stat-value">{modal.player[k]}</div></div>)}</div><p className="data-note">위 숫자는 선택한 기간의 기록입니다. 아래는 전체 경기 이력입니다.</p>{v.sides.filter((s:Row)=>s.records[modal.player.id]||s.attendance[modal.player.id]).map((s:Row)=>{const g=v.games.find((g:Row)=>g.id===s.gameId);return g?<div className="notice" key={s.id}><p>{koreanDate(g.start)} · {opponent(v,g)}</p><span>{s.attendance[modal.player.id]?"출석":"불참"} · {s.records[modal.player.id]?.goals??0}골 · {s.records[modal.player.id]?.assists??0}어시스트</span></div>:null})}</>}
 {modal?.kind==="correct"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"correctRequest",teamId:v.teamId,gameId:modal.gameId,message:form.message})}}><label>정정할 내용<textarea required value={form.message??""} onChange={e=>field("message",e.target.value)}/></label>{submit("기록 담당자에게 요청")}</form>}
 {modal?.kind==="setup"&&<form className="form-grid" onSubmit={e=>{e.preventDefault();save({type:"setupOwner",code:form.code})}}>{label("운영자 초기 설정 코드","code","password")}<p className="data-note">첫 로그인 순서로 권한을 부여하지 않습니다. 코드는 최초 운영자 등록에 한 번 사용합니다.</p>{submit("서비스 운영자로 등록")}</form>}
 {modal?.kind==="settings"&&<div className="gap-grid"><div className="row"><span className="avatar">{v.user?.name?.slice(-2)||"MY"}</span><strong>{demo?"샘플 팀 공간":v.user?.name||"로그인이 필요해요"}</strong></div>{demo?<button className="btn btn-green" onClick={()=>{p.setDemo(false);setModal(null);p.setView("team")}}>실제 우리 팀 공간으로</button>:<button className="btn" onClick={()=>{p.setDemo(true);setModal(null);p.setView("home")}}>샘플 팀 둘러보기</button>}{v.isOwner&&<button className="btn" onClick={()=>{p.setView("admin");setModal(null)}}><ShieldCheck/>서비스 관리</button>}{p.real?.setupNeeded&&p.real?.user&&<button className="btn" onClick={()=>{p.setDemo(false);setModal({kind:"setup"})}}>운영자 초기 설정</button>}{install?<button className="btn" onClick={async()=>{await install.prompt();setInstall(null)}}><Download/>홈 화면에 설치</button>:<p className="data-note">휴대폰 브라우저의 공유·메뉴에서 ‘홈 화면에 추가’를 선택해 앱처럼 열 수 있어요.</p>}{!demo&&v.role&&v.role!=="captain"&&<button className="btn btn-danger" onClick={()=>setConfirm({title:"현재 팀에서 탈퇴할까요?",command:{type:"leaveTeam",teamId:v.teamId}})}>팀 탈퇴</button>}{!demo&&p.real?.user&&<button className="btn btn-danger" onClick={()=>setConfirm({title:"정말 탈퇴할까요? 계정과 로그인 정보가 삭제되고 되돌릴 수 없어요.",command:{type:"closeAccount"},reload:true})}>회원 탈퇴</button>}{p.real?.user?<button className="btn" disabled={busy} onClick={async()=>{await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"logout"})});window.location.reload()}}><LogOut/>로그아웃</button>:<button className="btn btn-green" onClick={()=>{p.setDemo(false);setModal(null)}}>로그인 · 회원가입</button>}<p className="data-note">팀킥 · 초기 팀 운영 버전<br/>앱 내 알림을 지원합니다. 휴대폰 푸시는 아직 연결되지 않았습니다.</p></div>}
 </DialogContent></Dialog>
 <AlertDialog open={!!confirm} onOpenChange={o=>!o&&setConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>팀 상태와 관련 기록에 반영됩니다. 내용을 확인한 후 진행해주세요.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>돌아가기</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={()=>{const c=confirm.command,reload=confirm.reload;setConfirm(null);save(c,reload?()=>window.location.reload():undefined)}}>확인</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>
}
