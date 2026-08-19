// ========================================
// LiftLog — Shared Data & Helpers
// javascript/data.js
// ========================================


// ========================================
// DAY ORDER
// ========================================

const dayOrder = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];


// ========================================
// TIMER AUDIO
// ========================================

const workoutTimerAudio =
    new Audio("/image/sound.mp3");

workoutTimerAudio.preload = "auto";


// ========================================
// API BASE
// ========================================

const LIFTLOG_API_BASE =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://liftlog-otf6.onrender.com";


// ========================================
// SAFE LOCAL STORAGE HELPER
// ========================================

function readLiftLogCache(
    key,
    fallback
) {

    try {

        const raw =
            localStorage.getItem(key);

        return raw
            ? JSON.parse(raw)
            : fallback;

    } catch (error) {

        console.warn(
            `Invalid localStorage data for ${key}. Resetting cache.`,
            error
        );

        localStorage.removeItem(key);

        return fallback;
    }
}


// ========================================
// WORKOUTS STORAGE
// ========================================

// Supabase = source of truth
// localStorage = browser cache

let workouts =
    readLiftLogCache(
        "liftlogWorkouts",
        []
    );


// ========================================
// AUTHENTICATED API HELPER
// ========================================

async function authenticatedFetch(
    url,
    options = {}
) {

    if (
        typeof getLiftLogSession !==
        "function"
    ) {

        console.error(
            "Session manager is not loaded."
        );

        window.location.replace(
            "login.html"
        );

        throw new Error(
            "Session manager is not loaded."
        );
    }

    const session =
        getLiftLogSession();

    if (
        !session ||
        !session.access_token
    ) {

        console.error(
            "No authenticated LiftLog session."
        );

        window.location.replace(
            "login.html"
        );

        throw new Error(
            "Not authenticated."
        );
    }

    const headers = {
        ...(options.headers || {}),
        "Authorization":
            `Bearer ${session.access_token}`,
        "Content-Type":
            "application/json"
    };

    let response;

    try {

        response =
            await fetch(
                url,
                {
                    ...options,
                    headers
                }
            );

    } catch (error) {

        console.error(
            "Authenticated fetch failed:",
            error
        );

        throw error;
    }

    if (
        response.status === 401
    ) {

        console.error(
            "LiftLog session expired or rejected."
        );

        localStorage.removeItem(
            "liftlogSession"
        );

        localStorage.removeItem(
            "liftlogUser"
        );

        localStorage.removeItem(
            "liftlogWorkouts"
        );

        window.location.replace(
            "login.html"
        );

        throw new Error(
            "Session expired."
        );
    }

    return response;
}


// ========================================
// SYNC WORKOUTS FROM SUPABASE
// ========================================

async function syncWorkouts() {

    try {

        const response =
            await authenticatedFetch(
                `${LIFTLOG_API_BASE}/api/workouts`,
                {
                    method: "GET"
                }
            );

        const responseText =
            await response.text();

        if (!response.ok) {

            console.error(
                "Workout API error:",
                {
                    status:
                        response.status,

                    statusText:
                        response.statusText,

                    body:
                        responseText
                }
            );

            throw new Error(
                `Failed to load workouts: ${response.status} ${response.statusText}`
            );
        }

        let serverWorkouts = [];

        try {

            serverWorkouts =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : [];

        } catch (error) {

            console.error(
                "Invalid JSON returned by workout API:",
                responseText
            );

            throw new Error(
                "Workout API did not return valid JSON."
            );
        }

        if (
            !Array.isArray(
                serverWorkouts
            )
        ) {

            console.error(
                "Unexpected workout API response:",
                serverWorkouts
            );

            throw new Error(
                "Workout API returned an invalid workout list."
            );
        }

        workouts =
            serverWorkouts.map(
                workout => {

                    const normalized = {
                        ...workout
                    };

                    // --------------------------------
                    // BASIC DATA
                    // --------------------------------

                    normalized.name =
                        capitalizeWorkoutName(
                            workout.name
                        );

                    normalized.day =
                        workout.day ||
                        null;

                    normalized.category =
                        workout.category ||
                        null;

                    normalized.goal =
                        workout.goal ||
                        null;

                    normalized.difficulty =
                        workout.difficulty ||
                        null;

                    // --------------------------------
                    // DATE ALIASES
                    // --------------------------------

                    normalized.scheduledDate =
                        workout.scheduled_date ??
                        workout.scheduledDate ??
                        null;

                    normalized.completedDate =
                        workout.completed_date ??
                        workout.completedDate ??
                        null;

                    normalized.startTime =
                        workout.start_time ??
                        workout.startTime ??
                        null;

                    normalized.missedDate =
                        workout.missed_date ??
                        workout.missedDate ??
                        null;

                    // --------------------------------
                    // TIMER ALIASES
                    // --------------------------------

                    normalized.duration =
                        Number(
                            workout.duration
                        ) || 0;

                    normalized.durationSeconds =
                        Number(
                            workout.duration_seconds ??
                            workout.durationSeconds ??
                            0
                        );

                    normalized.actualDurationSeconds =
                        Number(
                            workout.actual_duration_seconds ??
                            workout.actualDurationSeconds ??
                            0
                        );

                    normalized.actualDurationMinutes =
                        Number(
                            workout.actual_duration_minutes ??
                            workout.actualDurationMinutes ??
                            0
                        );

                    normalized.totalPausedSeconds =
                        Number(
                            workout.total_paused_seconds ??
                            workout.totalPausedSeconds ??
                            0
                        );

                    normalized.pausedAt =
                        workout.paused_at ??
                        workout.pausedAt ??
                        null;

                    normalized.sessionStatus =
                        workout.session_status ??
                        workout.sessionStatus ??
                        "scheduled";

                    // --------------------------------
                    // MISSED
                    // --------------------------------

                    normalized.missed =
                        Boolean(
                            workout.missed
                        );

                    // --------------------------------
                    // SERVER TIMER
                    // --------------------------------

                    normalized.timerEndAt =
                        workout.timer_end_at ??
                        workout.timerEndAt ??
                        null;

                    normalized.timerRemainingSeconds =
                        Number(
                            workout.timer_remaining_seconds ??
                            workout.timerRemainingSeconds ??
                            0
                        );

                    normalized.timerPaused =
                        Boolean(
                            workout.timer_paused ??
                            workout.timerPaused
                        );

                    normalized.notificationSent =
                        Boolean(
                            workout.notification_sent ??
                            workout.notificationSent
                        );

                    // --------------------------------
                    // EXERCISES
                    // --------------------------------

                    normalized.exercises =
                        Array.isArray(
                            workout.exercises
                        )
                            ? workout.exercises
                            : [];

                    normalized.exerciseCount =
                        Number(
                            workout.exercise_count ??
                            workout.exerciseCount ??
                            normalized.exercises.length
                        );

                    // --------------------------------
                    // COMPLETION
                    // --------------------------------

                    normalized.completed =
                        Boolean(
                            workout.completed
                        ) ||
                        Boolean(
                            normalized.completedDate
                        );

                    // --------------------------------
                    // STATUS NORMALIZATION
                    // --------------------------------

                    if (
                        normalized.completed
                    ) {

                        normalized.sessionStatus =
                            "completed";

                        normalized.missed =
                            false;

                    } else if (
                        normalized.missed
                    ) {

                        normalized.sessionStatus =
                            "missed";

                    } else if (
                        normalized.sessionStatus ===
                        "paused"
                    ) {

                        normalized.timerPaused =
                            true;

                    } else if (
                        normalized.sessionStatus ===
                        "in_progress"
                    ) {

                        normalized.timerPaused =
                            false;

                    } else {

                        normalized.sessionStatus =
                            "scheduled";
                    }

                    return normalized;
                }
            );

        saveWorkouts();

        console.log(
            "User workouts loaded from Supabase:",
            workouts
        );

        return workouts;

    } catch (error) {

        console.error(
            "Failed to sync workouts:",
            error
        );

        if (
            !Array.isArray(
                workouts
            )
        ) {

            workouts = [];
        }

        return workouts;
    }
}


