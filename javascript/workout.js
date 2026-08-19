// ========================================
// LiftLog — Workout Session Page
// javascript/workout.js
// ========================================

const API_BASE = "http://localhost:5000/api/workouts";

const params = new URLSearchParams(window.location.search);
const workoutId = params.get("id");

// ========================================
// DOM
// ========================================

const exerciseResults = document.getElementById("exerciseResults");
const workoutExercises = document.getElementById("workoutExercises");
const exerciseSearch = document.getElementById("exerciseSearch");
const finishWorkoutBtn = document.getElementById("finishWorkoutBtn");
const workoutTitle = document.getElementById("workoutTitle");
const workoutInfo = document.getElementById("workoutInfo");
const workoutTimer = document.getElementById("workoutTimer");
const editWorkoutBtn = document.getElementById("editWorkoutBtn");
const saveWorkoutBtn = document.getElementById("saveWorkoutBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const pauseResumeIcon = document.getElementById("pauseResumeIcon");

// ========================================
// TIMER STATE
// ========================================

let seconds = 0;
let isRunning = false;
let isPaused = false;
let timerInterval = null;
let persistTimerInterval = null;
let userHasInteracted = false;

document.addEventListener("pointerdown", () => {
    userHasInteracted = true;
}, { once: true });

document.addEventListener("keydown", () => {
    userHasInteracted = true;
}, { once: true });

// ========================================
// BASIC HELPERS
// ========================================

function findWorkout() {
    return (
        workouts.find(
            workout => String(workout.id) === String(workoutId)
        ) || null
    );
}

function capitalizeWorkoutName(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function getWorkoutDaysAgo(workout) {
    if (!workout) return 0;

    const today = getToday();
    const scheduledDate = getWorkoutScheduledDate(workout);
    if (!scheduledDate) return 0;

    return Math.floor(
        (today.getTime() - scheduledDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}

function isFutureWorkout(workout) {
    return getWorkoutDaysAgo(workout) < 0;
}

function isTooOldWorkout(workout) {
    return getWorkoutDaysAgo(workout) > 7;
}

function isWorkoutEditable(workout) {
    if (!workout) return false;
    if (workout.completed) return false;
    if (isTooOldWorkout(workout)) return false;
    return true;
}

// ========================================
// MISSED WORKOUT
// ========================================

function isWorkoutMissed(workout) {
    if (!workout) return false;
    if (workout.completed) return false;
    if (workout.missed === true) return true;

    const scheduled = getWorkoutScheduledDate(workout);
    if (!scheduled) return false;

    return scheduled < getToday();
}

function markWorkoutMissed(workout) {
    if (!workout) return false;
    if (workout.completed) return false;
    if (!isWorkoutMissed(workout)) return false;

    let changed = false;

    if (!workout.missed) {
        workout.missed = true;
        changed = true;
    }

    if (!workout.missedDate) {
        workout.missedDate = new Date().toISOString();
        changed = true;
    }

    if (workout.sessionStatus !== "missed") {
        workout.sessionStatus = "missed";
        changed = true;
    }

    return changed;
}

// ========================================
// EXERCISE VALIDATION
// ========================================

function hasValidExerciseData(exercise) {
    if (!exercise) return false;

    const sets = Number(exercise.sets);
    const reps = Number(exercise.reps);
    const weight = Number(exercise.weight);

    return (
        Number.isFinite(sets) && sets > 0 &&
        Number.isFinite(reps) && reps > 0 &&
        Number.isFinite(weight) && weight >= 0
    );
}

function validateWorkoutExercises(workout) {
    if (!workout) {
        return { valid: false, message: "Workout not found." };
    }

    if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
        return {
            valid: false,
            message: "Add at least one exercise before completing the workout."
        };
    }

    const incomplete = workout.exercises.find(
        exercise => !hasValidExerciseData(exercise)
    );

    if (incomplete) {
        return {
            valid: false,
            message: `Enter sets, reps and weight for ${incomplete.name} before completing the workout.`
        };
    }

    return { valid: true };
}

// ========================================
// TIMER HELPERS
// ========================================

function getStartTimeMs(startTime) {
    if (!startTime) return null;

    if (typeof startTime === "number") return startTime;

    const ms = new Date(startTime).getTime();
    return Number.isNaN(ms) ? null : ms;
}

function makeStartTimeISO() {
    return new Date().toISOString();
}

function formatDurationClock(totalSeconds) {
    const s = Math.max(0, Number(totalSeconds) || 0);

    const hours = String(Math.floor(s / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const secs = String(s % 60).padStart(2, "0");

    return `${hours}:${minutes}:${secs}`;
}

function calculateActiveSeconds(workout) {
    if (!workout) return 0;

    const startMs = getStartTimeMs(workout.startTime);

    if (startMs == null) {
        return Math.max(0, Number(workout.durationSeconds) || 0);
    }

    let elapsed = Math.floor((Date.now() - startMs) / 1000);

    const totalPausedSeconds = Math.max(
        0,
        Number(workout.totalPausedSeconds) || 0
    );

    elapsed -= totalPausedSeconds;

    if (
        (workout.isPaused ||
            workout.timerPaused ||
            workout.sessionStatus === "paused") &&
        workout.pausedAt
    ) {
        const pausedAtMs = getStartTimeMs(workout.pausedAt);

        if (pausedAtMs != null) {
            const currentPauseSeconds = Math.floor(
                (Date.now() - pausedAtMs) / 1000
            );
            elapsed -= Math.max(0, currentPauseSeconds);
        }
    }

    return Math.max(0, elapsed);
}

function updateWorkoutSessionDuration(workout) {
    if (!workout) return;

    const activeSeconds = calculateActiveSeconds(workout);

    seconds = activeSeconds;
    workout.durationSeconds = activeSeconds;
    workout.actualDurationSeconds = activeSeconds;
    workout.actualDurationMinutes = Math.floor(activeSeconds / 60);
}

function renderTimer() {
    if (!workoutTimer) return;
    workoutTimer.textContent = formatDurationClock(seconds);
}

// ========================================
// TIMER UI (ring animation)
// ========================================

function setTimerRunningUI(running) {
    const el =
        document.getElementById("workoutTimer") ||
        document.querySelector(".timer-display h2");

    const wrap = document.querySelector(".timer-display");

    if (el) {
        el.classList.toggle("is-running", Boolean(running));
    }

    if (wrap) {
        wrap.classList.toggle("is-running", Boolean(running));
    }
}

// ========================================
// LOCAL TICKERS
// ========================================

function startLocalTimerTick() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const workout = findWorkout();
        if (!workout || !isRunning || isPaused) return;

        updateWorkoutSessionDuration(workout);
        renderTimer();
        updateFinishWorkoutButton();
    }, 1000);
}

function stopLocalTimerTick() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function startPersistTimerTick() {
    clearInterval(persistTimerInterval);

    persistTimerInterval = setInterval(async () => {
        const workout = findWorkout();
        if (!workout || !isRunning || isPaused || workout.completed) return;

        updateWorkoutSessionDuration(workout);
        await persistWorkout(workout, { silent: true });
    }, 15000);
}

function stopPersistTimerTick() {
    clearInterval(persistTimerInterval);
    persistTimerInterval = null;
}

// ========================================
// SERVER TIMER
// ========================================

async function startServerWorkoutTimer(workout) {
    if (!workout) return false;

    const plannedSeconds = Math.max(0, (Number(workout.duration) || 0) * 60);
    const elapsedSeconds = Math.max(0, Number(seconds) || 0);
    const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);

    if (typeof authenticatedFetch !== "function") {
        console.warn("authenticatedFetch() not available.");
        return false;
    }

    try {
        const response = await authenticatedFetch(
            `${API_BASE}/${workout.id}/timer/start`,
            {
                method: "POST",
                body: JSON.stringify({ remaining_seconds: remainingSeconds })
            }
        );

        if (!response.ok) {
            console.error("Server timer start failed:", await response.text());
            return false;
        }

        const result = await response.json();
        const saved = result?.workout;

        if (saved) {
            workout.timerEndAt =
                saved.timer_end_at ?? saved.timerEndAt ?? workout.timerEndAt;
            workout.timerRemainingSeconds = Number(
                saved.timer_remaining_seconds ??
                saved.timerRemainingSeconds ??
                remainingSeconds
            );
            workout.timerPaused = false;
        } else {
            workout.timerRemainingSeconds = remainingSeconds;
            workout.timerPaused = false;
        }

        workout.notificationSent = false;
        return true;
    } catch (error) {
        console.error("Failed to start server timer:", error);
        return false;
    }
}

async function pauseServerWorkoutTimer(workout) {
    if (!workout) return false;

    updateWorkoutSessionDuration(workout);

    const plannedSeconds = Math.max(0, (Number(workout.duration) || 0) * 60);
    const remainingSeconds = Math.max(0, plannedSeconds - Number(seconds || 0));

    if (typeof authenticatedFetch !== "function") return false;

    try {
        const response = await authenticatedFetch(
            `${API_BASE}/${workout.id}/timer/pause`,
            {
                method: "POST",
                body: JSON.stringify({ remaining_seconds: remainingSeconds })
            }
        );

        if (!response.ok) {
            console.error("Server timer pause failed:", await response.text());
            return false;
        }

        const result = await response.json();
        const saved = result?.workout;

        if (saved) {
            workout.timerRemainingSeconds = Number(
                saved.timer_remaining_seconds ??
                saved.timerRemainingSeconds ??
                remainingSeconds
            );
            workout.timerPaused = true;
            workout.timerEndAt = null;
        } else {
            workout.timerRemainingSeconds = remainingSeconds;
            workout.timerPaused = true;
            workout.timerEndAt = null;
        }

        return true;
    } catch (error) {
        console.error("Failed to pause server timer:", error);
        return false;
    }
}

async function resumeServerWorkoutTimer(workout) {
    if (!workout) return false;

    const plannedSeconds = Math.max(0, (Number(workout.duration) || 0) * 60);
    const elapsedSeconds = Math.max(0, Number(seconds) || 0);
    const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);

    if (typeof authenticatedFetch !== "function") return false;

    try {
        const response = await authenticatedFetch(
            `${API_BASE}/${workout.id}/timer/resume`,
            {
                method: "POST",
                body: JSON.stringify({ remaining_seconds: remainingSeconds })
            }
        );

        if (!response.ok) {
            console.error("Server timer resume failed:", await response.text());
            return false;
        }

        const result = await response.json();
        const saved = result?.workout;

        if (saved) {
            workout.timerEndAt =
                saved.timer_end_at ?? saved.timerEndAt ?? workout.timerEndAt;
            workout.timerRemainingSeconds = Number(
                saved.timer_remaining_seconds ??
                saved.timerRemainingSeconds ??
                remainingSeconds
            );
            workout.timerPaused = false;
        } else {
            workout.timerRemainingSeconds = remainingSeconds;
            workout.timerPaused = false;
        }

        workout.notificationSent = false;
        return true;
    } catch (error) {
        console.error("Failed to resume server timer:", error);
        return false;
    }
}

