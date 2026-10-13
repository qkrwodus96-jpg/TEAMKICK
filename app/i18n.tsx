"use client";
// 다국어(1.18) — 한국어 · English · 日本語 · 中文 · Tiếng Việt.
// 앱 글자가 코드 곳곳에 한국어로 들어 있어서, 화면에 그려진 글자를 사전(lib/i18n/d1~d4)으로 바꿔 끼운다.
// 사전에 똑같은 문장이 있을 때만 바꾸므로 사용자가 쓴 글(팀 이름·공지·채팅)은 그대로 남는다.
// 약관·개인정보처리방침은 한국어 원문이 기준이라 번역하지 않는다(그 화면에서는 이 번역기가 돌지 않는다).
import {useEffect,useState} from "react";
import {Languages} from "lucide-react";
import d1 from "@/lib/i18n/d1";import d2 from "@/lib/i18n/d2";import d3 from "@/lib/i18n/d3";import d4 from "@/lib/i18n/d4";import d5 from "@/lib/i18n/d5";import d6 from "@/lib/i18n/d6";

export const LANGS=[{id:"ko",label:"한국어"},{id:"en",label:"English"},{id:"ja",label:"日本語"},{id:"zh",label:"中文"},{id:"vi",label:"Tiếng Việt"}] as const;
export type Lang=typeof LANGS[number]["id"];
const IDX:Record<string,number>={en:0,ja:1,zh:2,vi:3};
export const LANG_KEY="teamkick_lang";
export function langNow():Lang{try{const v=localStorage.getItem(LANG_KEY);return (LANGS.some(l=>l.id===v)?v:"ko") as Lang}catch{return "ko"}}