// ========================================
// SAVE WORKOUT CACHE
// ========================================

function saveWorkouts() {

    try {

        localStorage.setItem(
            "liftlogWorkouts",
            JSON.stringify(
                Array.isArray(
                    workouts
                )
                    ? workouts
                    : []
            )
        );

    } catch (error) {

        console.error(
            "Failed to cache workouts locally:",
            error
        );
    }
}


// ========================================
// SORTED WORKOUTS
// ========================================

function getSortedWorkouts() {

    return [
        ...workouts
    ].sort(
        (a, b) => {

            return (
                dayOrder.indexOf(
                    a.day
                ) -
                dayOrder.indexOf(
                    b.day
                )
            );
        }
    );
}


// ========================================
// PERSONAL RECORDS
// ========================================

let personalRecordsData =
    readLiftLogCache(
        "liftlogRecords",
        {}
    );


function savePersonalRecords() {

    try {

        localStorage.setItem(
            "liftlogRecords",
            JSON.stringify(
                personalRecordsData
            )
        );

    } catch (error) {

        console.error(
            "Failed to save personal records:",
            error
        );
    }
}


// ========================================
// WEIGHT UNIT HELPERS
// ========================================

let weightUnit =
    localStorage.getItem(
        "weightUnit"
    ) || "kg";


function formatWeight(
    weightKg
) {

    const numeric =
        Number(
            weightKg
        ) || 0;

    if (
        numeric <= 0
    ) {
        return "0";
    }

    const value =
        weightUnit === "kg"
            ? numeric
            : numeric * 2.20462;

    return Number(
        value.toFixed(1)
    ).toString();
}


function convertToKg(
    value
) {

    const numeric =
        Number(
            value
        ) || 0;

    return weightUnit === "kg"
        ? numeric
        : numeric / 2.20462;
}


function convertFromKg(
    valueKg
) {

    const numeric =
        Number(
            valueKg
        ) || 0;

    return weightUnit === "kg"
        ? numeric.toFixed(1)
        : (
            numeric * 2.20462
        ).toFixed(1);
}


// ========================================
// TEXT HELPERS
// ========================================

