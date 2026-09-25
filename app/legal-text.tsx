import type {ReactNode} from "react";

// 약관·처리방침 원문(lib/legal.ts)은 코드에서 읽기 좋게 줄을 꺾어 두었고 **굵게** 표시가 있다.
// 그대로 보여주면 폰에서 줄이 엉뚱하게 끊기고 별표가 보인다(2026-09-25 사장님 캡처).
// 문단·목록으로 다시 묶어 보여준다. 문구는 한 글자도 바꾸지 않는다.
// 규칙: "- " 로 시작하면 목록 항목, 들여쓴 줄은 바로 앞 줄에 이어 붙이고, 들여쓰지 않은 줄은
// 앞 문단이 마침표 등으로 끝나지 않았을 때만 이어 붙인다(목록 뒤의 문단은 새 문단 — 12항).
type Node={kind:"p"|"li";text:string};
type Block={head?:string;nodes:Node[]};

export function legalBlocks(text:string):Block[]{
 const out:Block[]=[];
 for(const chunk of text.split(/\n\s*\n/)){
  const b:Block={nodes:[]};
  const rows=chunk.split("\n");
  if(/^(제\d+조|\d+\.)\s/.test(rows[0]??"")){b.head=rows.shift();}
  for(const row of rows){
   const last=b.nodes[b.nodes.length-1];
   const join=()=>{last.text+=(/[·\/]$/.test(last.text)?"":" ")+row.trim()};
   if(/^-\s/.test(row))b.nodes.push({kind:"li",text:row.replace(/^-\s/,"")});
   else if(last&&/^\s/.test(row))join();
   else if(last&&last.kind==="p"&&!/[.!?:)]$/.test(last.text))join();
   else b.nodes.push({kind:"p",text:row.trim()});
  }
  out.push(b);
 }
 return out;
}

const bold=(s:string):ReactNode[]=>s.split(/\*\*(.+?)\*\*/g).map((part,i)=>i%2?<strong key={i}>{part}</strong>:part);

export function LegalText({text}:{text:string}){
 return <div className="legal-text">{legalBlocks(text).map((b,i)=>{
  // 이웃한 목록 항목끼리 하나의 목록으로 묶는다. 순서는 원문 그대로.
  const groups:Node[][]=[];
  for(const n of b.nodes){const g=groups[groups.length-1];if(n.kind==="li"&&g?.[0]?.kind==="li")g.push(n);else groups.push([n])}
  return <section key={i}>
   {b.head&&<h2>{bold(b.head)}</h2>}
   {groups.map((g,j)=>g[0].kind==="li"
    ?<ul key={j}>{g.map((n,k)=><li key={k}>{bold(n.text)}</li>)}</ul>
    :<p key={j}>{bold(g[0].text)}</p>)}
  </section>})}</div>;
}
