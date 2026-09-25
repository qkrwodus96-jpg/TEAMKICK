import type {ReactNode} from "react";

// 약관·처리방침 원문(lib/legal.ts)은 코드에서 읽기 좋게 줄을 꺾어 두었고 **굵게** 표시가 있다.
// 그대로 보여주면 폰에서 줄이 엉뚱하게 끊기고 별표가 보인다(2026-09-25 사장님 캡처).
// 문단·목록으로 다시 묶어 보여준다. 문구는 한 글자도 바꾸지 않는다.
type Block={head?:string;lines:string[];items:string[]};

function blocks(text:string):Block[]{
 const out:Block[]=[];
 for(const chunk of text.split(/\n\s*\n/)){
  const b:Block={lines:[],items:[]};
  const rows=chunk.split("\n");
  if(/^(제\d+조|\d+\.)\s/.test(rows[0]??"")){b.head=rows.shift();}
  for(const row of rows){
   const join=(prev:string)=>prev+(/[·\/]$/.test(prev)?"":" ")+row.trim();
   if(/^-\s/.test(row))b.items.push(row.replace(/^-\s/,""));
   else if(b.items.length)b.items[b.items.length-1]=join(b.items[b.items.length-1]);
   // 앞줄이 문장 끝(마침표 등)이 아니면 코드에서 꺾어 둔 줄이므로 이어 붙인다.
   else if(b.lines.length&&(/^\s/.test(row)||!/[.!?:)]$/.test(b.lines[b.lines.length-1])))b.lines[b.lines.length-1]=join(b.lines[b.lines.length-1]);
   else b.lines.push(row.trim());
  }
  out.push(b);
 }
 return out;
}

const bold=(s:string):ReactNode[]=>s.split(/\*\*(.+?)\*\*/g).map((part,i)=>i%2?<strong key={i}>{part}</strong>:part);

export function LegalText({text}:{text:string}){
 return <div className="legal-text">{blocks(text).map((b,i)=><section key={i}>
  {b.head&&<h2>{bold(b.head)}</h2>}
  {b.lines.map((l,j)=><p key={j}>{bold(l)}</p>)}
  {!!b.items.length&&<ul>{b.items.map((l,j)=><li key={j}>{bold(l)}</li>)}</ul>}
 </section>)}</div>;
}