function capitalizeWorkoutName(
    value
) {

    const text =
        String(
            value || ""
        ).trim();

    if (!text) {
        return "";
    }

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


// ========================================
// RECOMMENDED WORKOUT PLANS
// ========================================

const workoutPlans = {

    muscleGain: {

        title:
            "Muscle Gain",

        days: {

            Monday: {
                title: "Chest",
                exercises: [
                    1,
                    44,
                    2,
                    45,
                    5
                ]
            },

            Tuesday: {
                title: "Legs",
                exercises: [
                    11,
                    10,
                    47,
                    13,
                    16
                ]
            },

            Wednesday: {
                title: "Rest",
                exercises: []
            },

            Thursday: {
                title: "Back",
                exercises: [
                    18,
                    19,
                    20,
                    21,
                    22
                ]
            },

            Friday: {
                title: "Shoulders",
                exercises: [
                    25,
                    26,
                    27,
                    28,
                    29
                ]
            },

            Saturday: {
                title: "Arms",
                exercises: [
                    31,
                    32,
                    33,
                    34,
                    37
                ]
            },

            Sunday: {
                title: "Rest",
                exercises: []
            }
        }
    },

    weightLoss: {

        title:
            "Weight Loss",

        days: {

            Monday: {
                title:
                    "Cardio + Full Body",
                exercises: [
                    51,
                    58,
                    59,
                    11,
                    18
                ]
            },

            Tuesday: {
                title: "Rest",
                exercises: []
            },

            Wednesday: {
                title:
                    "HIIT + Core",
                exercises: [
                    53,
                    57,
                    38,
                    39,
                    40
                ]
            },

            Thursday: {
                title: "Rest",
                exercises: []
            },

            Friday: {
                title:
                    "Cardio Circuit",
                exercises: [
                    54,
                    56,
                    58,
                    59
                ]
            },

            Saturday: {
                title:
                    "Active Recovery",
                exercises: [
                    51,
                    52,
                    38,
                    17
                ]
            },

            Sunday: {
                title: "Rest",
                exercises: []
            }
        }
    },

    gluteGrowth: {

        title:
            "Glute Growth",

        days: {

            Monday: {
                title:
                    "Glute Focus",
                exercises: [
                    6,
                    48,
                    17,
                    8,
                    7
                ]
            },

            Tuesday: {
                title: "Rest",
                exercises: []
            },

            Wednesday: {
                title:
                    "Legs + Glutes",
                exercises: [
                    9,
                    13,
                    49,
                    47,
                    16
                ]
            },

            Thursday: {
                title: "Rest",
                exercises: []
            },

            Friday: {
                title:
                    "Glute Pump",
                exercises: [
                    6,
                    7,
                    48,
                    8,
                    50
                ]
            },

            Saturday: {
                title:
                    "Lower Body",
                exercises: [
                    11,
                    9,
                    17,
                    49,
                    16
                ]
            },

            Sunday: {
                title: "Rest",
                exercises: []
            }
        }
    },

    strength: {

        title:
            "Strength",

        days: {

            Monday: {
                title:
                    "Power Lower",
                exercises: [
                    11,
                    12,
                    48
                ]
            },

            Tuesday: {
                title:
                    "Power Upper",
                exercises: [
                    1,
                    25,
                    20,
                    18
                ]
            },

            Wednesday: {
                title: "Rest",
                exercises: []
            },

            Thursday: {
                title:
                    "Lower Strength",
                exercises: [
                    11,
                    47,
                    7,
                    16
                ]
            },

            Friday: {
                title: "Rest",
                exercises: []
            },

            Saturday: {
                title:
                    "Full Power",
                exercises: [
                    12,
                    1,
                    25,
                    20
                ]
            },

            Sunday: {
                title: "Rest",
                exercises: []
            }
        }
    }
};


// ========================================
// GET WORKOUT EXERCISES
// ========================================

const getWorkoutExercises = (
    exerciseIds,
    library
) => {

    if (
        !Array.isArray(
            exerciseIds
        ) ||
        !Array.isArray(
            library
        )
    ) {
        return [];
    }

    return exerciseIds
        .map(
            id =>
                library.find(
                    exercise =>
                        exercise.id === id
                )
        )
        .filter(Boolean);
};


// ========================================
// DISPLAY EXERCISES
// ========================================

function displayExercises(
    list,
    container
) {

    if (!container) {
        return;
    }

    if (
        !Array.isArray(
            list
        ) ||
        list.length === 0
    ) {

        container.innerHTML = `
            <div class="text-center py-4">
                No exercises found.
            </div>
        `;

        return;
    }

    container.innerHTML =
        "";

    const isWorkoutPage =
        container.id ===
        "exerciseResults";

    list.forEach(
        exercise => {

            if (
                isWorkoutPage
            ) {

                container.innerHTML += `
                    <section
                        class="exercise-card compact-exercise-card"
                        data-id="${exercise.id}"
                    >

                        <div
                            class="card-body d-flex justify-content-between align-items-center"
                        >

                            <div class="exercise-info">

                                <h5 class="mb-1">
                                    ${exercise.name}
                                </h5>

                                <small class="text-muted">
                                    ${exercise.muscle || ""}

                                    ${
                                        exercise.equipment
                                            ? " • " +
                                              exercise.equipment
                                            : ""
                                    }
                                </small>

                            </div>

                            <button
                                class="btn btn-primary btn-sm viewExerciseBtn"
                                type="button"
                                data-id="${exercise.id}"
                            >
                                Add
                            </button>

                        </div>

                    </section>
                `;

            } else {

                container.innerHTML += `
                    <section
                        class="exercise-card"
                        data-id="${exercise.id}"
                    >

                        <div class="card-body">

                            <div class="exercise-info">

                                <h4>
                                    ${exercise.name}
                                </h4>

                                <p
                                    class="muscle-badge ${
                                        String(
                                            exercise.muscle ||
                                            ""
                                        )
                                            .toLowerCase()
                                            .replace(
                                                /\s+/g,
                                                "-"
                                            )
                                    }"
                                >
                                    ${exercise.muscle || ""}
                                </p>

                                <small>
                                    ${exercise.equipment || ""}
                                    •
                                    ${exercise.type || ""}
                                    •
                                    ${exercise.difficulty || ""}
                                </small>

                                <button
                                    class="btn btn-primary mt-3 w-100 viewExerciseBtn"
                                    type="button"
                                    data-id="${exercise.id}"
                                >
                                    View Exercise
                                </button>

                            </div>

                        </div>

                    </section>
                `;
            }
        }
    );

    if (
        typeof attachExerciseEvents ===
        "function"
    ) {

        attachExerciseEvents();
    }
}


// ========================================
// IMAGE VIEWER
// ========================================

const imageViewer =
    document.getElementById(
        "imageViewer"
    );

const imageViewerImg =
    document.getElementById(
        "imageViewerImg"
    );

const closeImageViewerBtn =
    document.getElementById(
        "closeImageViewer"
    );


function openImageViewer(
    src,
    alt = "Exercise image"
) {

    if (
        !imageViewer ||
        !imageViewerImg
    ) {
        return;
    }

    if (
        !src ||
        src.endsWith("/") ||
        src.includes(
            "library.html"
        )
    ) {
        return;
    }

    imageViewerImg.src =
        src;

    imageViewerImg.alt =
        alt;

    imageViewer.classList.remove(
        "d-none"
    );

    document.body.style.overflow =
        "hidden";
}


function closeImageViewer() {

    if (
        !imageViewer ||
        !imageViewerImg
    ) {
        return;
    }

    imageViewer.classList.add(
        "d-none"
    );

    imageViewerImg.removeAttribute(
        "src"
    );

    document.body.style.overflow =
        "";
}


document.addEventListener(
    "click",
    event => {

        const img =
            event.target.closest(
                "#exerciseBody img, #exerciseMuscleImage, .exercise-images img"
            );

        if (!img) {
            return;
        }

        const src =
            img.currentSrc ||
            img.src;

        if (!src) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        openImageViewer(
            src,
            img.alt ||
                "Exercise image"
        );
    }
);


if (
    closeImageViewerBtn
) {

    closeImageViewerBtn.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            closeImageViewer();
        }
    );
}


