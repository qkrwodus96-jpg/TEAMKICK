"use client";
// 설정(1.17): 화면 모드(시스템·밝게·어둡게)와 알림 종류별 설정.
// 알림 설정은 계정에 저장되고(어느 기기에서나 같다), 끈 종류는 폰 알림만 막는다 — 앱 알림함에는 그대로 쌓인다.
import {useEffect,useState} from "react";
import {Moon,Sun,MonitorSmartphone,BellOff} from "lucide-react";
import {toast} from "sonner";
import {NOTIFY_KINDS,type Row} from "@/lib/model";
import {themeMode,setThemeMode,type ThemeMode} from "./theme";

export function ThemePicker(){
 const [mode,setMode]=useState<ThemeMode>("system");
 useEffect(()=>{setMode(themeMode())},[]);
 const pick=(m:ThemeMode)=>{setMode(m);setThemeMode(m)};
 const opts:[ThemeMode,string,typeof Sun][]=[["system","기기 설정",MonitorSmartphone],["light","밝게",Sun],["dark","어둡게",Moon]];
 return <div className="pref-block"><strong>화면 모드</strong>
  <div className="seg" role="radiogroup" aria-label="화면 모드">{opts.map(([m,label,Icon])=><button key={m} type="button" role="radio" aria-checked={mode===m} className={mode===m?"on":""} onClick={()=>pick(m)}><Icon size={16}/>{label}</button>)}</div>
  <small className="muted">이 기기에만 적용돼요. ‘기기 설정’은 휴대폰의 다크 모드를 따라가요.</small>
 </div>;
}

export function NotifyPrefs({v,demo,busy,run,done}:{v:Row;demo:boolean;busy:boolean;run:(c:Record<string,unknown>)=>Promise<unknown>;done:()=>void}){
 const [off,setOff]=useState<string[]>(v.myNotify?.off??[]),[quiet,setQuiet]=useState<boolean>(!!v.myNotify?.quiet);
 const toggle=(id:string)=>setOff(x=>x.includes(id)?x.filter(y=>y!==id):[...x,id]);
 async function save(){
  if(demo){toast("샘플에서는 저장되지 않아요.");return}
  await run({type:"setNotifyPrefs",off,quiet});toast.success("알림 설정을 저장했어요.");done();
 }
 return <div className="gap-grid">
  <p className="data-note">끈 알림은 폰(잠금화면)으로 오지 않아요. 앱의 알림함에는 그대로 쌓여요.</p>
  <div className="pref-list">{NOTIFY_KINDS.map(k=><label key={k.id} className="pref-row"><span>{k.label}</span>
   <input type="checkbox" role="switch" className="switch" checked={!off.includes(k.id)} onChange={()=>toggle(k.id)} aria-label={k.label+" 폰 알림"}/></label>)}</div>
  <label className="pref-row quiet"><span><BellOff size={16}/>밤에는 폰 알림 끄기<small>밤 10시 ~ 아침 8시(한국 시각)</small></span>
   <input type="checkbox" role="switch" className="switch" checked={quiet} onChange={e=>setQuiet(e.target.checked)} aria-label="밤에는 폰 알림 끄기"/></label>
  <p className="small muted">1:1 문의 답변처럼 꼭 알아야 하는 알림은 늘 보내요.</p>
  <button type="button" className="btn btn-green" disabled={busy} onClick={save}>저장</button>
 </div>;
}
