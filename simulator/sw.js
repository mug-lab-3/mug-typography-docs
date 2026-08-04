const CACHE_NAME = "mt-sim-584189f7bd4303c8";
const PRECACHE_URLS = [
  "./",
  "apple-touch-icon.png",
  "chunks/abap-V4BEGBBA.js",
  "chunks/apex-MQ5HNJWG.js",
  "chunks/azcli-YPUKNCT6.js",
  "chunks/bat-DXCZQHQY.js",
  "chunks/bicep-72L32CDL.js",
  "chunks/cameligo-33NXKP5V.js",
  "chunks/chunk-6W2DQUZB.js",
  "chunks/chunk-FB5IOQ5D.js",
  "chunks/chunk-ICLTXRTG.js",
  "chunks/chunk-JDEYA2L7.js",
  "chunks/chunk-JTHOZWZ2.js",
  "chunks/chunk-KX56PNZB.js",
  "chunks/chunk-LDJZ3X7C.js",
  "chunks/chunk-Z5FW2RWE.js",
  "chunks/clojure-ET23FAMS.js",
  "chunks/coffee-O7QO3F5P.js",
  "chunks/cpp-AZAHPX26.js",
  "chunks/csharp-FGMI3LZV.js",
  "chunks/csp-AQIIHF4S.js",
  "chunks/css-UCFJS7KV.js",
  "chunks/cssMode-MR5COWSF.css",
  "chunks/cssMode-QRSSRO3X.js",
  "chunks/cypher-EEV37NTK.js",
  "chunks/dart-VP7PK5DK.js",
  "chunks/dockerfile-ZNIEYG5X.js",
  "chunks/ecl-7ACHJ4RG.js",
  "chunks/elixir-57OHBUHQ.js",
  "chunks/flow9-LEM2TNDF.js",
  "chunks/freemarker2-3J3ZU5MU.js",
  "chunks/freemarker2-J3X3QCXR.css",
  "chunks/fsharp-MUUTLL2H.js",
  "chunks/go-2SK2NMOA.js",
  "chunks/graphql-QRYNOC2E.js",
  "chunks/handlebars-AWACROEN.js",
  "chunks/handlebars-N52TEJJL.css",
  "chunks/hcl-WANPNL2E.js",
  "chunks/html-A2JAZJU6.js",
  "chunks/html-DF7HR56E.css",
  "chunks/htmlMode-6DG3UCYQ.js",
  "chunks/htmlMode-PGOBIKLM.css",
  "chunks/ini-EKKK4GSN.js",
  "chunks/java-25D6735V.js",
  "chunks/javascript-2GAUSCPG.css",
  "chunks/javascript-HWCZJFXE.js",
  "chunks/jsonMode-37FV5P75.css",
  "chunks/jsonMode-INCAXHQB.js",
  "chunks/julia-QLN3HM2S.js",
  "chunks/kotlin-4F5L7E7I.js",
  "chunks/less-OCV3WXFE.js",
  "chunks/lexon-R4E5V4OZ.js",
  "chunks/liquid-DDF2FIM5.css",
  "chunks/liquid-SRHPGSDX.js",
  "chunks/lua-AIOMOO5E.js",
  "chunks/m3-DLHDOSZZ.js",
  "chunks/markdown-3S5GLFOD.js",
  "chunks/mdx-JIUSYO6Y.js",
  "chunks/mdx-YZSKBZUX.css",
  "chunks/mips-DIFOKBZR.js",
  "chunks/msdax-647ENJPK.js",
  "chunks/mysql-HNPPL7ZW.js",
  "chunks/objective-c-HIYQXJKB.js",
  "chunks/pascal-QOQQVCPJ.js",
  "chunks/pascaligo-J24JVAMC.js",
  "chunks/perl-U6DBJYGK.js",
  "chunks/pgsql-2SSJ2JDL.js",
  "chunks/php-EMILRKP3.js",
  "chunks/pla-NS2OIAXY.js",
  "chunks/postiats-4WBDXDBL.js",
  "chunks/powerquery-AE2NOVE7.js",
  "chunks/powershell-RPMQYEJR.js",
  "chunks/protobuf-D7HO2DG7.js",
  "chunks/pug-RE2CGN3L.js",
  "chunks/python-SG3EGTD4.js",
  "chunks/python-XWVNKUTD.css",
  "chunks/qsharp-FJIDWJLR.js",
  "chunks/r-DGBQPFTX.js",
  "chunks/razor-QCDBHSMV.js",
  "chunks/razor-QWYRF2OC.css",
  "chunks/redis-BZNOVBIB.js",
  "chunks/redshift-LXRYT42E.js",
  "chunks/restructuredtext-P3DUT7ZU.js",
  "chunks/ruby-BL3GWB6P.js",
  "chunks/rust-7RD6EILH.js",
  "chunks/sb-AZ3BZYKC.js",
  "chunks/scala-XGEUXTE5.js",
  "chunks/scheme-Q7UKPPRA.js",
  "chunks/scss-MABQIZHB.js",
  "chunks/shell-TZ2QSRVR.js",
  "chunks/solidity-WV6XYRHA.js",
  "chunks/sophia-5D2OGVVA.js",
  "chunks/sparql-JUA2ANSF.js",
  "chunks/sql-GKH5V4IO.js",
  "chunks/st-2JQAU62I.js",
  "chunks/swift-QZAUQTZN.js",
  "chunks/systemverilog-L3NMXF6Y.js",
  "chunks/tcl-OEAE2274.js",
  "chunks/tsMode-374KAQC6.css",
  "chunks/tsMode-OVEEG4KT.js",
  "chunks/twig-FB3MKPSH.js",
  "chunks/typescript-N4XL23LG.js",
  "chunks/typescript-QXWVDLDM.css",
  "chunks/typespec-RB3RAFXR.js",
  "chunks/vb-5YQ2AFRN.js",
  "chunks/videoRecorder-ZMRSVURR.js",
  "chunks/vs-BUIN4OSX.js",
  "chunks/vs-EIMLXMZ7.css",
  "chunks/wgsl-IWK4SOIV.js",
  "chunks/xml-P5DLDZCD.js",
  "chunks/xml-ZXFW3HBP.css",
  "chunks/yaml-KYGVGLAS.css",
  "chunks/yaml-MICHUXG5.js",
  "codicon-KP4OV2OO.ttf",
  "diagnostics/environment_check.lua",
  "diagnostics/shadow_overlap_compare.lua",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon.ico",
  "fonts/Inter-OFL.txt",
  "fonts/Inter-Variable.ttf",
  "fonts/NotoSansJP-OFL.txt",
  "fonts/NotoSansJP-Subset.ttf",
  "glue.wasm",
  "hb/harfbuzz.js",
  "hb/harfbuzz.wasm",
  "hb/index.mjs",
  "icon.png",
  "index.html",
  "licenses/Apache-2.0.txt",
  "licenses/MPL-2.0.txt",
  "lua_api_for_ai.md",
  "manifest.json",
  "monaco-editor.worker-HYMU3P3O.js",
  "prelude.lua",
  "prelude_drawing_path.lua",
  "sample-catalog.json",
  "style-1b4607e9bfdd.css",
  "third-party-notices.md",
  "web-main-EZTS765H.css",
  "web-main-RKQHN6RK.js"
];
const DEVELOPMENT = false;
const BUILD_ID = "6674cc1a6e36b58e";
const CACHE_PREFIX = "mt-sim-";
const kPrecacheBatchSize = 8;