// ========================================
// START / PAUSE WORKOUT
// ========================================

async function startWorkout() {
    const workout = findWorkout();

    if (!workout) {
        showToast("Workout not found.", "error");
        return;
    }

    if (workout.completed) {
        showToast("This workout is already completed.", "warning");
        return;
    }

    if (isFutureWorkout(workout)) {
        showToast("You cannot start a future workout.", "warning");
        return;
    }

    if (isTooOldWorkout(workout)) {
        showToast("You can only log workouts from the last 7 days.", "warning");
        return;
    }

    // Resume from pause
    if (
        isPaused ||
        workout.sessionStatus === "paused" ||
        workout.isPaused
    ) {
        if (workout.pausedAt) {
            const pausedAtMs = getStartTimeMs(workout.pausedAt);

            if (pausedAtMs != null) {
                const pauseSeconds = Math.max(
                    0,
                    Math.floor((Date.now() - pausedAtMs) / 1000)
                );

                workout.totalPausedSeconds =
                    Math.max(0, Number(workout.totalPausedSeconds) || 0) +
                    pauseSeconds;
            }
        }

        workout.pausedAt = null;
        workout.isPaused = false;
        workout.timerPaused = false;
        workout.sessionStatus = "in_progress";

        isPaused = false;
        isRunning = true;

        updateWorkoutSessionDuration(workout);
        renderTimer();

        await resumeServerWorkoutTimer(workout);
        await persistWorkout(workout, { silent: true });

        startLocalTimerTick();
        startPersistTimerTick();

        if (pauseResumeIcon) {
            pauseResumeIcon.className = "bi bi-pause-fill";
        }

        setTimerRunningUI(true);
        updateFinishWorkoutButton();
        displayWorkoutHeader();

        showToast("Workout resumed.", "success");
        return;
    }

    // First start
    if (!workout.startTime) {
        workout.startTime = makeStartTimeISO();
        workout.totalPausedSeconds = 0;
        workout.pausedAt = null;
        workout.durationSeconds = 0;
        workout.actualDurationSeconds = 0;
        workout.actualDurationMinutes = 0;
        seconds = 0;
    }

    workout.isPaused = false;
    workout.timerPaused = false;
    workout.sessionStatus = "in_progress";
    workout.missed = false;

    isRunning = true;
    isPaused = false;

    updateWorkoutSessionDuration(workout);
    renderTimer();

    await startServerWorkoutTimer(workout);
    await persistWorkout(workout, { silent: true });

    startLocalTimerTick();
    startPersistTimerTick();

    if (pauseResumeIcon) {
        pauseResumeIcon.className = "bi bi-pause-fill";
    }

    setTimerRunningUI(true);
    updateFinishWorkoutButton();
    displayWorkoutHeader();

    showToast("Workout started.", "success");
}

