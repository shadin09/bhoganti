/* ভোগান্তি: অফলাইনে চালানোর সার্ভিস ওয়ার্কার
   - অ্যাপের মূল ফাইলগুলো প্রথমবার খোলার সময় ফোনে জমে যায়, ধীর বা কাটা নেটেও খোলে।
   - Supabase-এর কল (জমা, র‍্যাঙ্কিং) কখনো ক্যাশ হয় না, সবসময় নেট থেকে আসে।
   - ফন্ট একবার নামলে ক্যাশ থেকে আসে।
   নতুন সংস্করণ দিলে নিচের VERSION বদলান, নইলে পুরোনো ফাইল ক্যাশে থেকে যাবে। */
const VERSION = "bhoganti-v4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./og.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // ডেটাবেসের কল: সরাসরি নেট
  if (url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/")) return;
  // ফন্ট: ক্যাশ-ফার্স্ট
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit))
      )
    );
    return;
  }
  // অ্যাপের ফাইল: ক্যাশ-ফার্স্ট, পেছনে নতুনটা এনে রাখে
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
