// ========================================
// LiftLog Service Worker
// sw.js
// ========================================

const CACHE_NAME = "liftlog-v1";

const APP_SHELL = [
    "/",
    "/home.html",
    "/workouts.html",
    "/workout.html",
    "/progress.html",
    "/settings.html",
    "/library.html",
    "/login.html",
    "/manifest.json"
];


// ========================================
// INSTALL
// ========================================

self.addEventListener(
    "install",
    event => {

        console.log(
            "LiftLog SW: installing"
        );

        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(APP_SHELL)
                )
                .catch(error => {

                    console.warn(
                        "LiftLog SW cache install warning:",
                        error
                    );

                })
        );

        self.skipWaiting();
    }
);


// ========================================
// ACTIVATE
// ========================================

self.addEventListener(
    "activate",
    event => {

        console.log(
            "LiftLog SW: activated"
        );

        event.waitUntil(
            Promise.all([

                caches
                    .keys()
                    .then(keys =>
                        Promise.all(
                            keys
                                .filter(
                                    key =>
                                        key !==
                                        CACHE_NAME
                                )
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )
                        )
                    ),

                self.clients.claim()

            ])
        );
    }
);


// ========================================
// FETCH
// ========================================

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;

        if (
            request.method !==
            "GET"
        ) {
            return;
        }

        event.respondWith(

            fetch(request)
                .then(response => {

                    const copy =
                        response.clone();

                    caches
                        .open(
                            CACHE_NAME
                        )
                        .then(cache => {

                            cache.put(
                                request,
                                copy
                            );

                        });

                    return response;

                })
                .catch(
                    () =>
                        caches.match(
                            request
                        )
                )
        );
    }
);


// ========================================
// PUSH
// ========================================

// ========================================
// PUSH
// ========================================

self.addEventListener(
    "push",
    event => {

        console.log(
            "LiftLog SW: PUSH EVENT RECEIVED"
        );

        event.waitUntil(

            (async () => {

                let data = {};

                // --------------------------------
                // Read push payload safely
                // --------------------------------

                if (event.data) {

                    try {

                        const rawText =
                            event.data.text();

                        console.log(
                            "LiftLog SW: RAW PUSH PAYLOAD:",
                            rawText
                        );

                        if (rawText) {

                            try {

                                data =
                                    JSON.parse(
                                        rawText
                                    );

                            } catch {

                                // DevTools may send
                                // plain text such as:
                                // "Test push message"

                                data = {
                                    title:
                                        "LiftLog",

                                    body:
                                        rawText
                                };
                            }
                        }

                    } catch (error) {

                        console.error(
                            "LiftLog SW: Could not read push payload:",
                            error
                        );

                        data = {
                            title:
                                "LiftLog",

                            body:
                                "Your workout timer has finished."
                        };
                    }
                }


                // --------------------------------
                // Notification data
                // --------------------------------

                const title =
                    data.title ||
                    "LiftLog";

                const body =
                    data.body ||
                    "Your LiftLog workout timer has finished.";

                const icon =
                    data.icon ||
                    "/icons/icon-192.png";

                const badge =
                    data.badge ||
                    "/icons/icon-192.png";

                const url =
                    data.url ||
                    "/workouts.html";


                const notificationOptions = {

                    body,

                    icon,

                    badge,

                    tag:
                        data.tag ||
                        "liftlog-workout",

                    renotify:
                        true,

                    requireInteraction:
                        true,

                    vibrate: [
                        300,
                        200,
                        300,
                        200,
                        500
                    ],

                    data: {

                        url,

                        workoutId:
                            data.workoutId ||
                            null,

                        type:
                            data.type ||
                            "workout-timer"
                    }
                };


                // ========================================
                // IN-APP MESSAGE
                // ========================================

                const clients =
                    await self.clients.matchAll({
                        type: "window",
                        includeUncontrolled: true
                    });


                for (
                    const client of clients
                ) {

                    client.postMessage({

                        type:
                            "LIFTLOG_NOTIFICATION",

                        title,

                        body,

                        url,

                        workoutId:
                            data.workoutId ||
                            null,

                        notificationType:
                            data.type ||
                            "workout-timer"

                    });
                }


                // ========================================
                // SYSTEM NOTIFICATION
                // ========================================

                await self.registration
                    .showNotification(
                        title,
                        notificationOptions
                    );


                console.log(
                    "LiftLog SW: NOTIFICATION SHOWN SUCCESSFULLY",
                    title,
                    notificationOptions
                );

            })()

        );
    }
);


// ========================================
// NOTIFICATION CLICK
// ========================================

self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        const data =
            event.notification.data ||
            {};

        const targetUrl =
            data.url ||
            "/workouts.html";

        event.waitUntil(

            self.clients
                .matchAll({
                    type:
                        "window",
                    includeUncontrolled:
                        true
                })
                .then(
                    clientList => {

                        for (
                            const client
                            of clientList
                        ) {

                            if (
                                "focus" in
                                client
                            ) {

                                client.navigate(
                                    targetUrl
                                );

                                return client
                                    .focus();
                            }
                        }

                        if (
                            self.clients.openWindow
                        ) {

                            return self.clients
                                .openWindow(
                                    targetUrl
                                );
                        }

                    }
                )

        );
    }
);


// ========================================
// SERVICE WORKER MESSAGE DEBUGGING
// ========================================

self.addEventListener(
    "message",
    event => {

        console.log(
            "LiftLog SW message:",
            event.data
        );

    }
);