if (
    imageViewer
) {

    imageViewer.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                imageViewer
            ) {

                closeImageViewer();
            }
        }
    );
}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeImageViewer();
        }
    }
);


// ========================================
// TOAST
// ========================================

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "exerciseToast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    if (
        !toast ||
        !toastMessage
    ) {
        return;
    }

    toastMessage.textContent =
        message;

    toast.classList.remove(
        "toast-success",
        "toast-warning",
        "toast-error"
    );

    switch (type) {

        case "warning":

            toast.classList.add(
                "toast-warning"
            );

            break;

        case "error":

            toast.classList.add(
                "toast-error"
            );

            break;

        default:

            toast.classList.add(
                "toast-success"
            );

            break;
    }

    bootstrap.Toast
        .getOrCreateInstance(
            toast,
            {
                autohide: true,
                delay: 5000
            }
        )
        .show();
}


// ========================================
// DARK MODE & THEME
// ========================================

function updateBrowserTheme() {

    const themeMeta =
        document.querySelector(
            'meta[name="theme-color"]'
        );

    if (!themeMeta) {
        return;
    }

    themeMeta.setAttribute(
        "content",
        document.body.classList.contains(
            "dark-mode"
        )
            ? "#141821"
            : "#5D8CFF"
    );
}


function initializeTheme() {

    if (
        localStorage.getItem(
            "darkMode"
        ) === "true"
    ) {

        document.body.classList.add(
            "dark-mode"
        );
    }

    updateBrowserTheme();

    const darkModeSwitch =
        document.getElementById(
            "darkModeSwitch"
        );

    if (!darkModeSwitch) {
        return;
    }

    darkModeSwitch.checked =
        localStorage.getItem(
            "darkMode"
        ) === "true";

    darkModeSwitch.addEventListener(
        "change",
        () => {

            document.body.classList.toggle(
                "dark-mode"
            );

            localStorage.setItem(
                "darkMode",
                document.body.classList.contains(
                    "dark-mode"
                )
            );

            updateBrowserTheme();
        }
    );
}


// ========================================
// ACTIVE WORKOUT TIMER
// ========================================

let activeWorkoutTimer =
    readLiftLogCache(
        "activeWorkoutTimer",
        null
    );


// ========================================
// SERVICE WORKER
// ========================================

let liftLogServiceWorkerRegistration =
    null;


async function registerLiftLogServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {

        console.warn(
            "Service workers are not supported."
        );

        return null;
    }

    try {

        const registration =
            await navigator.serviceWorker.register(
                "/sw.js",
                {
                    scope: "/"
                }
            );

        liftLogServiceWorkerRegistration =
            registration;

        console.log(
            "LiftLog service worker registered:",
            registration.scope
        );

        return registration;

    } catch (error) {

        console.error(
            "LiftLog service worker registration failed:",
            error
        );

        return null;
    }
}


async function getLiftLogServiceWorker() {

    if (
        liftLogServiceWorkerRegistration
    ) {

        return liftLogServiceWorkerRegistration;
    }

    if (
        !("serviceWorker" in navigator)
    ) {

        return null;
    }

    try {

        const registration =
            await navigator.serviceWorker.ready;

        liftLogServiceWorkerRegistration =
            registration;

        return registration;

    } catch (error) {

        console.error(
            "LiftLog service worker unavailable:",
            error
        );

        return null;
    }
}

function urlBase64ToUint8Array(
    base64String
) {

    const padding =
        "=".repeat(
            (
                4 -
                base64String.length % 4
            ) % 4
        );

    const base64 =
        (
            base64String +
            padding
        )
            .replace(
                /-/g,
                "+"
            )
            .replace(
                /_/g,
                "/"
            );

    const rawData =
        window.atob(
            base64
        );

    const outputArray =
        new Uint8Array(
            rawData.length
        );

    for (
        let i = 0;
        i < rawData.length;
        i++
    ) {

        outputArray[i] =
            rawData.charCodeAt(i);
    }

    return outputArray;

}


// ========================================
// NOTIFICATION PERMISSION
// ========================================

async function ensureNotificationPermission() {

    if (
        !("Notification" in window)
    ) {

        console.warn(
            "Notifications are not supported."
        );

        return false;
    }

    if (
        Notification.permission ===
        "granted"
    ) {

        return true;
    }

    if (
        Notification.permission ===
        "denied"
    ) {

        return false;
    }

    try {

        const permission =
            await Notification.requestPermission();

        return (
            permission ===
            "granted"
        );

    } catch (error) {

        console.error(
            "Notification permission request failed:",
            error
        );

        return false;
    }
}


// ========================================
// AUDIO UNLOCK
// ========================================

function unlockWorkoutAudio() {

    if (
        !workoutTimerAudio
    ) {
        return;
    }

    try {

        workoutTimerAudio.muted =
            true;

        workoutTimerAudio.currentTime =
            0;

        const promise =
            workoutTimerAudio.play();

        if (
            promise &&
            typeof promise.then ===
                "function"
        ) {

            promise
                .then(
                    () => {

                        workoutTimerAudio.pause();

                        workoutTimerAudio.currentTime =
                            0;

                        workoutTimerAudio.muted =
                            false;
                    }
                )
                .catch(
                    () => {

                        workoutTimerAudio.muted =
                            false;
                    }
                );
        }

    } catch (error) {

        console.warn(
            "Workout timer audio unlock failed:",
            error
        );
    }
}