async function pauseWorkout() {
    const workout = findWorkout();
    if (!workout) return;

    if (!isRunning && workout.sessionStatus !== "in_progress") {
        return;
    }

    updateWorkoutSessionDuration(workout);

    workout.pausedAt = makeStartTimeISO();
    workout.isPaused = true;
    workout.timerPaused = true;
    workout.sessionStatus = "paused";

    isRunning = false;
    isPaused = true;

    stopLocalTimerTick();
    stopPersistTimerTick();

    await pauseServerWorkoutTimer(workout);
    await persistWorkout(workout, { silent: true });

    renderTimer();

    if (pauseResumeIcon) {
        pauseResumeIcon.className = "bi bi-play-fill";
    }

    setTimerRunningUI(false);
    updateFinishWorkoutButton();
    displayWorkoutHeader();

    showToast("Workout paused.", "warning");
}

// ========================================
// INITIALIZE TIMER ON LOAD
// ========================================

function initializeWorkoutTimer() {
    const workout = findWorkout();

    if (!workout) {
        seconds = 0;
        isRunning = false;
        isPaused = false;
        renderTimer();
        setTimerRunningUI(false);
        return;
    }

    if (workout.completed) {
        seconds =
            Number(workout.actualDurationSeconds) ||
            Number(workout.durationSeconds) ||
            0;

        isRunning = false;
        isPaused = false;
        stopLocalTimerTick();
        stopPersistTimerTick();
        renderTimer();
        setTimerRunningUI(false);
        return;
    }

    updateWorkoutSessionDuration(workout);
    renderTimer();

    const wasPaused =
        workout.sessionStatus === "paused" ||
        workout.isPaused === true ||
        workout.timerPaused === true;

    const wasInProgress =
        workout.sessionStatus === "in_progress" ||
        Boolean(workout.startTime);

    if (wasInProgress && !wasPaused) {
        isRunning = true;
        isPaused = false;
        workout.isPaused = false;
        workout.timerPaused = false;
        workout.sessionStatus = "in_progress";

        startLocalTimerTick();
        startPersistTimerTick();

        if (pauseResumeIcon) {
            pauseResumeIcon.className = "bi bi-pause-fill";
        }

        setTimerRunningUI(true);
    } else if (wasPaused) {
        isRunning = false;
        isPaused = true;

        if (pauseResumeIcon) {
            pauseResumeIcon.className = "bi bi-play-fill";
        }

        setTimerRunningUI(false);
    } else {
        isRunning = false;
        isPaused = false;

        if (pauseResumeIcon) {
            pauseResumeIcon.className = "bi bi-play-fill";
        }

        setTimerRunningUI(false);
    }

    updateFinishWorkoutButton();
}

// ========================================
// NORMALIZE / API
// ========================================

function normalizeWorkout(workout) {
    if (!workout) return workout;

    if (!Array.isArray(workout.exercises)) {
        workout.exercises = [];
    }

    if (workout.scheduled_date && !workout.scheduledDate) {
        workout.scheduledDate = workout.scheduled_date;
    }
    if (workout.exercise_count != null && workout.exerciseCount == null) {
        workout.exerciseCount = workout.exercise_count;
    }
    if (workout.completed_date && !workout.completedDate) {
        workout.completedDate = workout.completed_date;
    }
    if (workout.start_time && !workout.startTime) {
        workout.startTime = workout.start_time;
    }
    if (workout.duration_seconds != null && workout.durationSeconds == null) {
        workout.durationSeconds = Number(workout.duration_seconds) || 0;
    }
    if (workout.actual_duration_seconds != null && workout.actualDurationSeconds == null) {
        workout.actualDurationSeconds = Number(workout.actual_duration_seconds) || 0;
    }
    if (workout.actual_duration_minutes != null && workout.actualDurationMinutes == null) {
        workout.actualDurationMinutes = Number(workout.actual_duration_minutes) || 0;
    }
    if (workout.total_paused_seconds != null && workout.totalPausedSeconds == null) {
        workout.totalPausedSeconds = Number(workout.total_paused_seconds) || 0;
    }
    if (workout.paused_at && !workout.pausedAt) {
        workout.pausedAt = workout.paused_at;
    }
    if (workout.session_status && !workout.sessionStatus) {
        workout.sessionStatus = workout.session_status;
    }
    if (workout.missed_date && !workout.missedDate) {
        workout.missedDate = workout.missed_date;
    }
    if (workout.timer_end_at && !workout.timerEndAt) {
        workout.timerEndAt = workout.timer_end_at;
    }
    if (workout.timer_remaining_seconds != null && workout.timerRemainingSeconds == null) {
        workout.timerRemainingSeconds = Number(workout.timer_remaining_seconds) || 0;
    }
    if (workout.timer_paused != null && workout.timerPaused == null) {
        workout.timerPaused = Boolean(workout.timer_paused);
    }
    if (workout.notification_sent != null && workout.notificationSent == null) {
        workout.notificationSent = Boolean(workout.notification_sent);
    }

    workout.duration = Number(workout.duration) || 0;
    workout.durationSeconds = Number(workout.durationSeconds) || 0;
    workout.actualDurationSeconds = Number(workout.actualDurationSeconds) || 0;
    workout.actualDurationMinutes = Number(workout.actualDurationMinutes) || 0;
    workout.totalPausedSeconds = Number(workout.totalPausedSeconds) || 0;
    workout.timerRemainingSeconds = Number(workout.timerRemainingSeconds) || 0;
    workout.exerciseCount = workout.exercises.length;
    workout.completed = Boolean(workout.completed);
    workout.missed = Boolean(workout.missed);
    workout.timerPaused = Boolean(workout.timerPaused);
    workout.notificationSent = Boolean(workout.notificationSent);

    if (workout.completed) {
        workout.sessionStatus = "completed";
        workout.missed = false;
        workout.isPaused = false;
        workout.timerPaused = false;
    } else if (workout.sessionStatus === "paused") {
        workout.isPaused = true;
    } else if (workout.sessionStatus === "in_progress") {
        workout.isPaused = false;
    } else if (workout.sessionStatus === "missed") {
        workout.missed = true;
    } else {
        workout.sessionStatus = "scheduled";
    }

    return workout;
}

