const CACHE="teamkick-static-v1";
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/offline.html","/icon-192.png","/icon-512.png"])).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("teamkick-static-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=="GET"||url.pathname.startsWith("/api/")||["/signin-with-chatgpt","/signout-with-chatgpt","/callback"].includes(url.pathname))return;if(event.request.mode==="navigate")event.respondWith(fetch(event.request).catch(()=>caches.match("/offline.html")));});

// 푸시에는 내용이 실려 오지 않는다. 깨어나서 직접 읽어온다.
// 브라우저는 푸시를 받으면 반드시 알림을 하나 띄우라고 요구한다. 읽기에 실패해도
// 빈손으로 끝내지 않고 일반 문구라도 보여준다.
async function showLatest(){
 let title="팀킥",body="새 소식이 있어요.";
 try{
  const res=await fetch("/api/app",{cache:"no-store",credentials:"include"});
  if(res.ok){
   const data=await res.json();
   const unread=(data.notifications||[]).filter(n=>!n.read);
   if(unread.length){
    const latest=unread[0];
    title=latest.title||title;
    body=unread.length>1?(latest.body||"")+" 외 "+(unread.length-1)+"건":(latest.body||body);
   }else if(data.user){
    // 읽지 않은 알림이 없다면 다른 기기에서 이미 확인한 것이다. 조용히 넘어간다.
    title="팀킥";body="확인할 소식이 있어요.";
   }
  }
 }catch{/* 네트워크가 끊겼어도 알림은 띄워야 한다 */}
 return self.registration.showNotification(title,{
  body,icon:"/icon-192.png",badge:"/icon-192.png",tag:"teamkick",renotify:true,data:{url:"/"}});
}
self.addEventListener("push",event=>{event.waitUntil(showLatest())});

self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=(event.notification.data&&event.notification.data.url)||"/";
 event.waitUntil((async()=>{
  const all=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  // 이미 열려 있는 창이 있으면 새 창을 또 띄우지 않는다.
  for(const c of all){if(new URL(c.url).origin===self.location.origin){await c.focus();return}}
  await self.clients.openWindow(target);
 })());
});