// ========================================
// ACTIVE TIMER CACHE
// ========================================

function saveActiveWorkoutTimer() {

    if (
        activeWorkoutTimer
    ) {

        localStorage.setItem(
            "activeWorkoutTimer",
            JSON.stringify(
                activeWorkoutTimer
            )
        );

    } else {

        localStorage.removeItem(
            "activeWorkoutTimer"
        );
    }
}


// ========================================
// START LOCAL TIMER
// ========================================

function startWorkoutTimer(
    workout
) {

    if (!workout) {
        return;
    }

    // Critical:
    // this function is called by the user's
    // Start button interaction.

    unlockWorkoutAudio();

    activeWorkoutTimer = {

        workoutId:
            workout.id,

        startTime:
            Date.now(),

        durationMinutes:
            Number(
                workout.duration
            ) || 60,

        alerted:
            false,

        paused:
            false,

        pausedAt:
            null,

        elapsedBeforePause:
            0
    };

    saveActiveWorkoutTimer();

    ensureNotificationPermission();

    checkWorkoutTimer();
}


// ========================================
// PAUSE LOCAL TIMER
// ========================================

function pauseWorkoutTimer() {

    if (
        !activeWorkoutTimer ||
        activeWorkoutTimer.paused
    ) {
        return;
    }

    activeWorkoutTimer.paused =
        true;

    activeWorkoutTimer.pausedAt =
        Date.now();

    activeWorkoutTimer.elapsedBeforePause =
        Math.floor(
            (
                Date.now() -
                activeWorkoutTimer.startTime
            ) / 1000
        );

    saveActiveWorkoutTimer();
}


// ========================================
// RESUME LOCAL TIMER
// ========================================

function resumeWorkoutTimer() {

    if (
        !activeWorkoutTimer ||
        !activeWorkoutTimer.paused
    ) {
        return;
    }

    unlockWorkoutAudio();

    const pausedSeconds =
        Number(
            activeWorkoutTimer
                .elapsedBeforePause
        ) || 0;

    activeWorkoutTimer.startTime =
        Date.now() -
        (
            pausedSeconds *
            1000
        );

    activeWorkoutTimer.paused =
        false;

    activeWorkoutTimer.pausedAt =
        null;

    activeWorkoutTimer.alerted =
        false;

    saveActiveWorkoutTimer();
}


// ========================================
// STOP LOCAL TIMER
// ========================================

function stopWorkoutTimer() {

    activeWorkoutTimer =
        null;

    localStorage.removeItem(
        "activeWorkoutTimer"
    );
}


// ========================================
// LOCAL TIMER ELAPSED
// ========================================

function getTimerElapsedSeconds() {

    if (
        !activeWorkoutTimer
    ) {
        return 0;
    }

    if (
        activeWorkoutTimer.paused
    ) {

        return Number(
            activeWorkoutTimer
                .elapsedBeforePause
        ) || 0;
    }

    return Math.max(
        0,
        Math.floor(
            (
                Date.now() -
                activeWorkoutTimer.startTime
            ) / 1000
        )
    );
}


// ========================================
// PUSH SUBSCRIPTION
// ========================================

function urlBase64ToUint8Array(
    base64String
) {

    const padding =
        "=".repeat(
            (
                4 -
                (
                    base64String.length %
                    4
                )
            ) % 4
        );

    const base64 =
        (
            base64String +
            padding
        )
            .replace(
                /-/g,
                "+"
            )
            .replace(
                /_/g,
                "/"
            );

    const rawData =
        window.atob(
            base64
        );

    const outputArray =
        new Uint8Array(
            rawData.length
        );

    for (
        let i = 0;
        i < rawData.length;
        i++
    ) {

        outputArray[i] =
            rawData.charCodeAt(i);
    }

    return outputArray;
}


async function subscribeToLiftLogPush() {

    if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
    ) {

        console.warn(
            "Push notifications are not supported."
        );

        return false;
    }

    const permission =
        await ensureNotificationPermission();

    if (!permission) {

        console.warn(
            "Notification permission was not granted."
        );

        return false;
    }

    try {

        await registerLiftLogServiceWorker();

        const registration =
            await navigator.serviceWorker.ready;

        let subscription =
            await registration.pushManager
                .getSubscription();

        if (!subscription) {

            const response =
                await authenticatedFetch(
                    `${LIFTLOG_API_BASE}/api/push/public-key`,
                    {
                        method: "GET"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Failed to retrieve VAPID public key."
                );
            }

            const result =
                await response.json();

            if (
                !result.publicKey
            ) {

                throw new Error(
                    "Push public key missing."
                );
            }

            const applicationServerKey =
                urlBase64ToUint8Array(
                    result.publicKey
                );

            subscription =
                await registration
                    .pushManager
                    .subscribe({
                        userVisibleOnly:
                            true,

                        applicationServerKey
                    });
        }

        const subscriptionPayload =
            subscription.toJSON();

        const saveResponse =
            await authenticatedFetch(
                `${LIFTLOG_API_BASE}/api/push/subscribe`,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            subscriptionPayload
                        )
                }
            );

        if (!saveResponse.ok) {

            const errorText =
                await saveResponse.text();

            throw new Error(
                `Failed to save push subscription: ${errorText}`
            );
        }

        console.log(
            "LiftLog push subscription saved."
        );

        return true;

    } catch (error) {

        console.error(
            "Push subscription failed:",
            error
        );

        return false;
    }
}


// ========================================
// SERVER-SIDE PUSH TEST
// ========================================

async function requestWorkoutPushTest() {

    try {

        const registration =
            await getLiftLogServiceWorker();

        if (!registration) {
            return false;
        }

        const permission =
            await ensureNotificationPermission();

        if (!permission) {
            return false;
        }

        await registration.showNotification(
            "LiftLog Test Notification",
            {
                body:
                    "LiftLog notifications are working.",

                icon:
                    "/icons/icon-192.png",

                badge:
                    "/icons/icon-192.png",

                tag:
                    "liftlog-test",

                requireInteraction:
                    true,

                vibrate: [
                    300,
                    200,
                    300
                ],

                data: {
                    type:
                        "test"
                }
            }
        );

        return true;

    } catch (error) {

        console.error(
            "LiftLog test notification failed:",
            error
        );

        return false;
    }
}


