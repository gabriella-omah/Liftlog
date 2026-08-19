// ========================================
// LiftLog — Home Page
// javascript/home.js
// ========================================

const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

// ========================================
// Welcome Text
// ========================================

const welcomeText = document.getElementById("welcomeText");

/**
 * Greeting rules:
 * - After register / before Settings save → "Welcome to LiftLog"
 * - After user saves profile in Settings  → "Welcome back, FirstName"
 *
 * Registration name is ignored until Settings is saved.
 * Flag: localStorage "liftlogSettingsProfileSaved"
 */
function displayWelcomeText(profileData) {
    if (!welcomeText) return;

    let profile = profileData || null;

    if (!profile) {
        try {
            profile = JSON.parse(
                localStorage.getItem("profile") || "null"
            );
        } catch {
            profile = null;
        }
    }

    const settingsSaved =
        localStorage.getItem("liftlogSettingsProfileSaved") === "true";

    const name =
        settingsSaved && profile && profile.name
            ? String(profile.name).trim()
            : "";

    if (!name) {
        welcomeText.textContent = "Welcome to LiftLog";
        return;
    }

    const firstName = name.split(/\s+/)[0];
    const formattedFirstName =
        firstName.charAt(0).toUpperCase() +
        firstName.slice(1).toLowerCase();

    welcomeText.textContent = `Welcome back, ${formattedFirstName}`;
}

// ========================================
// LOAD HOME PROFILE
// ========================================

async function loadHomeProfile() {
    const session = getLiftLogSession();

    if (!session || !session.access_token) {
        return null;
    }

    try {
        const response = await fetch(
            "http://localhost:5000/api/profile",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            console.error("HOME PROFILE ERROR:", response.status);
            return null;
        }

        const result = await response.json();

        if (!result.profile) {
            return null;
        }

        localStorage.setItem(
            "profile",
            JSON.stringify(result.profile)
        );

        return result.profile;
    } catch (error) {
        console.error("HOME PROFILE LOAD ERROR:", error);
        return null;
    }
}

