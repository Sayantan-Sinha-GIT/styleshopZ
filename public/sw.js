const CACHE='styleshopz-public-v4';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/offline.html','/app-icon-192.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Never cache authenticated pages, API responses, uploads or personal data.
  if(url.pathname.startsWith('/photos/')){event.respondWith(caches.open(CACHE).then(async cache=>{const old=await cache.match(event.request);if(old)return old;const response=await fetch(event.request);if(response.ok)cache.put(event.request,response.clone());return response;}));return;}
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(async()=>{
    const fallback=await caches.match('/offline.html');
    // A cached asset may carry a redirect flag. Navigation with redirect=manual
    // rejects it, so create a fresh response for the recovery document.
    return fallback?new Response(await fallback.blob(),{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}}):Response.error();
  }));
});