// ========================================
// NEXT SCHEDULED WORKOUT
// ========================================

function getNextScheduledWorkoutDate() {

    const today =
        getToday();

    const futureWorkouts =
        Array.isArray(
            workouts
        )
            ? workouts
                .filter(
                    workout => {

                        if (
                            workout.completed ||
                            workout.missed
                        ) {
                            return false;
                        }

                        const scheduled =
                            getWorkoutScheduledDate(
                                workout
                            );

                        if (!scheduled) {
                            return false;
                        }

                        return (
                            scheduled.getTime() >
                            today.getTime()
                        );
                    }
                )
                .map(
                    workout => ({
                        workout,
                        date:
                            getWorkoutScheduledDate(
                                workout
                            )
                    })
                )
                .filter(
                    item =>
                        item.date
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.date.getTime() -
                        b.date.getTime()
                )
            : [];

    return futureWorkouts.length
        ? futureWorkouts[0].date
        : null;
}


// ========================================
// BANNER EXPIRATION
// ========================================

function getWorkoutBannerExpiryTime() {

    const now =
        Date.now();

    // Maximum banner lifetime:
    // 20 hours.

    const maxExpiry =
        now +
        (
            20 *
            60 *
            60 *
            1000
        );

    const nextWorkoutDate =
        getNextScheduledWorkoutDate();

    if (
        !nextWorkoutDate
    ) {

        return maxExpiry;
    }

    const nextWorkoutStart =
        new Date(
            nextWorkoutDate
        );

    nextWorkoutStart.setHours(
        0,
        0,
        0,
        0
    );

    return Math.min(
        maxExpiry,
        nextWorkoutStart.getTime()
    );
}


// ========================================
// FINISHED BANNER
// ========================================

function createWorkoutFinishedBanner(
    workoutId,
    message
) {

    const expiresAt =
        getWorkoutBannerExpiryTime();

    localStorage.setItem(
        "workoutFinished",
        JSON.stringify({
            workoutId,

            finished:
                true,

            time:
                Date.now(),

            expiresAt,

            message
        })
    );

    checkWorkoutBanner();

    window.dispatchEvent(
        new StorageEvent(
            "storage",
            {
                key:
                    "workoutFinished"
            }
        )
    );
}


// ========================================
// PWA NOTIFICATION
// ========================================

async function showWorkoutPwaNotification(
    title,
    body,
    workoutId
) {

    const permissionGranted =
        await ensureNotificationPermission();

    if (!permissionGranted) {
        return false;
    }

    const registration =
        await getLiftLogServiceWorker();

    if (!registration) {
        return false;
    }

    try {

        await registration.showNotification(
            title,
            {

                body,

                icon:
                    "/icons/icon-192.png",

                badge:
                    "/icons/icon-192.png",

                tag:
                    "liftlog-workout-timer",

                renotify:
                    true,

                requireInteraction:
                    true,

                vibrate: [
                    300,
                    200,
                    300,
                    200,
                    600
                ],

                data: {

                    type:
                        "workout-timer",

                    workoutId,

                    url:
                        workoutId
                            ? `/workout.html?id=${workoutId}`
                            : "/workouts.html"
                }
            }
        );

        return true;

    } catch (error) {

        console.error(
            "PWA notification failed:",
            error
        );

        return false;
    }
}


// ========================================
// TIMER FINISHED
// ========================================

async function showWorkoutNotification() {

    if (
        !activeWorkoutTimer
    ) {
        return;
    }

    const workoutId =
        activeWorkoutTimer.workoutId;

    const workout =
        workouts.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    workoutId
                )
        );

    const title =
        "Workout Timer Finished";

    const body =
        workout
            ? `${workout.name || "Workout"} has reached its planned time.`
            : "Your workout timer has finished.";


    // ------------------------------------
    // PLAY SOUND WHILE PAGE IS ACTIVE
    // ------------------------------------

    try {

        workoutTimerAudio.currentTime =
            0;

        workoutTimerAudio.muted =
            false;

        await workoutTimerAudio.play();

    } catch (error) {

        console.warn(
            "Timer audio unavailable:",
            error
        );
    }


    // ------------------------------------
    // VIBRATION WHILE PAGE IS ACTIVE
    // ------------------------------------

    if (
        "vibrate" in navigator
    ) {

        try {

            navigator.vibrate([
                300,
                200,
                300,
                200,
                500
            ]);

        } catch (error) {

            console.warn(
                "Vibration unavailable:",
                error
            );
        }
    }


    // ------------------------------------
    // PWA NOTIFICATION
    // ------------------------------------

    await showWorkoutPwaNotification(
        title,
        body,
        workoutId
    );


    // ------------------------------------
    // IN-APP BANNER
    // ------------------------------------

    createWorkoutFinishedBanner(
        workoutId,
        body
    );


    // ------------------------------------
    // STOP TIMER
    // ------------------------------------

    stopWorkoutTimer();
}


// ========================================
// CHECK LOCAL TIMER
// ========================================

function checkWorkoutTimer() {

    if (
        !activeWorkoutTimer ||
        activeWorkoutTimer.paused ||
        activeWorkoutTimer.alerted
    ) {
        return;
    }

    const elapsed =
        getTimerElapsedSeconds();

    const durationSeconds =
        (
            Number(
                activeWorkoutTimer
                    .durationMinutes
            ) || 60
        ) *
        60;

    if (
        elapsed >=
        durationSeconds
    ) {

        activeWorkoutTimer.alerted =
            true;

        saveActiveWorkoutTimer();

        showWorkoutNotification();
    }
}


// ========================================
// CHECK FINISHED BANNER
// ========================================