function toApiPayload(workout) {
    normalizeWorkout(workout);

    return {
        name: capitalizeWorkoutName(workout.name),
        day: workout.day || null,
        category: workout.category || null,
        goal: workout.goal || null,
        difficulty: workout.difficulty || null,
        duration: Number(workout.duration) || 0,
        duration_seconds: Number(workout.durationSeconds) || 0,
        actual_duration_seconds: Number(workout.actualDurationSeconds) || 0,
        actual_duration_minutes: Number(workout.actualDurationMinutes) || 0,
        total_paused_seconds: Number(workout.totalPausedSeconds) || 0,
        paused_at: workout.pausedAt || null,
        session_status: workout.sessionStatus || "scheduled",
        start_time: workout.startTime || null,
        completed: Boolean(workout.completed),
        completed_date: workout.completedDate || null,
        missed: Boolean(workout.missed),
        missed_date: workout.missedDate || null,
        scheduled_date:
            workout.scheduledDate || workout.scheduled_date || null,
        timer_end_at: workout.timerEndAt || null,
        timer_remaining_seconds: Number(workout.timerRemainingSeconds) || 0,
        timer_paused: Boolean(workout.timerPaused),
        notification_sent: Boolean(workout.notificationSent),
        exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
        exercise_count: Array.isArray(workout.exercises)
            ? workout.exercises.length
            : 0
    };
}