function formatWorkoutName(name) {
    if (!name) return "Workout";
    const trimmed = String(name).trim();
    if (!trimmed) return "Workout";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// ========================================
// WORKOUT STREAK
// ========================================

const homeWorkoutStreak = document.getElementById("homeWorkoutStreak");

function displayHomeWorkoutStreak() {
    if (!homeWorkoutStreak) return;

    const streakData = getWorkoutStreakData();
    homeWorkoutStreak.textContent = streakData.current;
}

// ========================================
// TODAY'S WORKOUT
// ========================================

const todayWorkout = document.getElementById("todayWorkout");

function displayTodayWorkout() {
    if (!todayWorkout) return;

    const today = getToday();

    let workout = getSortedWorkouts().find(workout => {
        const scheduled = getWorkoutScheduledDate(workout);
        return (
            scheduled &&
            scheduled.getTime() === today.getTime()
        );
    });

    if (!workout) {
        const todayName = days[today.getDay()];
        workout = getSortedWorkouts().find(
            item => item.day === todayName && !item.completed
        );
    }

    if (!workout) {
        if (workouts.length === 0) {
            todayWorkout.innerHTML = `
                <div class="workout-hero">
                    <h3>No workouts yet</h3>
                    <p class="text-muted">
                        Create your first workout
                        to get started.
                    </p>
                </div>
                <a href="workouts.html" class="btn btn-success">
                    Create Workout
                </a>
            `;
        } else {
            todayWorkout.innerHTML = `
                <div class="workout-hero">
                    <h3>Rest Day</h3>
                    <p class="text-muted">
                        No workout scheduled for today.
                    </p>
                </div>
            `;
        }
        return;
    }

    if (workout.completed === true || workout.completedDate) {
        todayWorkout.innerHTML = `
            <div class="workout-hero">
                <h3>${formatWorkoutName(workout.name)} Day</h3>
                <p class="text-success">
                    <i class="bi bi-check-circle-fill"></i>
                    Workout completed today
                </p>
            </div>
            <div class="workout-progress-card">
                <div class="workout-progress-header">
                    <span>
                        <i class="bi bi-check-circle-fill"></i>
                        Today's workout is complete
                    </span>
                    <span>
                        <i class="bi bi-check-lg"></i>
                        Done
                    </span>
                </div>
                <div class="progress workout-progress-bar">
                    <div
                        class="progress-bar bg-success"
                        role="progressbar"
                        style="width:100%"
                    ></div>
                </div>
            </div>
        `;
        return;
    }

    const exercises = Array.isArray(workout.exercises)
        ? workout.exercises
        : [];

    const completedExercises = exercises.filter(
        exercise => exercise.completed === true
    ).length;

    const totalExercises = exercises.length;

    const progress =
        totalExercises === 0
            ? 0
            : Math.round((completedExercises / totalExercises) * 100);

    const workoutInfo = `
        <div class="workout-progress-card">
            <div class="workout-progress-header">
                <span>
                    <i class="bi ${
                        completedExercises > 0
                            ? "bi-check-circle-fill"
                            : "bi-list-check"
                    }"></i>
                    ${
                        completedExercises > 0
                            ? `${completedExercises}/${totalExercises} Exercises Completed`
                            : `${totalExercises} Exercises`
                    }
                </span>
                <span>
                    <i class="bi bi-clock"></i>
                    ${getWorkoutMinutes(workout)}
                </span>
            </div>
            <div class="progress workout-progress-bar">
                <div
                    class="progress-bar bg-success"
                    role="progressbar"
                    style="width:${progress}%"
                ></div>
            </div>
        </div>
    `;

    todayWorkout.innerHTML = `
        <div class="workout-hero">
            <h3>${formatWorkoutName(workout.name)} Day</h3>
            <p class="text-muted">${workout.day || ""}</p>
        </div>
        ${workoutInfo}
        <a href="workout.html?id=${workout.id}" class="btn btn-success">
            ${
                workout.startTime || workout.isPaused
                    ? "Continue Workout"
                    : "Start Workout"
            }
        </a>
    `;
}

// ========================================
// WORKOUT TIME
// ========================================

function getWorkoutMinutes(workout) {
    let totalMinutes = 0;

    if (
        workout.startTime &&
        !workout.isPaused &&
        !workout.completed
    ) {
        const totalSeconds = Math.floor(
            (Date.now() - new Date(workout.startTime).getTime()) / 1000
        );
        totalMinutes = Math.floor(totalSeconds / 60);
    } else if (workout.durationSeconds) {
        totalMinutes = Math.floor(
            Number(workout.durationSeconds) / 60
        );
    } else {
        totalMinutes = Number(workout.duration) || 0;
    }

    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
    }

    return `${hours} ${hours === 1 ? "hr" : "hrs"} ${minutes} min`;
}

// ========================================
// WEEKLY PLANNER
// ========================================

const weeklyPlanner = document.getElementById("weeklyPlanner");