function checkWorkoutBanner() {

    const banner =
        document.getElementById(
            "globalWorkoutBanner"
        );

    const finished =
        readLiftLogCache(
            "workoutFinished",
            null
        );

    if (!finished) {

        if (banner) {
            banner.classList.add(
                "hidden"
            );
        }

        return;
    }

    if (
        finished.expiresAt &&
        Date.now() >=
            Number(
                finished.expiresAt
            )
    ) {

        localStorage.removeItem(
            "workoutFinished"
        );

        if (banner) {
            banner.classList.add(
                "hidden"
            );
        }

        return;
    }

    if (banner) {

        banner.classList.remove(
            "hidden"
        );
    }
}


// ========================================
// DISMISS BANNER
// ========================================

function dismissWorkoutBanner() {

    localStorage.removeItem(
        "workoutFinished"
    );

    checkWorkoutBanner();
}


// ========================================
// NAVBAR
// ========================================

async function loadNavbar() {

    const placeholder =
        document.getElementById(
            "navbar-placeholder"
        );

    if (!placeholder) {
        return;
    }

    try {

        const response =
            await fetch(
                "/partials/navbar.html"
            );

        if (!response.ok) {

            throw new Error(
                "Navbar could not be loaded."
            );
        }

        placeholder.innerHTML =
            await response.text();

        updateNavbarProfile();

        checkWorkoutBanner();

    } catch (error) {

        console.error(
            "Navbar load failed:",
            error
        );
    }
}


// ========================================
// FOOTER
// ========================================

async function loadFooter() {

    const footerPlaceholder =
        document.getElementById(
            "footer-placeholder"
        );

    if (!footerPlaceholder) {
        return;
    }

    try {

        const response =
            await fetch(
                "/partials/footer.html"
            );

        if (!response.ok) {

            throw new Error(
                "Failed to load footer."
            );
        }

        footerPlaceholder.innerHTML =
            await response.text();

    } catch (error) {

        console.error(
            "Footer load failed:",
            error
        );
    }
}


// ========================================
// NAVBAR PROFILE
// ========================================

function updateNavbarProfile() {

    const headerAvatar =
        document.getElementById(
            "headerAvatar"
        );

    if (!headerAvatar) {
        return;
    }

    let name = "";

    try {

        if (
            typeof getLiftLogUser ===
            "function"
        ) {

            const authUser =
                getLiftLogUser();

            name =
                authUser?.name ||
                authUser?.user_metadata?.name ||
                "";
        }

    } catch (error) {

        console.warn(
            "Could not read authenticated user profile:",
            error
        );
    }

    if (!name) {

        const profile =
            readLiftLogCache(
                "profile",
                null
            );

        name =
            profile?.name ||
            "";
    }

    if (name) {

        const initials =
            String(
                name
            )
                .trim()
                .split(
                    /\s+/
                )
                .filter(Boolean)
                .map(
                    word =>
                        word.charAt(0)
                )
                .join("")
                .substring(
                    0,
                    2
                )
                .toUpperCase();

        headerAvatar.textContent =
            initials || "G";

    } else {

        headerAvatar.textContent =
            "G";
    }
}


// ========================================
// DATE HELPERS
// ========================================

function getToday() {

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    return today;
}


function getStartOfWeek(
    date = new Date()
) {

    const d =
        new Date(
            date
        );

    d.setHours(
        0,
        0,
        0,
        0
    );

    d.setDate(
        d.getDate() -
        d.getDay()
    );

    return d;
}


function getEndOfWeek(
    date = new Date()
) {

    const end =
        getStartOfWeek(
            date
        );

    end.setDate(
        end.getDate() +
        7
    );

    return end;
}


function parseLocalDate(value) {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const d = new Date(value);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    const str = String(value).trim().slice(0, 10); // "YYYY-MM-DD"
    const parts = str.split("-").map(Number);

    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) {
        return null;
    }

    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day); // local midnight
    d.setHours(0, 0, 0, 0);
    return d;
}

function getToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWorkoutScheduledDate(workout) {
    if (!workout) return null;

    return parseLocalDate(
        workout.scheduledDate ||
        workout.scheduled_date ||
        null
    );
}


function getScheduledDateForDay(
    dayName,
    referenceDate = new Date()
) {

    if (!dayName) {
        return null;
    }

    const dayIndex = {

        Sunday: 0,

        Monday: 1,

        Tuesday: 2,

        Wednesday: 3,

        Thursday: 4,

        Friday: 5,

        Saturday: 6
    };

    const offset =
        dayIndex[
            dayName
        ];

    if (
        offset ===
        undefined
    ) {
        return null;
    }

    const start =
        getStartOfWeek(
            referenceDate
        );

    const scheduled =
        new Date(
            start
        );

    scheduled.setDate(
        start.getDate() +
        offset
    );

    scheduled.setHours(
        0,
        0,
        0,
        0
    );

    const today =
        getToday();

    // Keep recurring weekday behaviour:
    // if today's calculated occurrence is already
    // in the past, move to next week.
    while (
        scheduled <
        today
    ) {

        scheduled.setDate(
            scheduled.getDate() +
            7
        );
    }

    return scheduled;
}


function getWorkoutScheduledDate(
    workout
) {

    if (!workout) {
        return null;
    }

    if (
        workout.scheduledDate
    ) {

        const date =
            parseLocalDate(
                workout.scheduledDate
            );

        if (date) {
            return date;
        }
    }

    if (
        workout.day
    ) {

        return getScheduledDateForDay(
            workout.day
        );
    }

    return null;
}


function isWorkoutToday(
    workout
) {

    const scheduled =
        getWorkoutScheduledDate(
            workout
        );

    if (!scheduled) {
        return false;
    }

    return (
        scheduled.getTime() ===
        getToday().getTime()
    );
}


function isWorkoutFuture(
    workout
) {

    const scheduled =
        getWorkoutScheduledDate(
            workout
        );

    if (!scheduled) {
        return false;
    }

    return (
        scheduled.getTime() >
        getToday().getTime()
    );
}