let DICT:Map<string,string[]>|null=null;
const norm=(s:string)=>s.replace(/\s+/g," ").trim();
function dict(){
 if(DICT)return DICT;DICT=new Map();
 for(const src of [d1,d2,d3,d4,d5,d6])for(const line of src.split("\n")){const p=line.split("\t");if(p.length>=5&&p[0])DICT.set(norm(p[0]),p.slice(1,5))}
 return DICT;
}
const WEEK:Record<string,string[]>={"일":["Sun","日","日","CN"],"월":["Mon","月","一","T2"],"화":["Tue","火","二","T3"],"수":["Wed","水","三","T4"],"목":["Thu","木","四","T5"],"금":["Fri","金","五","T6"],"토":["Sat","土","六","T7"]};
const AMPM=(k:string,i:number)=>k==="오전"?["AM","午前","上午","SA"][i]:["PM","午後","下午","CH"][i];
// 숫자·날짜가 섞인 글은 모양으로 바꾼다.
type Rule=[RegExp,(m:RegExpMatchArray,i:number)=>string];
const RULES:Rule[]=[
 [/^(\d+)월 (\d+)일 \((.)\)$/,(m,i)=>[`${WEEK[m[3]][0]}, ${m[1]}/${m[2]}`,`${m[1]}月${m[2]}日(${WEEK[m[3]][1]})`,`${m[1]}月${m[2]}日(周${WEEK[m[3]][2]})`,`${WEEK[m[3]][3]}, ${m[2]}/${m[1]}`][i]],
 [/^(\d+)월 (\d+)일$/,(m,i)=>[`${m[1]}/${m[2]}`,`${m[1]}月${m[2]}日`,`${m[1]}月${m[2]}日`,`${m[2]}/${m[1]}`][i]],
 [/^(\d+)월 (\d+)일 \((.)\) (\d\d:\d\d)$/,(m,i)=>[`${WEEK[m[3]][0]}, ${m[1]}/${m[2]} ${m[4]}`,`${m[1]}月${m[2]}日(${WEEK[m[3]][1]}) ${m[4]}`,`${m[1]}月${m[2]}日(周${WEEK[m[3]][2]}) ${m[4]}`,`${WEEK[m[3]][3]}, ${m[2]}/${m[1]} ${m[4]}`][i]],
 [/^(오전|오후) (\d+):(\d\d)$/,(m,i)=>i===0||i===3?`${m[2]}:${m[3]} ${AMPM(m[1],i)}`:`${AMPM(m[1],i)}${m[2]}:${m[3]}`],
 [/^(\d+)\. (\d+)\. \((.)\) · (오전|오후) (\d+):(\d\d)$/,(m,i)=>[`${WEEK[m[3]][0]} ${m[1]}/${m[2]} · ${m[5]}:${m[6]} ${AMPM(m[4],0)}`,`${m[1]}/${m[2]}(${WEEK[m[3]][1]}) · ${AMPM(m[4],1)}${m[5]}:${m[6]}`,`${m[1]}/${m[2]}(周${WEEK[m[3]][2]}) · ${AMPM(m[4],2)}${m[5]}:${m[6]}`,`${WEEK[m[3]][3]} ${m[2]}/${m[1]} · ${m[5]}:${m[6]} ${AMPM(m[4],3)}`][i]],
 [/^(\d{4})년 (\d+)월$/,(m,i)=>[`${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m[2]]} ${m[1]}`,`${m[1]}年${+m[2]}月`,`${m[1]}年${+m[2]}月`,`Tháng ${+m[2]}/${m[1]}`][i]],
 [/^(\d{4})년 (\d+)월 일정$/,(m,i)=>[`${m[1]}-${m[2]} schedule`,`${m[1]}年${+m[2]}月の日程`,`${m[1]}年${+m[2]}月日程`,`Lịch ${+m[2]}/${m[1]}`][i]],
 [/^(\d+)명$/,(m,i)=>[`${m[1]} players`,`${m[1]}名`,`${m[1]}人`,`${m[1]} người`][i]],
 [/^(\d+)경기$/,(m,i)=>[`${m[1]} matches`,`${m[1]}試合`,`${m[1]}场`,`${m[1]} trận`][i]],
 [/^(\d+)골$/,(m,i)=>[`${m[1]} goals`,`${m[1]}ゴール`,`${m[1]}球`,`${m[1]} bàn`][i]],
 [/^(\d+)도움$/,(m,i)=>[`${m[1]} assists`,`${m[1]}アシスト`,`${m[1]}助攻`,`${m[1]} kiến tạo`][i]],
 [/^(\d+)대(\d+)$/,(m)=>`${m[1]}v${m[2]}`],
 [/^실력 (.+)$/,(m,i)=>({en:"Level ",ja:"実力 ",zh:"水平 ",vi:"Trình độ "} as Record<string,string>)[["en","ja","zh","vi"][i]]+(tr(m[1],i)??m[1])],
 [/^상대팀 구장비 ([\d,]+)원$/,(m,i)=>[`Opponent fee ₩${m[1]}`,`相手グラウンド費 ${m[1]}ウォン`,`对手场地费 ${m[1]}韩元`,`Phí sân đối thủ ₩${m[1]}`][i]],
 [/^참가비 ([\d,]+)(만원|원)$/,(m,i)=>{const n=m[2]==="만원"?Number(m[1].replace(/,/g,""))*10000:Number(m[1].replace(/,/g,""));const s=n.toLocaleString();return [`Fee ₩${s}`,`参加費 ${s}ウォン`,`参赛费 ${s}韩元`,`Phí ₩${s}`][i]}],
 [/^월 회비 ([\d,]+)원$/,(m,i)=>[`Monthly fee ₩${m[1]}`,`月会費 ${m[1]}ウォン`,`月会费 ${m[1]}韩元`,`Phí tháng ₩${m[1]}`][i]],
 [/^용병 (\d+)\/(\d+)$/,(m,i)=>[`Guests ${m[1]}/${m[2]}`,`助っ人 ${m[1]}/${m[2]}`,`外援 ${m[1]}/${m[2]}`,`Khách ${m[1]}/${m[2]}`][i]],
 [/^최소 (.+)$/,(m,i)=>["Min. ","最低 ","至少 ","Tối thiểu "][i]+(tr(m[1],i)??m[1])],
 [/^(.+) 팀 채팅$/,(m,i)=>[`${m[1]} team chat`,`${m[1]} チームチャット`,`${m[1]} 球队聊天`,`Chat đội ${m[1]}`][i]],
 [/^오늘 (\d\d:\d\d) 경기$/,(m,i)=>[`Match today at ${m[1]}`,`今日 ${m[1]} の試合`,`今天 ${m[1]} 比赛`,`Trận hôm nay lúc ${m[1]}`][i]],
 [/^(\d+)Q 저장$/,(m,i)=>[`Save Q${m[1]}`,`${m[1]}Q 保存`,`保存第${m[1]}节`,`Lưu hiệp ${m[1]}`][i]],
 [/^더보기 (\d+)개$/,(m,i)=>[`${m[1]} more`,`さらに${m[1]}件`,`还有${m[1]}个`,`Thêm ${m[1]}`][i]],
 [/^(\d+)개 남음$/,(m,i)=>[`${m[1]} left`,`残り${m[1]}`,`剩余${m[1]}项`,`Còn ${m[1]}`][i]],
 [/^(\d+)명 모집$/,(m,i)=>[`${m[1]} needed`,`${m[1]}名募集`,`招募${m[1]}人`,`Cần ${m[1]} người`][i]],
 [/^(\d+)승 (\d+)무 (\d+)패$/,(m,i)=>[`${m[1]}W ${m[2]}D ${m[3]}L`,`${m[1]}勝${m[2]}分${m[3]}敗`,`${m[1]}胜${m[2]}平${m[3]}负`,`${m[1]}T ${m[2]}H ${m[3]}B`][i]],
 [/^D-(\d+)$/,(m)=>`D-${m[1]}`],
 [/^(\d+)(월|화|수|목|금|토|일)요일$/,(m,i)=>m[1]+WEEK[m[2]][i]],
 [/^(월|화|수|목|금|토|일)요일 (\d+)번$/,(m,i)=>[`${WEEK[m[1]][0]} ×${m[2]}`,`${WEEK[m[1]][1]}曜 ${m[2]}回`,`周${WEEK[m[1]][2]} ${m[2]}次`,`${WEEK[m[1]][3]} ×${m[2]}`][i]],
 [/^총 (\d+)골$/,(m,i)=>[`${m[1]} total`,`計${m[1]}ゴール`,`共${m[1]}球`,`Tổng ${m[1]} bàn`][i]],
 [/^(\d+)\/(\d+)명 · (.+)$/,(m,i)=>`${m[1]}/${m[2]} · ${tr(m[3],i)??m[3]}`],
 // 서버가 만든 알림 문장(팀 이름·사람 이름이 들어간다)
 [/^(.+)에서 경기를 신청했어요\.(.*)$/,(m,i)=>[`${m[1]} requested a match.`,`${m[1]}が試合を申請しました。`,`${m[1]} 申请了比赛。`,`${m[1]} đã xin ghép trận.`][i]+m[2]],
 [/^(.+)와 경기가 확정되었어요\.$/,(m,i)=>[`Match confirmed with ${m[1]}.`,`${m[1]}との試合が確定しました。`,`与${m[1]}的比赛已确认。`,`Đã chốt trận với ${m[1]}.`][i]],
 [/^(.+)님이 가입을 신청했어요\.$/,(m,i)=>[`${m[1]} requested to join.`,`${m[1]}さんが参加を申請しました。`,`${m[1]} 申请加入。`,`${m[1]} đã xin gia nhập.`][i]],
 [/^(.+)님이 용병으로 신청했어요\.$/,(m,i)=>[`${m[1]} applied as a guest.`,`${m[1]}さんが助っ人に申請しました。`,`${m[1]} 申请成为外援。`,`${m[1]} đăng ký làm khách.`][i]],
 [/^오늘은 (.+)님 생일이에요$/,(m,i)=>[`It's ${m[1]}'s birthday today`,`今日は${m[1]}さんの誕生日です`,`今天是${m[1]}的生日`,`Hôm nay là sinh nhật ${m[1]}`][i]],
 [/^(.+) · 함께 축하해 주세요!$/,(m,i)=>[`${m[1]} · Let's celebrate!`,`${m[1]} · 一緒にお祝いしましょう!`,`${m[1]} · 一起庆祝吧!`,`${m[1]} · Cùng chúc mừng nhé!`][i]],
 [/^(.+)에 새 식구가 왔어요\. 환영해 주세요!$/,(m,i)=>[`A new teammate joined ${m[1]}. Welcome them!`,`${m[1]}に新しい仲間が来ました。歓迎しましょう!`,`${m[1]}来了新队友，欢迎!`,`${m[1]} có thành viên mới. Chào mừng nhé!`][i]],
 [/^영입 소식 · (.+) 합류$/,(m,i)=>[`Signing · ${m[1]} joins`,`加入ニュース · ${m[1]} 合流`,`签约消息 · ${m[1]} 加盟`,`Chiêu mộ · ${m[1]} gia nhập`][i]],
 [/^HERE WE GO! (.+) 합류$/,(m,i)=>[`HERE WE GO! ${m[1]} joins`,`HERE WE GO! ${m[1]} 合流`,`HERE WE GO! ${m[1]} 加盟`,`HERE WE GO! ${m[1]} gia nhập`][i]],
 [/^(.+) 경기 참여 여부를 알려주세요\.$/,(m,i)=>[`${m[1]} — let us know if you're playing.`,`${m[1]} 試合に参加するか教えてください。`,`${m[1]} 请告知是否参赛。`,`${m[1]} — cho biết bạn có tham gia.`][i]],
 [/^(.+)님이 (.+)에 메시지를 보냈어요\.$/,(m,i)=>[`${m[1]} sent a message in ${m[2]}.`,`${m[1]}さんが${m[2]}にメッセージを送りました。`,`${m[1]} 在 ${m[2]} 发送了消息。`,`${m[1]} đã nhắn trong ${m[2]}.`][i]],
 [/^(\d+)개 팀 합산$/,(m,i)=>[`across ${m[1]} teams`,`${m[1]}チーム合算`,`${m[1]}支球队合计`,`gộp ${m[1]} đội`][i]],
 [/^팀킥 (v[\d.]+)$/,(m)=>`TeamKick ${m[1]}`],
 // 1.36 케미·팀 랭킹·기록 순서 안내
 [/^도움 (\d+)번 · 내 (골|도움)의 (\d+)%$/,(m,i)=>{const g=m[2]==="골";return [`${m[1]} assist${m[1]==="1"?"":"s"} · ${m[3]}% of my ${g?"goals":"assists"}`,`アシスト${m[1]}回 · 自分の${g?"ゴール":"アシスト"}の${m[3]}%`,`助攻${m[1]}次 · 占我${g?"进球":"助攻"}的${m[3]}%`,`${m[1]} kiến tạo · ${m[3]}% ${g?"bàn":"kiến tạo"} của tôi`][i]}],
 [/^(승률|패배율) (\d+)% · (\d+)경기 (\d+)승 (\d+)무 (\d+)패$/,(m,i)=>{const w=m[1]==="승률";return [`${w?"Win":"Loss"} rate ${m[2]}% · ${m[3]} matches ${m[4]}W ${m[5]}D ${m[6]}L`,`${w?"勝率":"敗率"} ${m[2]}% · ${m[3]}試合 ${m[4]}勝${m[5]}分${m[6]}敗`,`${w?"胜率":"败率"} ${m[2]}% · ${m[3]}场 ${m[4]}胜${m[5]}平${m[6]}负`,`Tỉ lệ ${w?"thắng":"thua"} ${m[2]}% · ${m[3]} trận ${m[4]}T ${m[5]}H ${m[6]}B`][i]}],
 [/^(.+) · (\d+)경기 (\d+)승 (\d+)무 (\d+)패 · 득실 (\d+):(\d+)$/,(m,i)=>`${tr(m[1],i)??m[1]} · `+[`${m[2]} matches ${m[3]}W ${m[4]}D ${m[5]}L · GF:GA ${m[6]}:${m[7]}`,`${m[2]}試合 ${m[3]}勝${m[4]}分${m[5]}敗 · 得失 ${m[6]}:${m[7]}`,`${m[2]}场 ${m[3]}胜${m[4]}平${m[5]}负 · 进失 ${m[6]}:${m[7]}`,`${m[2]} trận ${m[3]}T ${m[4]}H ${m[5]}B · BT:BB ${m[6]}:${m[7]}`][i]],
 [/^이 기간에 (\d+)경기 이상 치른 팀이 없어요\.$/,(m,i)=>[`No team has played ${m[1]}+ matches in this period.`,`この期間に${m[1]}試合以上したチームはありません。`,`此期间没有踢满${m[1]}场的球队。`,`Chưa đội nào đá từ ${m[1]} trận trong giai đoạn này.`][i]],
 [/^팀킥에서 매칭하고 두 팀이 점수를 서로 확인한 경기만 세요\(외부 팀·자체전 제외\)\. 승률은 (\d+)경기 이상 치른 팀만\. 팀을 누르면 팀 프로필이 열려요\.$/,(m,i)=>[`Counts only matches made on TeamKick with the score confirmed by both teams (no outside teams or in-team games). Win rate needs ${m[1]}+ matches. Tap a team to open its profile.`,`チームキックでマッチングし、両チームがスコアを確認した試合だけを数えます（外部チーム・紅白戦を除く）。勝率は${m[1]}試合以上のチームのみ。チームを押すとプロフィールが開きます。`,`仅统计在TeamKick约战且双方确认比分的比赛（不含外部球队和队内赛）。胜率仅限踢满${m[1]}场的球队。点球队可打开资料。`,`Chỉ tính trận ghép trên TeamKick có tỉ số được hai đội xác nhận (không gồm đội ngoài, đá nội bộ). Tỉ lệ thắng cần từ ${m[1]} trận. Nhấn đội để mở hồ sơ.`][i]],
 [/^(.+) · (\d+)경기 (\d+)승 (\d+)무 (\d+)패$/,(m,i)=>`${tr(m[1],i)??m[1]} · `+[`${m[2]} matches ${m[3]}W ${m[4]}D ${m[5]}L`,`${m[2]}試合 ${m[3]}勝${m[4]}分${m[5]}敗`,`${m[2]}场 ${m[3]}胜${m[4]}平${m[5]}负`,`${m[2]} trận ${m[3]}T ${m[4]}H ${m[5]}B`][i]],
 [/^(.+) · (\d+)경기 · 득점 (\d+)골 · 실점 (\d+)골$/,(m,i)=>`${tr(m[1],i)??m[1]} · `+[`${m[2]} matches · ${m[3]} scored · ${m[4]} conceded`,`${m[2]}試合 · 得点${m[3]} · 失点${m[4]}`,`${m[2]}场 · 进${m[3]}球 · 失${m[4]}球`,`${m[2]} trận · ghi ${m[3]} · thủng ${m[4]}`][i]],
 [/^(\d+)승$/,(m,i)=>[`${m[1]} W`,`${m[1]}勝`,`${m[1]}胜`,`${m[1]} thắng`][i]],
 [/^(.+) 라인업으로 포스터 만들기$/,(m,i)=>[`Make poster from ${m[1]} lineup`,`${m[1]}のラインナップでポスター作成`,`用${m[1]}阵容生成海报`,`Tạo poster từ đội hình ${m[1]}`][i]],
 [/^(\d+)쿼터$/,(m,i)=>[`Q${m[1]}`,`${m[1]}Q`,`第${m[1]}节`,`Hiệp ${m[1]}`][i]],
 [/^확정 점수 (\d+)골과 (\d+)골 (많아요|모자라요)\.$/,(m,i)=>{const more=m[3]==="많아요";return [`${m[2]} goal(s) ${more?"over":"short of"} the confirmed ${m[1]}.`,`確定スコア${m[1]}点より${m[2]}点${more?"多い":"足りない"}です。`,`比确认比分${m[1]}球${more?"多":"少"}${m[2]}球。`,`${more?"Thừa":"Thiếu"} ${m[2]} bàn so với tỉ số ${m[1]}.`][i]}],
 [/^(\d+)쿼터 라인업을 저장했어요\.$/,(m,i)=>[`Q${m[1]} lineup saved.`,`${m[1]}Qのラインナップを保存しました。`,`第${m[1]}节阵容已保存。`,`Đã lưu đội hình hiệp ${m[1]}.`][i]],
 [/^(\d+)명에게 알림을 보냈어요\.$/,(m,i)=>[`Notified ${m[1]} people.`,`${m[1]}名に通知しました。`,`已通知${m[1]}人。`,`Đã báo ${m[1]} người.`][i]],
];
function tr(text:string,i:number):string|null{
 const k=norm(text);if(!k||!/[가-힣]/.test(k))return null;
 const hit=dict().get(k);if(hit&&hit[i])return hit[i];
 for(const [re,fn] of RULES){const m=k.match(re);if(m)return fn(m,i)}
 return null;
}

