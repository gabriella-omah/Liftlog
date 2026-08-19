const CACHE_NAME = "liftlog-v1";
const ASSETS = [
    // ==========================
    // HTML
    // ==========================
    "/",
    "/index.html",
    "/home.html",
    "/workouts.html",
    "/library.html",
    "/progress.html",
    "/workout.html",
    "/settings.html",
    // ==========================
    // MANIFEST
    // ==========================
    "/manifest.json",
    // ==========================
    // CSS
    // ==========================
    "/style/style.css",
    "/style/workouts.css",
    "/style/library.css",
    "/style/progress.css",
    "/style/workout.css",
    "/style/index.css",
    "/style/settings.css",
    "/style/landing.css",
    // ==========================
    // JAVASCRIPT
    // ==========================
    "/javascript/data.js",
    "/javascript/library.js",
    "/javascript/workout.js",
    "/javascript/workouts.js",
    "/javascript/home.js",
    "/javascript/streak.js",
    "/javascript/settings.js",
    "/javascript/progress.js",
    "/javascript/record.js",
    // ==========================
    // PARTIALS
    // ==========================
    "/partials/navbar.html",
    "/partials/footer.html",
    // ==========================
    // ICONS
    // ==========================
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    // ==========================
    // IMAGES
    // ==========================
    "/image/back.png",
    "/image/bicep.png",
    "/image/chest.png",
    "/image/core.png",
    "/image/calf.png",
    "/image/glute.png",
    "/image/hamstring.png",
    "/image/quads.png",
    "/image/shoulder.png",
    "/image/tricep.png",
    "/image/landing-image.jpeg"
];
// ======================================================
// INSTALL
// ======================================================
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});
// ======================================================
// ACTIVATE
// ======================================================
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});
// ======================================================
// FETCH
// ======================================================
self.addEventListener("fetch", event => {
    const request = event.request;
    // Only handle GET requests.
    if (request.method !== "GET") {
        return;
    }
    // Handle page navigation separately.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request)
                        .then(response => {
                            return response || caches.match("/home.html");
                        });
                })
        );
        return;
    }
    // Handle CSS, JS, images, icons, etc.
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request);
            })
            .catch(() => {
                return caches.match("/home.html");
            })
    );
});
