"use client";
// 1.20 선수 사진 배경 지우기(누끼) — 공유 포스터 전용.
// MediaPipe Selfie Segmentation(Apache-2.0)을 /vendor/mediapipe 에서 불러와 **이용자 기기 안에서만** 돌린다.
// 사진은 서버·외부로 보내지 않는다. 처음 한 번 약 6MB(모델·실행 파일)를 받고, 그 뒤엔 브라우저 캐시를 쓴다.
// 실패하면 null 을 돌려주고 포스터는 원래 사진(배경 그대로)으로 그린다.
type Mask={segmentationMask:CanvasImageSource};
type Seg={setOptions:(o:Record<string,unknown>)=>void;onResults:(f:(r:Mask)=>void)=>void;send:(i:{image:CanvasImageSource})=>Promise<void>;initialize?:()=>Promise<void>};
declare global{interface Window{SelfieSegmentation?:new(o:{locateFile:(f:string)=>string})=>Seg}}

const BASE="/vendor/mediapipe/";
let seg:Promise<Seg>|null=null;
let queue:Promise<unknown>=Promise.resolve();
const done=new Map<string,Promise<HTMLCanvasElement|null>>();

function script(){return new Promise<void>((ok,no)=>{
 if(window.SelfieSegmentation){ok();return}
 const s=document.createElement("script");s.src=BASE+"selfie_segmentation.js";s.async=true;s.onload=()=>ok();s.onerror=()=>no(new Error("load"));document.head.appendChild(s);
})}
function segmenter(){
 if(!seg)seg=script().then(async()=>{const S=window.SelfieSegmentation;if(!S)throw new Error("missing");
  const x=new S({locateFile:f=>BASE+f});x.setOptions({modelSelection:0,selfieMode:false});await x.initialize?.();return x}).catch(e=>{seg=null;throw e});
 return seg;
}
// 사진 한 장 → 배경이 투명한 캔버스. 같은 사진은 한 번만 처리한다(차례로 하나씩).
export function cutout(key:string,img:HTMLImageElement):Promise<HTMLCanvasElement|null>{
 if(done.has(key))return done.get(key)!;
 const job=queue.then(async()=>{
  try{
   const s=await segmenter();
   const mask=await new Promise<CanvasImageSource>((ok,no)=>{const t=setTimeout(()=>no(new Error("timeout")),20000);s.onResults(r=>{clearTimeout(t);ok(r.segmentationMask)});s.send({image:img}).catch(no)});
   const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
   const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d")!;
   // 가장자리를 살짝 부드럽게(머리카락 끝이 톱니처럼 보이지 않게)
   x.filter="blur(1.5px)";x.drawImage(mask,0,0,w,h);x.filter="none";
   x.globalCompositeOperation="source-in";x.drawImage(img,0,0,w,h);
   return c;
  }catch{return null}
 });
 queue=job.catch(()=>null);done.set(key,job);return job;
}