// ── 화면에 적용 ──
// 우리가 바꿔 넣은 글자(OUT)와 그 원문(ORIG)을 기억한다. 화면 글자가 OUT 과 다르면 React 가 새 원문을 넣은 것이다.
const ORIG=new WeakMap<Text,string>(),OUT=new WeakMap<Text,string>();
const AORIG=new WeakMap<Element,Record<string,string>>(),AOUT=new WeakMap<Element,Record<string,string>>();
const ATTRS=["placeholder","aria-label","title"];
let current:Lang="ko";
const skip=(el:Element|null)=>!!el?.closest("[data-i18n-skip],script,style,textarea,code,.chat-box,.rules-text,.tp-view-caption,.mc-msg,.avatar,.club-crest,.lu-name,.chat-name,.team-header h2,.top-user-name");
function doText(n:Text){
 const par=n.parentElement;if(!par||skip(par))return;
 const ours=OUT.has(n)&&n.data===OUT.get(n);const src=ours?ORIG.get(n)!:n.data;
 if(current==="ko"){if(ours)n.data=src;OUT.delete(n);ORIG.delete(n);return}
 const t=tr(src,IDX[current]);if(t==null){OUT.delete(n);ORIG.delete(n);return}
 const out=src.match(/^\s*/)![0]+t+src.match(/\s*$/)![0];
 ORIG.set(n,src);OUT.set(n,out);if(n.data!==out)n.data=out;
}
function doAttrs(el:Element){
 if(skip(el))return;const o=AORIG.get(el)??{},w=AOUT.get(el)??{};
 for(const a of ATTRS){const v=el.getAttribute(a);if(v==null)continue;
  const src=w[a]!=null&&v===w[a]?o[a]:v;
  if(current==="ko"){if(v!==src)el.setAttribute(a,src);delete w[a];delete o[a];continue}
  const t=tr(src,IDX[current]);if(t==null){delete w[a];delete o[a];continue}
  o[a]=src;w[a]=t;if(v!==t)el.setAttribute(a,t);}
 AORIG.set(el,o);AOUT.set(el,w);
}
function walk(root:Node){
 if(root.nodeType===3){doText(root as Text);return}
 if(root.nodeType!==1)return;const el=root as Element;if(skip(el))return;
 doAttrs(el);
 const it=document.createTreeWalker(el,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n=it.nextNode();
 while(n){if(n.nodeType===3)doText(n as Text);else doAttrs(n as Element);n=it.nextNode()}
}
let observer:MutationObserver|null=null;
export function applyLang(lang:Lang){
 current=lang;document.documentElement.lang=lang==="zh"?"zh-CN":lang;
 if(lang!=="ko"&&!observer){
  observer=new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")doText(m.target as Text);else if(m.type==="attributes")doAttrs(m.target as Element);else m.addedNodes.forEach(walk)}});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 }
 walk(document.body);
 if(lang==="ko"&&observer){observer.disconnect();observer=null}
}
export function setLang(lang:Lang){try{if(lang==="ko")localStorage.removeItem(LANG_KEY);else localStorage.setItem(LANG_KEY,lang)}catch{}applyLang(lang)}

// 앱에 한 번 붙여 둔다. 저장된 언어가 있으면 켠다.
export function I18nRoot(){useEffect(()=>{const l=langNow();if(l!=="ko")applyLang(l)},[]);return null}

export function LangPicker({compact=false}:{compact?:boolean}){
 const [lang,setL]=useState<Lang>(()=>typeof window==="undefined"?"ko":langNow());
 const pick=(l:Lang)=>{setL(l);setLang(l)};
 if(compact)return <label className="lang-compact"><Languages size={15}/><select aria-label="Language" value={lang} onChange={e=>pick(e.target.value as Lang)}>{LANGS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label>;
 return <div className="pref-block" data-i18n-skip><strong><Languages size={15} style={{verticalAlign:"-2px",marginRight:4}}/>언어 · Language</strong>
  <div className="lang-grid">{LANGS.map(l=><button key={l.id} type="button" className={"chip-btn"+(lang===l.id?" on":"")} onClick={()=>pick(l.id)}>{l.label}</button>)}</div>
  <small className="muted">{lang==="ko"?"약관·개인정보처리방침과 팀원이 쓴 글은 원문 그대로 보여요.":"Terms, privacy policy and posts written by users stay in the original Korean. The Korean legal text governs."}</small>
 </div>;
}

// 테스트용: 사전에서 한 문장을 찾아 본다.
export const translateForTest=(text:string,lang:Exclude<Lang,"ko">)=>tr(text,IDX[lang]);
