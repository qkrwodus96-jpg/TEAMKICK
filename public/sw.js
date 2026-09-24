const CACHE="teamkick-static-v1";
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/offline.html","/icon-192.png","/icon-512.png"])).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("teamkick-static-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=="GET"||url.pathname.startsWith("/api/")||["/signin-with-chatgpt","/signout-with-chatgpt","/callback"].includes(url.pathname))return;if(event.request.mode==="navigate")event.respondWith(fetch(event.request).catch(()=>caches.match("/offline.html")));});

// 푸시에는 내용이 실려 오지 않는다. 깨어나서 직접 읽어온다.
// 브라우저는 푸시를 받으면 반드시 알림을 하나 띄우라고 요구한다. 읽기에 실패해도
// 빈손으로 끝내지 않고 일반 문구라도 보여준다.
async function showLatest(){
 let title="팀킥",body="새 소식이 있어요.",url="/";
 try{
  const res=await fetch("/api/app",{cache:"no-store",credentials:"include"});
  if(res.ok){
   const data=await res.json();
   const unread=(data.notifications||[]).filter(n=>!n.read);
   if(unread.length){
    // 알림은 오래된 것부터 쌓인다. 마지막이 가장 최근이다.
    // 예전에는 unread[0] 을 썼는데 그건 **가장 오래된** 소식이었다.
    const latest=unread[unread.length-1];
    title=latest.title||title;
    body=unread.length>1?(latest.body||"")+" 외 "+(unread.length-1)+"건":(latest.body||body);
    // 눌렀을 때 그 소식이 있는 화면으로 바로 가도록 주소에 실어 둔다.
    if(latest.to)url="/?to="+encodeURIComponent(latest.to);
   }else if(data.user){
    // 읽지 않은 알림이 없다면 다른 기기에서 이미 확인한 것이다. 조용히 넘어간다.
    title="팀킥";body="확인할 소식이 있어요.";
   }
   // 홈 화면 아이콘에 읽지 않은 개수를 붙인다. 지원하지 않는 브라우저도 많아 조용히 넘어간다.
   try{if(unread.length)await self.navigator.setAppBadge?.(unread.length);else await self.navigator.clearAppBadge?.()}catch{}
  }
 }catch{/* 네트워크가 끊겼어도 알림은 띄워야 한다 */}
 // 알림을 띄운 결과를 열려 있는 팀킥 화면에 알려 준다. 시험 알림을 눌렀는데 폰에
 // 아무것도 안 뜰 때, "신호가 폰까지 왔는지" 와 "왔는데 표시가 막혔는지" 를 가른다.
 let shown=true,why="";
 try{
  await self.registration.showNotification(title,{
   body,icon:"/icon-192.png",badge:"/icon-192.png",tag:"teamkick",renotify:true,data:{url}});
 }catch(e){shown=false;why=String(e&&e.message||e).slice(0,120)}
 try{
  const wins=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  const perm=(self.Notification&&self.Notification.permission)||"";
  for(const c of wins)c.postMessage({type:"teamkick-push",at:Date.now(),shown,why,permission:perm});
 }catch{}
 // 서버에도 "이 기기가 받았다" 를 남긴다. 화면이 닫혀 있어도 기록이 남아서, 나중에
 // MY → 기기 알림에서 "폰이 받은 시각" 을 볼 수 있다. 실패해도 알림에는 영향이 없다.
 try{
  const sub=await self.registration.pushManager.getSubscription();
  if(sub)await fetch("/api/push",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({action:"ack",endpoint:sub.endpoint,shown})});
 }catch{}
}
self.addEventListener("push",event=>{event.waitUntil(showLatest())});

self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=(event.notification.data&&event.notification.data.url)||"/";
 event.waitUntil((async()=>{
  const all=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  // 이미 열려 있는 창이 있으면 새 창을 또 띄우지 않는다. 대신 그 창에게
  // 어느 화면으로 갈지 알려 준다(새로 고치지 않아도 탭이 옮겨진다).
  for(const c of all){if(new URL(c.url).origin===self.location.origin){
   try{c.postMessage({type:"teamkick-open",url:target})}catch{}
   await c.focus();return}}
  await self.clients.openWindow(target);
 })());
});