async function precacheApplication() {
  const cache = await caches.open(CACHE_NAME);
  for (let index = 0; index < PRECACHE_URLS.length; index += kPrecacheBatchSize) {
    const batch = PRECACHE_URLS.slice(index, index + kPrecacheBatchSize);
    await Promise.all(batch.map(async (url) => {
      const request = new Request(new URL(url, self.registration.scope), { cache: "reload" });
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error(`failed to precache ${url}: ${response.status}`);
      }
      await cache.put(request, response);
    }));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplication());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clientsClaim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data?.type === "GET_BUILD_ID") {
    event.ports[0]?.postMessage({ buildId: BUILD_ID });
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (DEVELOPMENT) {
    return;
  }

  const url = new URL(event.request.url);

  // Serve HTML / document requests with Network-First strategy to ensure latest app frame
  if (event.request.mode === "navigate" || (event.request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "no-cache" }))
        .then(async (response) => {
          if (response.ok) {
            const copy = response.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(new URL("index.html", self.registration.scope), copy);
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) =>
            cachedResponse || caches.match(new URL("index.html", self.registration.scope))
          );
        })
    );
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.endsWith("/sw.js")) {
    return;
  }

  // Cache-First strategy for static assets (JS chunks, CSS, fonts, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, responseToCache);
        }
        return networkResponse;
      });
    })
  );
});