async function persistWorkout(workout, { silent = false } = {}) {
    if (!workout || workout.id == null) return false;

    const session =
        typeof getLiftLogSession === "function"
            ? getLiftLogSession()
            : null;

    if (!session || !session.access_token) {
        console.error("No authenticated LiftLog session found.");
        if (!silent) {
            showToast(
                "Your login session is invalid. Please log in again.",
                "error"
            );
        }
        return false;
    }

    normalizeWorkout(workout);

    if (typeof saveWorkouts === "function") {
        saveWorkouts();
    }

    try {
        const response = await fetch(`${API_BASE}/${workout.id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(toApiPayload(workout))
        });

        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = null;
        }

        if (response.status === 401) {
            if (!silent) {
                showToast(
                    "Your login session is no longer valid.",
                    "error"
                );
            }
            return false;
        }

        if (!response.ok) {
            if (!silent) {
                showToast(
                    data?.error || "Could not save workout.",
                    "error"
                );
            }
            return false;
        }

        const saved = Array.isArray(data) ? data[0] : data;

        if (saved) {
            normalizeWorkout(saved);

            const index = workouts.findIndex(
                w => String(w.id) === String(workout.id)
            );

            const merged = normalizeWorkout({
                ...workout,
                ...saved,
                scheduledDate:
                    saved.scheduled_date ?? workout.scheduledDate,
                exerciseCount:
                    saved.exercise_count ?? workout.exerciseCount,
                completedDate:
                    saved.completed_date ?? workout.completedDate,
                startTime: saved.start_time ?? workout.startTime,
                durationSeconds:
                    saved.duration_seconds ?? workout.durationSeconds,
                actualDurationSeconds:
                    saved.actual_duration_seconds ??
                    workout.actualDurationSeconds,
                actualDurationMinutes:
                    saved.actual_duration_minutes ??
                    workout.actualDurationMinutes,
                totalPausedSeconds:
                    saved.total_paused_seconds ??
                    workout.totalPausedSeconds,
                pausedAt: saved.paused_at ?? workout.pausedAt,
                sessionStatus:
                    saved.session_status ?? workout.sessionStatus,
                missed: saved.missed ?? workout.missed,
                exercises: workout.exercises
            });

            if (index !== -1) {
                workouts[index] = merged;
            }

            if (typeof saveWorkouts === "function") {
                saveWorkouts();
            }

            Object.assign(workout, merged);
        }

        return true;
    } catch (error) {
        console.error("persistWorkout error:", error);
        if (!silent) {
            showToast("Unable to save workout.", "error");
        }
        return false;
    }
}

// ========================================
// HEADER
// ========================================

function displayWorkoutHeader() {
    const workout = findWorkout();
    if (!workout) return;

    if (workoutTitle) {
        workoutTitle.textContent = capitalizeWorkoutName(workout.name);
    }

    let difficultyClass = "difficulty-badge";
    const level = String(workout.difficulty || "").toLowerCase();

    if (level === "beginner") difficultyClass += " beginner";
    else if (level === "intermediate") difficultyClass += " intermediate";
    else if (level === "advanced") difficultyClass += " advanced";

    const scheduled = getWorkoutScheduledDate(workout);

    const scheduledText = scheduled
        ? scheduled.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric"
        })
        : (workout.day || "Unscheduled");

    const plannedMinutes = Number(workout.duration) || 0;
    const plannedHours = Math.floor(plannedMinutes / 60);
    const plannedMins = plannedMinutes % 60;

    let plannedText = "";
    if (plannedHours > 0 && plannedMins > 0) {
        plannedText = `${plannedHours}h ${plannedMins}m`;
    } else if (plannedHours > 0) {
        plannedText = `${plannedHours}h`;
    } else {
        plannedText = `${plannedMins} min`;
    }

    let statusText = "Scheduled";

    if (workout.completed) statusText = "Completed";
    else if (workout.missed) statusText = "Missed — still loggable";
    else if (workout.sessionStatus === "paused") statusText = "Paused";
    else if (workout.sessionStatus === "in_progress") statusText = "In Progress";

    if (workoutInfo) {
        workoutInfo.innerHTML = `
            <div class="mb-2">
                <strong>${scheduledText}</strong>
            </div>
            <div class="mb-2">
                ${workout.category || ""}
                ${workout.goal ? " • " + workout.goal : ""}
            </div>
            <span class="${difficultyClass}">
                ${workout.difficulty || ""}
            </span>
            <div class="mt-2">
                <small>Planned: ${plannedText}</small>
            </div>
            <div>
                <small>Status: ${statusText}</small>
            </div>
        `;
    }
}

// ========================================
// EXERCISES LIST
// ========================================

function displayWorkoutExercises() {
    const workout = findWorkout();
    if (!workout || !workoutExercises) return;

    const locked = !isWorkoutEditable(workout);
    const unit =
        (typeof weightUnit !== "undefined" && weightUnit) ||
        localStorage.getItem("weightUnit") ||
        "kg";

    if (!Array.isArray(workout.exercises)) {
        workout.exercises = [];
    }

    if (workout.exercises.length === 0) {
        workoutExercises.innerHTML = `
            <div class="alert empty-exercises text-center">
                No exercises yet.<br>
                <span>Click <strong>Add Exercise</strong> to begin.</span>
            </div>
        `;
        return;
    }

    workoutExercises.innerHTML = "";

    workout.exercises.forEach(exercise => {
        const completed = Boolean(exercise.completed);
        const section = document.createElement("section");

        section.className =
            "card mb-3 shadow-sm" +
            (completed ? " exercise-completed is-completed" : "");

        section.dataset.workoutExercise = exercise.id;

        section.innerHTML = `
            <div class="card-body">
                <button
                    type="button"
                    class="btn btn-link exercise-info-btn"
                    data-id="${exercise.id}"
                    title="Exercise information"
                >
                    <i class="bi bi-info-circle"></i>
                </button>

                <div class="d-flex justify-content-between align-items-center">
                    <div class="form-check">
                        <input
                            class="form-check-input complete-input"
                            type="checkbox"
                            data-id="${exercise.id}"
                            ${completed ? "checked" : ""}
                            ${locked ? "disabled" : ""}
                        >
                        <label class="form-check-label">
                            <h5>${exercise.name || "Exercise"}</h5>
                        </label>
                    </div>

                    <button
                        type="button"
                        class="btn btn-outline-danger remove-exercise"
                        data-id="${exercise.id}"
                        ${locked ? "disabled" : ""}
                        title="Remove exercise"
                    >
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>

                <small class="exercise-meta">
                    ${exercise.muscle || ""}
                    ${exercise.equipment ? " • " + exercise.equipment : ""}
                </small>

                <div class="row g-2">
                    <div class="col-4">
                        <label class="form-label">Sets</label>
                        <input
                            type="number"
                            class="form-control sets-input"
                            data-id="${exercise.id}"
                            value="${exercise.sets ?? ""}"
                            min="0"
                            ${locked ? "disabled" : ""}
                        >
                    </div>
                    <div class="col-4">
                        <label class="form-label">Reps</label>
                        <input
                            type="number"
                            class="form-control reps-input"
                            data-id="${exercise.id}"
                            value="${exercise.reps ?? ""}"
                            min="0"
                            ${locked ? "disabled" : ""}
                        >
                    </div>
                    <div class="col-4">
                        <label class="form-label">Weight</label>
                        <div class="input-group weight-input-group">
                            <input
                                type="number"
                                class="form-control weight-input"
                                data-id="${exercise.id}"
                                value="${exercise.weight ?? ""}"
                                min="0"
                                step="0.5"
                                ${locked ? "disabled" : ""}
                            >
                            <span class="input-group-text weight-unit">${unit}</span>
                        </div>
                    </div>
                </div>

                <div class="mt-3">
                    <label class="form-label">Notes</label>
                    <textarea
                        class="form-control notes-input"
                        rows="2"
                        data-id="${exercise.id}"
                        placeholder="Exercise notes..."
                        ${locked ? "disabled" : ""}
                    >${exercise.notes || ""}</textarea>
                </div>

                ${
                    completed
                        ? `
                    <div class="alert alert-success exercise-done-banner mt-3 mb-0 py-2">
                        <i class="bi bi-check-circle"></i>
                        Exercise completed
                    </div>
                `
                        : ""
                }
            </div>
        `;

        workoutExercises.appendChild(section);
    });

    attachRemoveExerciseEvents();
    attachExerciseInputEvents();
    attachCompleteEvents();
}

// ========================================
// EXERCISE EVENTS
// ========================================

function attachRemoveExerciseEvents() {
    document.querySelectorAll(".remove-exercise").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const workout = findWorkout();
            if (!workout || !isWorkoutEditable(workout)) return;

            workout.exercises = workout.exercises.filter(
                e => String(e.id) !== String(id)
            );
            workout.exerciseCount = workout.exercises.length;

            persistWorkout(workout, { silent: true });
            displayWorkoutExercises();
            updateWorkoutProgress();
            showToast("Exercise removed.", "warning");
        };
    });
}

function attachExerciseInputEvents() {
    const workout = findWorkout();
    if (!workout) return;

    const bind = (selector, key, parser = v => v) => {
        document.querySelectorAll(selector).forEach(input => {
            input.oninput = () => {
                const exercise = workout.exercises.find(
                    e => String(e.id) === String(input.dataset.id)
                );
                if (!exercise) return;

                exercise[key] = parser(input.value);

                if (key === "sets" || key === "reps" || key === "weight") {
                    const sets = Number(exercise.sets) || 0;
                    const reps = Number(exercise.reps) || 0;
                    const weight = Number(exercise.weight) || 0;
                    exercise.volume = sets * reps * weight;
                }

                persistWorkout(workout, { silent: true });
                updateWorkoutProgress();
            };
        });
    };

    bind(".sets-input", "sets", v => (v === "" ? "" : Number(v)));
    bind(".reps-input", "reps", v => (v === "" ? "" : Number(v)));
    bind(".weight-input", "weight", v => (v === "" ? "" : Number(v)));
    bind(".notes-input", "notes", v => v);
}

function attachCompleteEvents() {
    document.querySelectorAll(".complete-input").forEach(box => {
        box.onchange = () => {
            const workout = findWorkout();
            if (!workout || !isWorkoutEditable(workout)) return;

            const exercise = workout.exercises.find(
                e => String(e.id) === String(box.dataset.id)
            );
            if (!exercise) return;

            exercise.completed = box.checked;

            persistWorkout(workout, { silent: true });
            displayWorkoutExercises();
            updateWorkoutProgress();
        };
    });
}

// ========================================
// ADD EXERCISE FROM LIBRARY
// ========================================

function displayExercises(list, container) {
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                No exercises found.
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    list.forEach(exercise => {
        const card = document.createElement("div");
        card.className = "card exercise-card mb-2";
        card.innerHTML = `
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-1">${exercise.name}</h5>
                    <small class="text-muted">
                        ${exercise.muscle || ""}
                        ${exercise.equipment ? " • " + exercise.equipment : ""}
                    </small>
                </div>
                <button
                    type="button"
                    class="btn btn-sm btn-primary add-library-exercise"
                    data-id="${exercise.id}"
                >
                    <i class="bi bi-plus-lg"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll(".add-library-exercise").forEach(btn => {
        btn.onclick = () => addExerciseToWorkout(btn.dataset.id);
    });
}

function addExerciseToWorkout(exerciseId) {
    const workout = findWorkout();
    if (!workout || !isWorkoutEditable(workout)) {
        showToast("This workout cannot be edited.", "warning");
        return;
    }

    const libraryExercise = exerciseLibrary.find(
        e => String(e.id) === String(exerciseId)
    );

    if (!libraryExercise) return;

    if (!Array.isArray(workout.exercises)) {
        workout.exercises = [];
    }

    const already = workout.exercises.some(
        e => String(e.id) === String(libraryExercise.id)
    );

    if (already) {
        showToast("Exercise already in this workout.", "warning");
        return;
    }

    workout.exercises.push({
        ...libraryExercise,
        sets: "",
        reps: "",
        weight: "",
        notes: "",
        completed: false,
        volume: 0,
        calories: 0
    });

    workout.exerciseCount = workout.exercises.length;

    persistWorkout(workout, { silent: true });
    displayWorkoutExercises();
    updateWorkoutProgress();

    const modal = document.getElementById("exerciseModal");
    if (modal) {
        bootstrap.Modal.getOrCreateInstance(modal).hide();
    }

    showToast("Exercise added.", "success");
}

// ========================================
// EXERCISE INFO MODAL
// ========================================

function openExerciseInfo(id) {
    const exercise =
        exerciseLibrary.find(e => String(e.id) === String(id)) ||
        findWorkout()?.exercises?.find(e => String(e.id) === String(id));

    if (!exercise) {
        showToast("Exercise not found.", "error");
        return;
    }

    const title = document.getElementById("exerciseTitle");
    const body = document.getElementById("exerciseInfoContent");

    if (title) title.textContent = exercise.name || "Exercise";

    if (body) {
        const images = [];

        if (exercise.image || exercise.img) {
            images.push(exercise.image || exercise.img);
        }
        if (exercise.image2) images.push(exercise.image2);
        if (exercise.muscleImage) images.push(exercise.muscleImage);

        body.innerHTML = `
            ${
                images.length
                    ? `<div class="exercise-images">
                        ${images
                            .map(
                                src =>
                                    `<img src="${src}" alt="${exercise.name || ""}">`
                            )
                            .join("")}
                       </div>`
                    : ""
            }
            <div id="exerciseBody">
                <p><strong>Muscle:</strong> ${exercise.muscle || "—"}</p>
                <p><strong>Equipment:</strong> ${exercise.equipment || "—"}</p>
                <p><strong>Type:</strong> ${exercise.type || "—"}</p>
                ${
                    exercise.instructions
                        ? `<h5>Instructions</h5>
                           <ol>
                             ${(Array.isArray(exercise.instructions)
                                 ? exercise.instructions
                                 : String(exercise.instructions).split("\n")
                             )
                                 .filter(Boolean)
                                 .map(step => `<li>${step}</li>`)
                                 .join("")}
                           </ol>`
                        : ""
                }
            </div>
        `;
    }

    const modal = document.getElementById("exerciseInfoModal");
    if (modal) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

// ========================================
// PROGRESS
// ========================================

function updateWorkoutProgress() {
    const workout = findWorkout();
    const bar = document.querySelector(".progress-bar");
    const text = document.getElementById("progressText");

    if (!workout || !Array.isArray(workout.exercises)) {
        if (bar) bar.style.width = "0%";
        if (text) text.textContent = "0% complete";
        return;
    }

    const total = workout.exercises.length;
    const done = workout.exercises.filter(e => e.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    if (bar) bar.style.width = pct + "%";
    if (text) text.textContent = `${pct}% complete · ${done}/${total} exercises`;
}

// ========================================
// COMPLETE / FINISH
// ========================================

async function completeWorkout() {
    const workout = findWorkout();
    if (!workout) return;

    const validation = validateWorkoutExercises(workout);
    if (!validation.valid) {
        showToast(validation.message, "warning");
        return;
    }

    updateWorkoutSessionDuration(workout);

    workout.completed = true;
    workout.completedDate = new Date().toISOString();
    workout.sessionStatus = "completed";
    workout.missed = false;
    workout.isPaused = false;
    workout.timerPaused = false;
    workout.pausedAt = null;

    isRunning = false;
    isPaused = false;

    stopLocalTimerTick();
    stopPersistTimerTick();
    setTimerRunningUI(false);

    const completedExercises = workout.exercises.filter(e => e.completed).length;
    const totalVolume = workout.exercises.reduce(
        (sum, e) => sum + (Number(e.volume) || 0),
        0
    );

    workout.summary = {
        duration: formatDurationClock(seconds),
        completedExercises,
        totalExercises: workout.exercises.length,
        calories: Math.round((seconds / 60) * 8),
        volume: totalVolume,
        prs: 0,
        streak: 0,
        loggedDate: workout.completedDate,
        completedDate: workout.completedDate
    };

    await persistWorkout(workout);

    lockCompletedWorkout();
    displayWorkoutHeader();
    displayWorkoutExercises();
    displayWorkoutSummary();
    updateFinishWorkoutButton();

    showToast("Workout completed!", "success");

    const finishModal = document.getElementById("finishWorkoutModal");
    if (finishModal) {
        bootstrap.Modal.getOrCreateInstance(finishModal).show();
    }
}

function finishWorkout() {
    const workout = findWorkout();
    if (!workout) {
        showToast("Workout not found.", "error");
        return;
    }

    if (workout.completed) {
        showToast("This workout has already been completed.", "warning");
        return;
    }

    if (isFutureWorkout(workout)) {
        showToast("This workout is scheduled for a future date.", "warning");
        return;
    }

    if (isTooOldWorkout(workout)) {
        showToast("You can only log workouts from the last 7 days.", "warning");
        return;
    }

    const validation = validateWorkoutExercises(workout);
    if (!validation.valid) {
        showToast(validation.message, "warning");
        return;
    }

    const daysAgo = getWorkoutDaysAgo(workout);
    const isMissedWorkout = daysAgo > 0;

    if (
        !isMissedWorkout &&
        !workout.startTime &&
        !isRunning &&
        !isPaused
    ) {
        const warningModal = document.getElementById("timerWarningModal");
        if (warningModal) {
            bootstrap.Modal.getOrCreateInstance(warningModal).show();
        }
        return;
    }

    completeWorkout();
}

function updateFinishWorkoutButton() {
    const workout = findWorkout();
    if (!workout || !finishWorkoutBtn) return;

    if (workout.completed) {
        finishWorkoutBtn.disabled = true;
        finishWorkoutBtn.textContent = "Workout Completed";
        if (pauseResumeBtn) pauseResumeBtn.disabled = true;
        if (pauseResumeIcon) {
            pauseResumeIcon.className = "bi bi-check-circle-fill";
        }
        return;
    }

    if (isFutureWorkout(workout)) {
        finishWorkoutBtn.disabled = true;
        finishWorkoutBtn.textContent = "Workout Scheduled Later";
        if (pauseResumeBtn) pauseResumeBtn.disabled = true;
        return;
    }

    if (isTooOldWorkout(workout)) {
        finishWorkoutBtn.disabled = true;
        finishWorkoutBtn.textContent = "Workout Too Old";
        if (pauseResumeBtn) pauseResumeBtn.disabled = true;
        return;
    }

    if (pauseResumeBtn) pauseResumeBtn.disabled = false;

    const daysAgo = getWorkoutDaysAgo(workout);

    if (workout.missed && daysAgo > 0) {
        finishWorkoutBtn.disabled = false;
        finishWorkoutBtn.textContent = isRunning
            ? "Stop Workout"
            : "Log Previous Workout";
        return;
    }

    if (isRunning) {
        finishWorkoutBtn.disabled = false;
        finishWorkoutBtn.textContent = "Stop Workout";
        return;
    }

    finishWorkoutBtn.disabled = false;
    finishWorkoutBtn.textContent = "Finish Workout";
}

function lockCompletedWorkout() {
    stopLocalTimerTick();
    stopPersistTimerTick();

    isRunning = false;
    isPaused = false;
    setTimerRunningUI(false);
    renderTimer();

    if (finishWorkoutBtn) {
        finishWorkoutBtn.disabled = true;
        finishWorkoutBtn.textContent = "Workout Completed";
    }

    if (pauseResumeBtn) pauseResumeBtn.disabled = true;
    if (editWorkoutBtn) editWorkoutBtn.disabled = true;

    if (pauseResumeIcon) {
        pauseResumeIcon.className = "bi bi-check-circle-fill";
    }

    document
        .querySelectorAll(
            ".sets-input, .reps-input, .weight-input, .notes-input, .complete-input, .remove-exercise"
        )
        .forEach(el => {
            el.disabled = true;
        });

    const addBtn = document.querySelector('[data-bs-target="#exerciseModal"]');
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.classList.add("disabled");
        addBtn.removeAttribute("data-bs-toggle");
        addBtn.removeAttribute("data-bs-target");
    }
}

// ========================================
// SUMMARY
// ========================================

function displayWorkoutSummary() {
    const workout = findWorkout();
    if (!workout || !workout.completed) return;

    const card = document.getElementById("workoutSummaryCard");
    const content = document.getElementById("workoutSummaryContent");
    if (!card || !content) return;

    if (!workout.summary) {
        const durationSecs =
            Number(workout.actualDurationSeconds) ||
            Number(workout.durationSeconds) ||
            0;

        const completedExercises = (workout.exercises || []).filter(
            e => e.completed
        ).length;

        const totalVolume = (workout.exercises || []).reduce(
            (sum, e) => sum + (Number(e.volume) || 0),
            0
        );

        workout.summary = {
            duration: formatDurationClock(durationSecs),
            completedExercises,
            totalExercises: (workout.exercises || []).length,
            calories: Math.round((durationSecs / 60) * 8),
            volume: totalVolume,
            prs: 0,
            streak: 0,
            loggedDate: workout.completedDate,
            completedDate: workout.completedDate
        };
    }

    card.classList.remove("d-none");

    content.innerHTML = `
        <div class="row text-center g-4">
            <div class="col-6">
                <h4>${workout.summary.duration}</h4>
                <small>Actual Duration</small>
            </div>
            <div class="col-6">
                <h4>${workout.summary.completedExercises}/${workout.summary.totalExercises}</h4>
                <small>Exercises</small>
            </div>
            <div class="col-6">
                <h4>${workout.summary.calories ?? 0}</h4>
                <small>Calories Burned</small>
            </div>
            <div class="col-6">
                <h4>${Number(workout.summary.volume || 0).toLocaleString()} kg</h4>
                <small>Total Volume</small>
            </div>
            <div class="col-6">
                <h4>${workout.summary.prs ?? 0}</h4>
                <small>New PRs</small>
            </div>
            <div class="col-6">
                <h4>${workout.summary.streak ?? 0}</h4>
                <small>Workout Streak</small>
            </div>
            <div class="col-12">
                <p class="mb-0">
                    Completed<br>
                    <strong>
                        ${new Date(
                            workout.summary.loggedDate ||
                            workout.summary.completedDate ||
                            workout.completedDate
                        ).toLocaleString()}
                    </strong>
                </p>
            </div>
        </div>
    `;
}

// ========================================
// EDIT WORKOUT
// ========================================

function openEditWorkout() {
    const workout = findWorkout();
    if (!workout) {
        showToast("Workout not found.", "error");
        return;
    }

    if (!isWorkoutEditable(workout)) {
        showToast("This workout cannot be edited.", "warning");
        return;
    }

    const nameInput = document.getElementById("editWorkoutName");
    const categoryInput = document.getElementById("editWorkoutCategory");
    const goalInput = document.getElementById("editWorkoutGoal");
    const difficultyInput = document.getElementById("editWorkoutDifficulty");
    const hoursInput = document.getElementById("editWorkoutHours");
    const minutesInput = document.getElementById("editWorkoutMinutes");

    if (nameInput) nameInput.value = workout.name || "";
    if (categoryInput) categoryInput.value = workout.category || "";
    if (goalInput) goalInput.value = workout.goal || "";
    if (difficultyInput) difficultyInput.value = workout.difficulty || "";

    const totalMinutes = Math.max(0, Number(workout.duration) || 0);
    if (hoursInput) hoursInput.value = Math.floor(totalMinutes / 60);
    if (minutesInput) minutesInput.value = totalMinutes % 60;

    const modal = document.getElementById("editWorkoutModal");
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
}

async function saveWorkoutChanges() {
    const workout = findWorkout();
    if (!workout) {
        showToast("Workout not found.", "error");
        return;
    }

    if (!isWorkoutEditable(workout)) {
        showToast("This workout cannot be edited.", "warning");
        return;
    }

    const nameInput = document.getElementById("editWorkoutName");
    const categoryInput = document.getElementById("editWorkoutCategory");
    const goalInput = document.getElementById("editWorkoutGoal");
    const difficultyInput = document.getElementById("editWorkoutDifficulty");
    const hoursInput = document.getElementById("editWorkoutHours");
    const minutesInput = document.getElementById("editWorkoutMinutes");

    const name = nameInput?.value.trim() || "";
    if (!name) {
        showToast("Workout name cannot be empty.", "warning");
        nameInput?.focus();
        return;
    }

    let hours = Math.max(0, Math.min(23, Math.floor(Number(hoursInput?.value) || 0)));
    let minutes = Math.max(0, Math.min(59, Math.floor(Number(minutesInput?.value) || 0)));
    const totalDurationMinutes = hours * 60 + minutes;

    if (totalDurationMinutes <= 0) {
        showToast("Workout duration must be at least 1 minute.", "warning");
        hoursInput?.focus();
        return;
    }

    workout.name = capitalizeWorkoutName(name);
    workout.category = categoryInput?.value || "";
    workout.goal = goalInput?.value || "";
    workout.difficulty = difficultyInput?.value || "";
    workout.duration = totalDurationMinutes;

    const saved = await persistWorkout(workout);
    if (!saved) return;

    displayWorkoutHeader();
    updateFinishWorkoutButton();

    const modal = document.getElementById("editWorkoutModal");
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();

    showToast("Workout updated successfully!", "success");
}

// ========================================
// MIGRATE
// ========================================

function migrateWorkoutExercises() {
    let changed = false;

    workouts.forEach(workout => {
        if (!Array.isArray(workout.exercises)) {
            workout.exercises = [];
            changed = true;
        }

        workout.exercises = workout.exercises.map(oldExercise => {
            if (oldExercise.id !== undefined) return oldExercise;

            const libraryExercise = exerciseLibrary.find(
                e => e.name === oldExercise.name
            );

            if (!libraryExercise) return oldExercise;

            changed = true;

            return {
                ...libraryExercise,
                sets: oldExercise.sets ?? "",
                reps: oldExercise.reps ?? "",
                weight: oldExercise.weight ?? "",
                notes: oldExercise.notes ?? "",
                completed: Boolean(oldExercise.completed),
                volume: Number(oldExercise.volume) || 0,
                calories: Number(oldExercise.calories) || 0
            };
        });

        workout.exerciseCount = workout.exercises.length;
    });

    if (changed && typeof saveWorkouts === "function") {
        saveWorkouts();
    }
}

// ========================================
// EVENTS
// ========================================

if (finishWorkoutBtn) {
    finishWorkoutBtn.addEventListener("click", finishWorkout);
}

if (editWorkoutBtn) {
    editWorkoutBtn.addEventListener("click", openEditWorkout);
}

if (saveWorkoutBtn) {
    saveWorkoutBtn.addEventListener("click", saveWorkoutChanges);
}

if (pauseResumeBtn) {
    pauseResumeBtn.addEventListener("click", async () => {
        const workout = findWorkout();
        if (!workout || workout.completed) return;

        if (isFutureWorkout(workout)) {
            showToast("You cannot start a future workout.", "warning");
            return;
        }

        if (isTooOldWorkout(workout)) {
            showToast(
                "You can only log workouts from the last 7 days.",
                "warning"
            );
            return;
        }

        if (isRunning) {
            await pauseWorkout();
        } else {
            await startWorkout();
        }
    });
}

window.addEventListener("beforeunload", () => {
    clearInterval(timerInterval);
    clearInterval(persistTimerInterval);
    timerInterval = null;
    persistTimerInterval = null;
});

const startTimerInstead = document.getElementById("startTimerInstead");
const finishWithoutTimer = document.getElementById("finishWithoutTimer");

if (startTimerInstead) {
    startTimerInstead.addEventListener("click", () => {
        const modal = document.getElementById("timerWarningModal");
        if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
        startWorkout();
    });
}

if (finishWithoutTimer) {
    finishWithoutTimer.addEventListener("click", () => {
        const modal = document.getElementById("timerWarningModal");
        if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
        completeWorkout();
    });
}

document.addEventListener("click", event => {
    const button = event.target.closest(".exercise-info-btn");
    if (button) openExerciseInfo(button.dataset.id);
});

// ========================================
// INIT
// ========================================

async function initWorkoutPage() {
    if (!workoutId) {
        showToast("No workout selected.", "error");
        return;
    }

    if (typeof syncWorkouts === "function") {
        await syncWorkouts();
    }

    workouts.forEach(normalizeWorkout);
    migrateWorkoutExercises();

    const workout = findWorkout();

    if (!workout) {
        showToast("Workout not found.", "error");
        return;
    }

    const changed = markWorkoutMissed(workout);
    if (changed && workout.missed) {
        await persistWorkout(workout, { silent: true });
    }

    if (exerciseSearch) {
        exerciseSearch.addEventListener("input", () => {
            const value = exerciseSearch.value.toLowerCase().trim();

            const filtered = exerciseLibrary.filter(exercise => {
                const name = String(exercise.name || "").toLowerCase();
                const muscle = String(exercise.muscle || "").toLowerCase();
                const equipment = String(exercise.equipment || "").toLowerCase();
                return (
                    name.includes(value) ||
                    muscle.includes(value) ||
                    equipment.includes(value)
                );
            });

            displayExercises(filtered, exerciseResults);
        });
    }

    const exerciseModal = document.getElementById("exerciseModal");
    if (exerciseModal) {
        exerciseModal.addEventListener("shown.bs.modal", () => {
            if (!exerciseSearch) return;
            exerciseSearch.value = "";
            displayExercises(exerciseLibrary, exerciseResults);
            exerciseSearch.focus();
        });
    }

    displayWorkoutHeader();
    displayExercises(exerciseLibrary, exerciseResults);
    displayWorkoutExercises();
    updateWorkoutProgress();
    initializeWorkoutTimer();
    updateFinishWorkoutButton();

    if (workout.completed) {
        lockCompletedWorkout();
        displayWorkoutSummary();
    }
}

initWorkoutPage();