function displayWeeklyPlanner() {
    if (!weeklyPlanner) return;

    weeklyPlanner.innerHTML = "";

    const weekStart = getStartOfWeek();
    const weekEnd = getEndOfWeek();
    const today = getToday();

    const weeklyWorkouts = getSortedWorkouts()
        .filter(workout => {
            if (!workout.scheduledDate) return false;

            const scheduled = parseLocalDate(workout.scheduledDate);
            if (!scheduled) return false;

            return scheduled >= weekStart && scheduled < weekEnd;
        })
        .sort((a, b) => {
            return (
                parseLocalDate(a.scheduledDate) -
                parseLocalDate(b.scheduledDate)
            );
        });

    if (weeklyWorkouts.length === 0) {
        weeklyPlanner.innerHTML = `
            <div class="text-center text-muted py-3">
                No workouts scheduled this week.
            </div>
        `;
        return;
    }

    weeklyWorkouts.forEach(workout => {
        const scheduled = parseLocalDate(workout.scheduledDate);

        let statusClass = "pending";
        let statusIcon = `<i class="bi bi-circle"></i>`;

        if (workout.completed === true || workout.completedDate) {
            statusClass = "completed";
            statusIcon = `<i class="bi bi-check-lg"></i>`;
        } else if (scheduled.getTime() === today.getTime()) {
            statusClass = "active";
            statusIcon = `<i class="bi bi-lightning-charge-fill"></i>`;
        } else if (scheduled < today) {
            statusClass = "missed";
            statusIcon = `<i class="bi bi-x-circle-fill"></i>`;
        }

        const workoutLabel = formatWorkoutName(workout.name);

        weeklyPlanner.innerHTML += `
            <div
                class="planner-item ${statusClass}"
                data-id="${workout.id}"
            >
                <div class="planner-day">
                    ${scheduled
                        .toLocaleDateString(undefined, {
                            weekday: "short"
                        })
                        .toUpperCase()}
                </div>
                <div class="planner-workout">
                    ${workoutLabel}
                </div>
                <div class="planner-status">
                    ${statusIcon}
                </div>
            </div>
        `;
    });

    const activeWorkout = weeklyPlanner.querySelector(
        ".planner-item.active"
    );

    if (activeWorkout) {
        activeWorkout.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest"
        });
    }

    weeklyPlanner.querySelectorAll(".planner-item").forEach(item => {
        item.addEventListener("click", () => {
            const id = item.dataset.id;
            if (id) {
                window.location.href = `workout.html?id=${id}`;
            }
        });
    });
}

// ========================================
// DAILY FOCUS
// ========================================

const motivationText = document.getElementById("motivationText");

const quotes = [
    "Consistency beats intensity.",
    "Progress, not perfection.",
    "Strong today. Stronger tomorrow.",
    "Discipline beats motivation.",
    "Every rep counts.",
    "You don't have to be extreme, just consistent.",
    "Success starts with showing up.",
    "Train your mind. Your body will follow.",
    "Small improvements every day add up.",
    "Push yourself because no one else will do it for you.",
    "Dream big. Lift bigger.",
    "Your only competition is yesterday's you.",
    "One workout at a time.",
    "Hard work beats talent when talent doesn't work hard.",
    "Fitness is a journey, not a destination."
];

function displayDailyQuote() {
    if (!motivationText) return;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayNumber = Math.floor(diff / oneDay);

    motivationText.textContent =
        quotes[dayNumber % quotes.length];
}

// ========================================
// CLEAN STALE RECOMMENDED WORKOUTS
// ========================================

function removeStaleRecommendedWorkouts() {
    const currentWeekStart = getStartOfWeek();
    const beforeCount = workouts.length;

    workouts = workouts.filter(workout => {
        if (workout.source !== "recommended") return true;
        if (workout.completed === true) return true;

        const scheduled = parseLocalDate(workout.scheduledDate);
        if (!scheduled) return false;

        return scheduled >= currentWeekStart;
    });

    if (workouts.length !== beforeCount) {
        saveWorkouts();
    }
}

// ========================================
// INITIALIZE HOME
// ========================================

async function initializeHome() {
    try {
        const profile = await loadHomeProfile();

        await syncWorkouts();
        removeStaleRecommendedWorkouts();

        displayWelcomeText(profile);
        displayDailyQuote();
        displayWeeklyPlanner();
        displayTodayWorkout();
        displayHomeWorkoutStreak();
    } catch (error) {
        console.error("HOME INITIALIZATION ERROR:", error);

        let localProfile = null;
        try {
            localProfile = JSON.parse(
                localStorage.getItem("profile") || "null"
            );
        } catch {
            localProfile = null;
        }

        displayWelcomeText(localProfile);
        displayDailyQuote();
        displayWeeklyPlanner();
        displayTodayWorkout();
        displayHomeWorkoutStreak();
    }
}

// ========================================
// START
// ========================================

document.addEventListener("DOMContentLoaded", initializeHome);