function isWorkoutPast(
    workout
) {

    const scheduled =
        getWorkoutScheduledDate(
            workout
        );

    if (!scheduled) {
        return false;
    }

    return (
        scheduled.getTime() <
        getToday().getTime()
    );
}


function isThisWeek(
    dateString
) {

    const date =
        parseLocalDate(
            dateString
        );

    if (!date) {
        return false;
    }

    return (
        date >=
            getStartOfWeek() &&
        date <
            getEndOfWeek()
    );
}


// ========================================
// VISUAL HELPERS
// ========================================

function replayFade(
    container
) {

    if (!container) {
        return;
    }

    const cards =
        container.querySelectorAll(
            ".exercise-card, .workout-card"
        );

    cards.forEach(
        (
            card,
            index
        ) => {

            card.style.animation =
                "none";

            void card.offsetWidth;

            card.style.animation =
                "";

            card.style.animationDelay =
                `${index * 0.04}s`;
        }
    );
}

// ========================================
// LIFTLOG IN-APP NOTIFICATIONS
// ========================================

function showLiftLogNotificationBanner(
    title,
    body,
    options = {}
) {

    // --------------------------------
    // Remove existing banner
    // --------------------------------

    const existing =
        document.getElementById(
            "liftlogNotificationBanner"
        );

    if (existing) {
        existing.remove();
    }


    // --------------------------------
    // Create banner
    // --------------------------------

    const banner =
        document.createElement("div");

    banner.id =
        "liftlogNotificationBanner";

    banner.innerHTML = `

        <div class="liftlog-notification-content">

            <div class="liftlog-notification-icon">
                <i class="bi bi-bell-fill"></i>
            </div>

            <div class="liftlog-notification-text">

                <div class="liftlog-notification-title">
                    ${escapeHtml(title)}
                </div>

                <div class="liftlog-notification-body">
                    ${escapeHtml(body)}
                </div>

            </div>

            <button
                type="button"
                class="liftlog-notification-close"
                aria-label="Close notification"
            >
                ×
            </button>

        </div>
    `;


    // --------------------------------
    // Styling
    // --------------------------------

    Object.assign(
        banner.style,
        {
            zIndex:
                "999999",

            opacity:
                "0",

            transition:
                "opacity 0.25s ease, transform 0.25s ease",

            cursor:
                options.url
                    ? "pointer"
                    : "default"
        }
    );


    document.body.appendChild(
        banner
    );


    // --------------------------------
    // Animate in
    // --------------------------------

    requestAnimationFrame(() => {

        banner.style.opacity =
            "1";

        banner.style.transform =
            "translateX(-50%) translateY(0)";

    });


    // --------------------------------
    // Close button
    // --------------------------------

    const closeButton =
        banner.querySelector(
            ".liftlog-notification-close"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                removeLiftLogNotificationBanner();

            }
        );
    }


    // --------------------------------
    // Click notification
    // --------------------------------

    if (options.url) {

        banner.addEventListener(
            "click",
            () => {

                window.location.href =
                    options.url;

            }
        );
    }


    // --------------------------------
    // Auto-hide
    // --------------------------------

    setTimeout(() => {

        removeLiftLogNotificationBanner();

    }, 8000);
}


// ========================================
// REMOVE IN-APP NOTIFICATION
// ========================================

function removeLiftLogNotificationBanner() {

    const banner =
        document.getElementById(
            "liftlogNotificationBanner"
        );

    if (!banner) {
        return;
    }

    banner.style.opacity =
        "0";

    banner.style.transform =
        "translateX(-50%) translateY(-20px)";

    setTimeout(() => {

        banner.remove();

    }, 250);
}


// ========================================
// SAFE HTML
// ========================================

function escapeHtml(value) {

    return String(value || "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ========================================
// RECEIVE SERVICE WORKER NOTIFICATIONS
// ========================================

if (
    "serviceWorker" in navigator
) {

    navigator.serviceWorker.addEventListener(
        "message",
        event => {

            console.log(
                "LiftLog data.js received SW message:",
                event.data
            );


            const message =
                event.data;


            if (
                !message ||
                message.type !==
                    "LIFTLOG_NOTIFICATION"
            ) {

                return;
            }


            showLiftLogNotificationBanner(

                message.title ||
                "LiftLog",

                message.body ||
                "Your workout timer has finished.",

                {
                    url:
                        message.url,

                    workoutId:
                        message.workoutId,

                    notificationType:
                        message.notificationType
                }

            );

        }
    );
}


// ========================================
// GLOBAL EVENTS
// ========================================

document.addEventListener(
    "pointerdown",
    () => {

        // Unlock audio as early as possible
        // from an actual user interaction.
        unlockWorkoutAudio();

    },
    {
        once: true,
        passive: true
    }
);


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeTheme();

        await registerLiftLogServiceWorker();

        await loadNavbar();

        checkWorkoutBanner();

        await loadFooter();

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                "#profileButton"
            )
        ) {

            window.location.href =
                "settings.html";
        }

        if (
            event.target.closest(
                "#dismissWorkoutBanner"
            )
        ) {

            dismissWorkoutBanner();
        }
    }
);


window.addEventListener(
    "scroll",
    () => {

        const navbar =
            document.querySelector(
                ".navbar"
            );

        if (navbar) {

            navbar.classList.toggle(
                "scrolled",
                window.scrollY > 10
            );
        }
    }
);


window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
            "workoutFinished"
        ) {

            checkWorkoutBanner();
        }

        if (
            event.key ===
            "darkMode"
        ) {

            if (
                localStorage.getItem(
                    "darkMode"
                ) === "true"
            ) {

                document.body.classList.add(
                    "dark-mode"
                );

            } else {

                document.body.classList.remove(
                    "dark-mode"
                );
            }

            updateBrowserTheme();
        }
    }
);


// ========================================
// TIMER + BANNER POLLING
// ========================================

setInterval(
    () => {

        checkWorkoutTimer();

        checkWorkoutBanner();

    },
    1000
);