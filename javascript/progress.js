// ========================================
// LiftLog — Progress Page
// javascript/progress.js
// ========================================


// ======================================================
// DOM ELEMENTS
// ======================================================

const totalWorkouts =
    document.getElementById("totalWorkouts");

const totalExercises =
    document.getElementById("totalExercises");

const completionRate =
    document.getElementById("completionRate");

const workoutHistory =
    document.getElementById("workoutHistory");

const personalRecordsContainer =
    document.getElementById("personalRecords");

const achievements =
    document.getElementById("achievements");

const calendar =
    document.getElementById("calendar");

const exportBtn =
    document.getElementById("exportBtn");

const longestStreak =
    document.getElementById("longestStreak");

const strength =
    document.getElementById("displayStrength");

const strengthExercise =
    document.getElementById("displayStrengthExercise");

const caloriesBurned =
    document.getElementById("caloriesBurned");

const totalTrainingTime =
    document.getElementById("totalTrainingTime");

const workoutStreak =
    document.getElementById("workoutStreak");

const exportWorkoutBtn =
    document.getElementById("exportWorkoutBtn");

const calendarMonth =
    document.getElementById("calendarMonth");

const previousMonthBtn =
    document.getElementById("previousMonthBtn");

const nextMonthBtn =
    document.getElementById("nextMonthBtn");

const calendarWorkoutModal =
    document.getElementById("calendarWorkoutModal");

const calendarModalDate =
    document.getElementById("calendarModalDate");

const calendarModalStatus =
    document.getElementById("calendarModalStatus");

const calendarModalBody =
    document.getElementById("calendarModalBody");


// ======================================================
// STATE
// ======================================================

let weeklyChart = null;

let userWorkouts = [];

let totalSeconds = 0;

let totalVolumeKg = 0;

let totalCalories = 0;

let calendarDate = new Date();


// ======================================================
// SESSION
// ======================================================

function getCurrentProgressSession() {

    if (
        typeof getLiftLogSession !==
        "function"
    ) {
        console.error(
            "Session manager is not loaded."
        );

        return null;
    }

    return getLiftLogSession();
}


// ======================================================
// DATE HELPERS
// ======================================================

function normalizeDateOnly(value) {

    if (!value) {
        return null;
    }

    if (value instanceof Date) {

        const clone =
            new Date(value);

        if (
            Number.isNaN(
                clone.getTime()
            )
        ) {
            return null;
        }

        clone.setHours(
            0,
            0,
            0,
            0
        );

        return clone;
    }

    const raw =
        String(value).trim();

    if (!raw) {
        return null;
    }

    // YYYY-MM-DD should remain local.
    const dateOnlyMatch =
        raw.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (dateOnlyMatch) {

        const year =
            Number(dateOnlyMatch[1]);

        const month =
            Number(dateOnlyMatch[2]) - 1;

        const day =
            Number(dateOnlyMatch[3]);

        const localDate =
            new Date(
                year,
                month,
                day
            );

        localDate.setHours(
            0,
            0,
            0,
            0
        );

        return localDate;
    }

    const date =
        new Date(raw);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}


function calendarDateKey(date) {

    const d =
        normalizeDateOnly(date);

    if (!d) {
        return null;
    }

    return [
        d.getFullYear(),
        String(
            d.getMonth() + 1
        ).padStart(2, "0"),
        String(
            d.getDate()
        ).padStart(2, "0")
    ].join("-");
}


function getTodayProgress() {

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


function getStartOfProgressWeek(
    date = new Date()
) {

    const d =
        new Date(date);

    d.setHours(
        0,
        0,
        0,
        0
    );

    d.setDate(
        d.getDate() - d.getDay()
    );

    return d;
}


function getEndOfProgressWeek(
    date = new Date()
) {

    const end =
        getStartOfProgressWeek(
            date
        );

    end.setDate(
        end.getDate() + 7
    );

    return end;
}


function isThisProgressWeek(value) {

    const date =
        normalizeDateOnly(value);

    if (!date) {
        return false;
    }

    return (
        date >=
            getStartOfProgressWeek() &&
        date <
            getEndOfProgressWeek()
    );
}


function isSameCalendarDay(
    date1,
    date2
) {

    const first =
        normalizeDateOnly(date1);

    const second =
        normalizeDateOnly(date2);

    if (
        !first ||
        !second
    ) {
        return false;
    }

    return (
        first.getFullYear() ===
            second.getFullYear() &&
        first.getMonth() ===
            second.getMonth() &&
        first.getDate() ===
            second.getDate()
    );
}


function isDateInPast(date) {

    const comparison =
        normalizeDateOnly(date);

    if (!comparison) {
        return false;
    }

    return (
        comparison <
        getTodayProgress()
    );
}


// ======================================================
// WORKOUT NORMALIZATION
// ======================================================

function normalizeProgressWorkout(
    workout
) {

    if (!workout) {
        return null;
    }

    const normalized = {
        ...workout
    };

    normalized.exercises =
        Array.isArray(
            workout.exercises
        )
            ? workout.exercises
            : [];

    normalized.scheduledDate =
        workout.scheduledDate ||
        workout.scheduled_date ||
        null;

    normalized.completedDate =
        workout.completedDate ||
        workout.completed_date ||
        null;

    normalized.startTime =
        workout.startTime ||
        workout.start_time ||
        null;

    normalized.durationSeconds =
        Number(
            workout.durationSeconds ??
            workout.duration_seconds ??
            0
        );

    normalized.actualDurationMinutes =
        Number(
            workout.actualDurationMinutes ??
            workout.actual_duration_minutes ??
            0
        );

    normalized.duration =
        Number(
            workout.duration
        ) || 0;

    normalized.completed =
        workout.completed === true ||
        Boolean(
            normalized.completedDate
        );

    normalized.missed =
        workout.missed === true;

    return normalized;
}


// ======================================================
// WORKOUT STATUS
// ======================================================

function isCompletedWorkout(
    workout
) {

    return Boolean(
        workout &&
        (
            workout.completed === true ||
            workout.completedDate
        )
    );
}


function isMissedWorkout(
    workout
) {

    if (!workout) {
        return false;
    }

    if (
        isCompletedWorkout(
            workout
        )
    ) {
        return false;
    }

    if (
        workout.missed === true
    ) {
        return true;
    }

    const scheduled =
        normalizeDateOnly(
            workout.scheduledDate
        );

    if (!scheduled) {
        return false;
    }

    return (
        scheduled <
        getTodayProgress()
    );
}


function isUpcomingWorkout(
    workout
) {

    if (!workout) {
        return false;
    }

    if (
        isCompletedWorkout(
            workout
        )
    ) {
        return false;
    }

    const scheduled =
        normalizeDateOnly(
            workout.scheduledDate
        );

    if (!scheduled) {
        return false;
    }

    return (
        scheduled >
        getTodayProgress()
    );
}


// ======================================================
// WEIGHT HELPERS
// ======================================================

function getWorkoutExerciseWeightKg(
    exercise
) {

    if (!exercise) {
        return 0;
    }

    // Preferred canonical KG value.
    if (
        exercise.weightKg != null
    ) {

        const canonical =
            Number(
                exercise.weightKg
            );

        if (
            Number.isFinite(
                canonical
            )
        ) {
            return canonical;
        }
    }

    const displayWeight =
        Number(
            exercise.weight
        ) || 0;

    if (
        typeof convertToKg ===
        "function"
    ) {

        const converted =
            Number(
                convertToKg(
                    displayWeight
                )
            );

        if (
            Number.isFinite(
                converted
            )
        ) {
            return converted;
        }
    }

    return displayWeight;
}


function formatProgressWeight(
    weightKg
) {

    const value =
        Number(
            weightKg
        ) || 0;

    if (
        typeof formatWeight ===
        "function"
    ) {

        return formatWeight(
            value
        );
    }

    return value
        .toFixed(1)
        .replace(
            /\.0$/,
            ""
        );
}


function getProgressWeightUnit() {

    if (
        typeof weightUnit !==
        "undefined"
    ) {
        return weightUnit;
    }

    return "kg";
}


// ======================================================
// EXERCISE STATISTICS
// ======================================================

function getExerciseStats(
    exercise
) {

    const sets =
        Number(
            exercise?.sets
        ) || 0;

    const reps =
        Number(
            exercise?.reps
        ) || 0;

    const weightKg =
        getWorkoutExerciseWeightKg(
            exercise
        );

    const volumeKg =
        sets *
        reps *
        weightKg;

    return {
        sets,
        reps,
        weightKg,
        volumeKg
    };
}


// ======================================================
// PERSONAL RECORDS
// ======================================================

function calculatePersonalRecordsFromWorkouts() {

    const records = {};

    userWorkouts
        .filter(
            isCompletedWorkout
        )
        .forEach(
            workout => {

                (
                    workout.exercises ||
                    []
                ).forEach(
                    exercise => {

                        if (
                            !exercise ||
                            !exercise.name
                        ) {
                            return;
                        }

                        const weightKg =
                            getWorkoutExerciseWeightKg(
                                exercise
                            );

                        if (
                            weightKg <= 0
                        ) {
                            return;
                        }

                        const current =
                            Number(
                                records[
                                    exercise.name
                                ]
                            ) || 0;

                        if (
                            weightKg >
                            current
                        ) {

                            records[
                                exercise.name
                            ] =
                                weightKg;
                        }
                    }
                );
            }
        );

    // Important:
    // Do not redeclare personalRecordsData.
    // data.js already owns that variable.
    if (
        typeof personalRecordsData !==
        "undefined"
    ) {

        personalRecordsData =
            records;
    }

    return records;
}


// ======================================================
// PROGRESS STATS
// ======================================================

function displayProgress() {

    const completedWorkouts =
        userWorkouts.filter(
            isCompletedWorkout
        );

    const scheduledWorkouts =
        userWorkouts.filter(
            workout =>
                Boolean(
                    workout.scheduledDate
                )
        );

    const missedWorkouts =
        scheduledWorkouts.filter(
            isMissedWorkout
        );

    // ----------------------------------------------
    // TOTAL COMPLETED WORKOUTS
    // ----------------------------------------------

    if (totalWorkouts) {

        totalWorkouts.textContent =
            completedWorkouts.length;
    }

    // ----------------------------------------------
    // TOTAL COMPLETED EXERCISES
    // ----------------------------------------------

    let exercisesCount =
        0;

    completedWorkouts.forEach(
        workout => {

            exercisesCount +=
                (
                    workout.exercises ||
                    []
                ).filter(
                    exercise =>
                        exercise.completed === true
                ).length;
        }
    );

    if (totalExercises) {

        totalExercises.textContent =
            exercisesCount;
    }

    // ----------------------------------------------
    // COMPLETION RATE
    // ----------------------------------------------

    const denominator =
        scheduledWorkouts.length;

    const completionRateValue =
        denominator === 0
            ? 0
            : Math.round(
                (
                    completedWorkouts.length /
                    denominator
                ) * 100
            );

    if (completionRate) {

        completionRate.textContent =
            `${completionRateValue}%`;
    }

    // ----------------------------------------------
    // TRAINING TIME
    // ----------------------------------------------

    totalSeconds =
        0;

    completedWorkouts.forEach(
        workout => {

            let seconds =
                Number(
                    workout.durationSeconds
                ) || 0;

            if (
                seconds === 0 &&
                Number(
                    workout.actualDurationMinutes
                ) > 0
            ) {

                seconds =
                    Number(
                        workout.actualDurationMinutes
                    ) * 60;
            }

            totalSeconds +=
                seconds;
        }
    );

    const hours =
        Math.floor(
            totalSeconds / 3600
        );

    const minutes =
        Math.floor(
            (
                totalSeconds % 3600
            ) / 60
        );

    if (totalTrainingTime) {

        totalTrainingTime.textContent =
            hours > 0
                ? `${hours} hr ${minutes} min`
                : `${minutes} min`;
    }

    // ----------------------------------------------
    // TOTAL VOLUME + CALORIES
    // ----------------------------------------------

    totalVolumeKg =
        0;

    totalCalories =
        0;

    completedWorkouts.forEach(
        workout => {

            (
                workout.exercises ||
                []
            ).forEach(
                exercise => {

                    const stats =
                        getExerciseStats(
                            exercise
                        );

                    totalVolumeKg +=
                        stats.volumeKg;

                    totalCalories +=
                        Number(
                            exercise.calories
                        ) || 0;
                }
            );
        }
    );

    // Workout-level calorie fallback.
    completedWorkouts.forEach(
        workout => {

            const exerciseCalories =
                (
                    workout.exercises ||
                    []
                ).reduce(
                    (
                        total,
                        exercise
                    ) =>
                        total +
                        (
                            Number(
                                exercise.calories
                            ) || 0
                        ),
                    0
                );

            if (
                exerciseCalories === 0
            ) {

                const summaryCalories =
                    Number(
                        workout.summary?.calories
                    ) || 0;

                if (
                    summaryCalories > 0
                ) {

                    totalCalories +=
                        summaryCalories;

                } else {

                    const seconds =
                        Number(
                            workout.durationSeconds
                        ) || 0;

                    totalCalories +=
                        Math.round(
                            (
                                seconds / 60
                            ) * 8
                        );
                }
            }
        }
    );

    displayWorkoutStreak();
    displayPersonalRecords();
    displayStrength();
    displayCalories();

    // Optional debug information.
    console.log(
        "Progress totals:",
        {
            completedWorkouts:
                completedWorkouts.length,
            missedWorkouts:
                missedWorkouts.length,
            scheduledWorkouts:
                scheduledWorkouts.length,
            exercises:
                exercisesCount,
            totalSeconds,
            totalVolumeKg,
            totalCalories
        }
    );
}


// ======================================================
// WORKOUT HISTORY
// ======================================================

function buildHistoryCard(
    workout
) {

    const date =
        normalizeDateOnly(
            workout.completedDate
        );

    const formattedDate =
        date
            ? date.toLocaleDateString(
                undefined,
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            )
            : "Unknown date";

    const exerciseCount =
        (
            workout.exercises ||
            []
        ).filter(
            exercise =>
                exercise.completed === true
        ).length;

    let duration =
        "Not recorded";

    let durationSeconds =
        Number(
            workout.durationSeconds
        ) || 0;

    if (
        durationSeconds === 0 &&
        Number(
            workout.actualDurationMinutes
        ) > 0
    ) {

        durationSeconds =
            Number(
                workout.actualDurationMinutes
            ) * 60;
    }

    if (
        durationSeconds > 0
    ) {

        const totalMinutes =
            Math.floor(
                durationSeconds /
                60
            );

        const hours =
            Math.floor(
                totalMinutes /
                60
            );

        const minutes =
            totalMinutes %
            60;

        duration =
            hours > 0
                ? `${hours} hr ${minutes} min`
                : `${minutes} min`;
    }

    return `
        <div
            class="history-card"
            data-workout-id="${workout.id}"
        >

            <div class="history-top">

                <div>

                    <h4>
                        ${workout.name || "Workout"}
                    </h4>

                    <span class="history-date">

                        <i class="bi bi-calendar3"></i>

                        ${formattedDate}

                    </span>

                </div>

                <span class="history-status">

                    <i class="bi bi-check-circle-fill"></i>

                    Completed

                </span>

            </div>

            <div class="history-meta">

                <span>

                    <i class="bi bi-list-check"></i>

                    ${exerciseCount} Exercises

                </span>

                <span>

                    <i class="bi bi-stopwatch"></i>

                    ${duration}

                </span>

            </div>

        </div>
    `;
}


function displayWorkoutHistory() {

    if (!workoutHistory) {
        return;
    }

    workoutHistory.innerHTML =
        "";

    const completed =
        userWorkouts
            .filter(
                isCompletedWorkout
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.completedDate
                    ) -
                    new Date(
                        a.completedDate
                    )
            );

    if (
        completed.length === 0
    ) {

        workoutHistory.innerHTML = `
            <div class="empty-state">

                <i class="bi bi-clock-history"></i>

                <h4>
                    No workout history
                </h4>

                <p>
                    Complete your first workout
                    to start building your history.
                </p>

            </div>
        `;

        return;
    }

    let visibleCount =
        5;

    const renderHistory =
        () => {

            workoutHistory.innerHTML =
                "";

            completed
                .slice(
                    0,
                    visibleCount
                )
                .forEach(
                    workout => {

                        workoutHistory.innerHTML +=
                            buildHistoryCard(
                                workout
                            );
                    }
                );

            if (
                visibleCount <
                completed.length
            ) {

                workoutHistory.innerHTML += `
                    <button
                        id="loadHistoryBtn"
                        class="btn btn-outline-success w-100 mt-3"
                        type="button"
                    >

                        <i class="bi bi-clock-history"></i>

                        Load More Workouts
                        (${completed.length - visibleCount})

                    </button>
                `;

                const button =
                    document.getElementById(
                        "loadHistoryBtn"
                    );

                if (button) {

                    button.onclick =
                        () => {

                            visibleCount =
                                completed.length;

                            renderHistory();
                        };
                }
            }
        };

    renderHistory();
}


// ======================================================
// STREAK
// ======================================================

function calculateProgressStreaks() {

// streak.js is the single source of truth
// for scheduled-workout streak logic.
if (
    typeof getWorkoutStreakData ===
    "function"
) {
    return getWorkoutStreakData();
}
// Safety fallback if streak.js
// has not been loaded.
return {
    current: 0,
    longest: 0
};

}


function displayWorkoutStreak() {

    const streaks =
        calculateProgressStreaks();

    if (workoutStreak) {

        workoutStreak.textContent =
            streaks.current;
    }

    if (longestStreak) {

        longestStreak.textContent =
            streaks.longest;
    }
}


// ======================================================
// PERSONAL RECORDS DISPLAY
// ======================================================

function displayPersonalRecords() {

    if (
        !personalRecordsContainer
    ) {
        return;
    }

    personalRecordsContainer.innerHTML =
        "";

    const records =
        (
            typeof personalRecordsData !==
            "undefined"
        )
            ? personalRecordsData
            : {};

    const entries =
        Object.entries(
            records
        ).sort(
            (
                a,
                b
            ) =>
                Number(b[1]) -
                Number(a[1])
        );

    if (
        entries.length === 0
    ) {

        personalRecordsContainer.innerHTML = `
            <p class="personal-text">
                No personal records yet.
            </p>
        `;

        return;
    }

    entries.forEach(
        (
            [
                exercise,
                weightKg
            ]
        ) => {

            personalRecordsContainer.innerHTML += `
                <div class="pr-item">

                    <div class="pr-left">

                        <div class="pr-icon">

                            <i class="bi bi-trophy-fill"></i>

                        </div>

                        <div class="pr-name">

                            ${exercise}

                        </div>

                    </div>

                    <div class="pr-weight">

                        ${formatProgressWeight(weightKg)}
                        ${getProgressWeightUnit()}

                    </div>

                </div>
            `;
        }
    );
}


// ======================================================
// STRENGTH
// ======================================================

function displayStrength() {

    if (!strength) {
        return;
    }

    const records =
        (
            typeof personalRecordsData !==
            "undefined"
        )
            ? personalRecordsData
            : {};

    const entries =
        Object.entries(
            records
        );

    if (
        entries.length === 0
    ) {

        strength.textContent =
            "0";

        if (strengthExercise) {

            strengthExercise.textContent =
                "--";
        }

        return;
    }

    let strongestExercise =
        "";

    let strongestWeightKg =
        0;

    entries.forEach(
        (
            [
                exercise,
                weightKg
            ]
        ) => {

            const value =
                Number(
                    weightKg
                ) || 0;

            if (
                value >
                strongestWeightKg
            ) {

                strongestWeightKg =
                    value;

                strongestExercise =
                    exercise;
            }
        }
    );

    strength.textContent =
        `${formatProgressWeight(
            strongestWeightKg
        )} ${getProgressWeightUnit()}`;

    if (strengthExercise) {

        strengthExercise.textContent =
            strongestExercise ||
            "--";
    }
}


// ======================================================
// CALORIES
// ======================================================

function displayCalories() {

    if (!caloriesBurned) {
        return;
    }

    caloriesBurned.textContent =
        Math.round(
            totalCalories
        ).toLocaleString();
}


// ======================================================
// ACHIEVEMENTS
// ======================================================

function displayAchievements() {

    if (!achievements) {
        return;
    }

    achievements.innerHTML =
        "";

    const completed =
        userWorkouts.filter(
            isCompletedWorkout
        ).length;

    const totalHours =
        totalSeconds /
        3600;

    const totalPRs =
        (
            typeof personalRecordsData !==
            "undefined"
        )
            ? Object.keys(
                personalRecordsData
            ).length
            : 0;

    const groups = [

        {
            title:
                "Workout Milestones",

            icon:
                "bi bi-flag-fill",

            items: [

                {
                    title:
                        "First Workout",

                    unlocked:
                        completed >= 1
                },

                {
                    title:
                        "20 Workouts",

                    unlocked:
                        completed >= 20
                },

                {
                    title:
                        "50 Workouts",

                    unlocked:
                        completed >= 50
                },

                {
                    title:
                        "100 Workouts",

                    unlocked:
                        completed >= 100
                },

                {
                    title:
                        "250 Workouts",

                    unlocked:
                        completed >= 250
                },

                {
                    title:
                        "500 Workouts",

                    unlocked:
                        completed >= 500
                }

            ]
        },

        {
            title:
                "Personal Records",

            icon:
                "bi bi-trophy",

            items: [

                {
                    title:
                        "First Personal Record",

                    unlocked:
                        totalPRs >= 1
                },

                {
                    title:
                        "10 Personal Records",

                    unlocked:
                        totalPRs >= 10
                },

                {
                    title:
                        "25 Personal Records",

                    unlocked:
                        totalPRs >= 25
                },

                {
                    title:
                        "50 Personal Records",

                    unlocked:
                        totalPRs >= 50
                }

            ]
        },

        {
            title:
                "Training Time",

            icon:
                "bi bi-stopwatch",

            items: [

                {
                    title:
                        "20 Hours Trained",

                    unlocked:
                        totalHours >= 20
                },

                {
                    title:
                        "50 Hours Trained",

                    unlocked:
                        totalHours >= 50
                },

                {
                    title:
                        "100 Hours Trained",

                    unlocked:
                        totalHours >= 100
                },

                {
                    title:
                        "250 Hours Trained",

                    unlocked:
                        totalHours >= 250
                }

            ]
        }

    ];

    groups.forEach(
        group => {

            achievements.innerHTML += `
                <div class="achievement-group">

                    <div class="achievement-group-header">

                        <i class="${group.icon}"></i>

                        <h4>
                            ${group.title}
                        </h4>

                    </div>

                    <div class="achievement-list">

                        ${
                            group.items
                                .map(
                                    item => `
                                        <div
                                            class="achievement-row ${
                                                item.unlocked
                                                    ? "unlocked"
                                                    : "locked"
                                            }"
                                        >

                                            <span>
                                                ${item.title}
                                            </span>

                                            <i
                                                class="bi ${
                                                    item.unlocked
                                                        ? "bi-check-circle-fill"
                                                        : "bi-lock-fill"
                                                }"
                                            ></i>

                                        </div>
                                    `
                                )
                                .join("")
                        }

                    </div>

                </div>
            `;
        }
    );
}


// ======================================================
// CALENDAR DATA
// ======================================================

function getCompletedWorkoutsForDate(
    date
) {

    return userWorkouts.filter(
        workout => {

            if (
                !isCompletedWorkout(
                    workout
                )
            ) {
                return false;
            }

            return isSameCalendarDay(
                workout.completedDate,
                date
            );
        }
    );
}


function getScheduledWorkoutsForDate(
    date
) {

    const key =
        calendarDateKey(
            date
        );

    const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    const dayName =
        dayNames[
            date.getDay()
        ];

    return userWorkouts.filter(
        workout => {

            if (
                workout.scheduledDate
            ) {

                return (
                    String(
                        workout.scheduledDate
                    ).slice(
                        0,
                        10
                    ) === key
                );
            }

            return (
                workout.day ===
                dayName
            );
        }
    );
}


function getCalendarDayStatus(
    date
) {

    const completedWorkouts =
        getCompletedWorkoutsForDate(
            date
        );

    const scheduledWorkouts =
        getScheduledWorkoutsForDate(
            date
        );

    if (
        completedWorkouts.length >
        0
    ) {

        return "completed";
    }

    if (
        scheduledWorkouts.some(
            isMissedWorkout
        )
    ) {

        return "missed";
    }

    if (
        !isDateInPast(
            date
        )
    ) {

        if (
            scheduledWorkouts.length >
            0
        ) {

            return "upcoming";
        }

        return "rest";
    }

    if (
        scheduledWorkouts.length >
        0
    ) {

        return "missed";
    }

    return "rest";
}


// ======================================================
// CALENDAR DISPLAY
// ======================================================

function displayCalendar() {

    if (!calendar) {
        return;
    }

    calendar.innerHTML =
        "";

    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();

    if (calendarMonth) {

        calendarMonth.textContent =
            calendarDate.toLocaleDateString(
                undefined,
                {
                    month:
                        "long",

                    year:
                        "numeric"
                }
            );
    }

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "calendar-day empty";

        calendar.appendChild(
            empty
        );
    }

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );

        date.setHours(
            0,
            0,
            0,
            0
        );

        const status =
            getCalendarDayStatus(
                date
            );

        const dayElement =
            document.createElement(
                "button"
            );

        dayElement.type =
            "button";

        dayElement.className =
            `calendar-day ${status}`;

        if (
            isSameCalendarDay(
                date,
                new Date()
            )
        ) {

            dayElement.classList.add(
                "today"
            );
        }

        const number =
            document.createElement(
                "span"
            );

        number.className =
            "calendar-day-number";

        number.textContent =
            day;

        dayElement.appendChild(
            number
        );

        const indicator =
            document.createElement(
                "span"
            );

        indicator.className =
            "calendar-day-indicator";

        if (
            status === "completed"
        ) {

            indicator.innerHTML =
                '<i class="bi bi-check-lg"></i>';

        } else if (
            status === "missed"
        ) {

            indicator.innerHTML =
                '<i class="bi bi-x-lg"></i>';
        }

        dayElement.appendChild(
            indicator
        );

        dayElement.addEventListener(
            "click",
            () =>
                openCalendarDay(
                    date,
                    status
                )
        );

        calendar.appendChild(
            dayElement
        );
    }

    const currentCells =
        calendar.children.length;

    const remaining =
        42 -
        currentCells;

    for (
        let i = 0;
        i < remaining;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "calendar-day empty";

        calendar.appendChild(
            empty
        );
    }
}


// ======================================================
// CALENDAR DETAILS
// ======================================================

function formatWorkoutDuration(
    seconds
) {

    const total =
        Number(
            seconds
        ) || 0;

    const hours =
        Math.floor(
            total / 3600
        );

    const minutes =
        Math.floor(
            (
                total % 3600
            ) / 60
        );

    if (
        hours > 0
    ) {

        return `${hours} hr ${minutes} min`;
    }

    return `${minutes} min`;
}


function buildCompletedWorkoutDetails(
    completedWorkouts
) {

    if (
        completedWorkouts.length === 0
    ) {

        return `
            <p>
                Workout completed.
            </p>
        `;
    }

    const unit =
        getProgressWeightUnit();

    return completedWorkouts
        .map(
            workout => {

                const completedExercises =
                    (
                        workout.exercises ||
                        []
                    ).filter(
                        exercise =>
                            exercise.completed === true
                    ).length;

                const durationSeconds =
                    Number(
                        workout.durationSeconds
                    ) ||
                    (
                        Number(
                            workout.actualDurationMinutes
                        ) || 0
                    ) * 60;

                const duration =
                    durationSeconds > 0
                        ? formatWorkoutDuration(
                            durationSeconds
                        )
                        : "--";

                const volumeKg =
                    (
                        workout.exercises ||
                        []
                    ).reduce(
                        (
                            total,
                            exercise
                        ) =>
                            total +
                            getExerciseStats(
                                exercise
                            ).volumeKg,
                        0
                    );

                const calories =
                    Number(
                        workout.summary?.calories
                    ) ||
                    (
                        workout.exercises ||
                        []
                    ).reduce(
                        (
                            total,
                            exercise
                        ) =>
                            total +
                            (
                                Number(
                                    exercise.calories
                                ) || 0
                            ),
                        0
                    ) ||
                    Math.round(
                        (
                            durationSeconds /
                            60
                        ) * 8
                    );

                const displayVolume =
                    formatProgressWeight(
                        volumeKg
                    );

                return `
                    <div class="calendar-workout-detail">

                        <div class="calendar-detail-header">

                            <div>

                                <h3>
                                    ${workout.name || "Workout"}
                                </h3>

                                <span>
                                    ${workout.category || "Workout"}
                                </span>

                            </div>

                            <div class="calendar-success-icon">

                                <i class="bi bi-check-lg"></i>

                            </div>

                        </div>

                        <div class="calendar-stat-grid">

                            <div>

                                <strong>
                                    ${duration}
                                </strong>

                                <span>
                                    Duration
                                </span>

                            </div>

                            <div>

                                <strong>
                                    ${completedExercises}/${(
                                        workout.exercises ||
                                        []
                                    ).length}
                                </strong>

                                <span>
                                    Exercises
                                </span>

                            </div>

                            <div>

                                <strong>
                                    ${Number(
                                        calories
                                    ).toLocaleString()}
                                </strong>

                                <span>
                                    Calories
                                </span>

                            </div>

                            <div>

                                <strong>
                                    ${displayVolume}${unit}
                                </strong>

                                <span>
                                    Volume
                                </span>

                            </div>

                        </div>

                        <hr>

                        <h5 class="mb-3">
                            Exercises
                        </h5>

                        <div class="calendar-exercise-list">

                            ${
                                (
                                    workout.exercises ||
                                    []
                                ).length === 0
                                    ? `
                                        <p class="text-muted">
                                            No exercises recorded.
                                        </p>
                                    `
                                    : (
                                        workout.exercises ||
                                        []
                                    )
                                        .map(
                                            exercise => {

                                                const stats =
                                                    getExerciseStats(
                                                        exercise
                                                    );

                                                const displayWeight =
                                                    stats.weightKg >
                                                    0
                                                        ? `${formatProgressWeight(
                                                            stats.weightKg
                                                        )}${unit}`
                                                        : "";

                                                return `
                                                    <div class="calendar-exercise-row">

                                                        <div>

                                                            <strong>
                                                                ${exercise.name || ""}
                                                            </strong>

                                                            <small>
                                                                ${exercise.muscle || ""}
                                                            </small>

                                                        </div>

                                                        <div class="calendar-exercise-values">

                                                            ${stats.sets}
                                                            ×
                                                            ${stats.reps}

                                                            ${
                                                                displayWeight
                                                                    ? ` • ${displayWeight}`
                                                                    : ""
                                                            }

                                                        </div>

                                                    </div>
                                                `;
                                            }
                                        )
                                        .join("")
                            }

                        </div>

                    </div>
                `;
            }
        )
        .join("<hr>");
}


function buildMissedWorkoutDetails(
    scheduledWorkouts
) {

    return `
        <div class="calendar-empty-state">

            <div class="calendar-status-icon missed-icon">

                <i class="bi bi-x-lg"></i>

            </div>

            <h4>
                Workout Missed
            </h4>

            <p>
                You had a workout scheduled
                for this day, but it was
                not completed.
            </p>

        </div>

        ${
            scheduledWorkouts.length > 0
                ? `
                    <div class="scheduled-workouts">

                        <h5>
                            Scheduled Workout
                        </h5>

                        ${scheduledWorkouts
                            .map(
                                workout => `
                                    <div class="scheduled-workout-item">

                                        <i class="bi bi-calendar-x"></i>

                                        <div>

                                            <strong>
                                                ${workout.name || "Workout"}
                                            </strong>

                                            <small>
                                                ${workout.category || "Workout"}
                                            </small>

                                        </div>

                                    </div>
                                `
                            )
                            .join("")}

                    </div>
                `
                : ""
        }
    `;
}


function buildUpcomingWorkoutDetails(
    scheduledWorkouts
) {

    if (
        scheduledWorkouts.length === 0
    ) {

        return `
            <div class="calendar-empty-state">

                <div class="calendar-status-icon upcoming-icon">

                    <i class="bi bi-calendar-event"></i>

                </div>

                <h4>
                    Upcoming Day
                </h4>

                <p>
                    No workout is currently
                    scheduled for this day.
                </p>

            </div>
        `;
    }

    return `
        <div class="calendar-empty-state">

            <div class="calendar-status-icon upcoming-icon">

                <i class="bi bi-calendar-event"></i>

            </div>

            <h4>
                Upcoming Workout
            </h4>

            <p>
                You have a workout scheduled
                for this day.
            </p>

        </div>

        <div class="scheduled-workouts">

            ${
                scheduledWorkouts
                    .map(
                        workout => `
                            <div class="scheduled-workout-item">

                                <i class="bi bi-calendar-check"></i>

                                <div>

                                    <strong>
                                        ${workout.name || "Workout"}
                                    </strong>

                                    <small>
                                        ${workout.category || "Workout"}
                                    </small>

                                </div>

                            </div>
                        `
                    )
                    .join("")
            }

        </div>
    `;
}


function openCalendarDay(
    date,
    status
) {

    if (
        !calendarWorkoutModal
    ) {
        return;
    }

    const completedWorkouts =
        getCompletedWorkoutsForDate(
            date
        );

    const scheduledWorkouts =
        getScheduledWorkoutsForDate(
            date
        );

    if (calendarModalDate) {

        calendarModalDate.textContent =
            date.toLocaleDateString(
                undefined,
                {
                    weekday:
                        "long",

                    month:
                        "long",

                    day:
                        "numeric",

                    year:
                        "numeric"
                }
            );
    }

    if (
        status === "completed"
    ) {

        if (calendarModalStatus) {

            calendarModalStatus.textContent =
                "Workout Completed";

            calendarModalStatus.className =
                "calendar-modal-status completed-text";
        }

        if (calendarModalBody) {

            calendarModalBody.innerHTML =
                buildCompletedWorkoutDetails(
                    completedWorkouts
                );
        }

    } else if (
        status === "missed"
    ) {

        if (calendarModalStatus) {

            calendarModalStatus.textContent =
                "Workout Missed";

            calendarModalStatus.className =
                "calendar-modal-status missed-text";
        }

        if (calendarModalBody) {

            calendarModalBody.innerHTML =
                buildMissedWorkoutDetails(
                    scheduledWorkouts
                );
        }

    } else if (
        status === "upcoming"
    ) {

        if (calendarModalStatus) {

            calendarModalStatus.textContent =
                "Upcoming";

            calendarModalStatus.className =
                "calendar-modal-status upcoming-text";
        }

        if (calendarModalBody) {

            calendarModalBody.innerHTML =
                buildUpcomingWorkoutDetails(
                    scheduledWorkouts
                );
        }

    } else {

        if (calendarModalStatus) {

            calendarModalStatus.textContent =
                "Rest Day";

            calendarModalStatus.className =
                "calendar-modal-status rest-text";
        }

        if (calendarModalBody) {

            calendarModalBody.innerHTML = `
                <div class="calendar-empty-state">

                    <div class="calendar-status-icon rest-icon">

                        <i class="bi bi-moon-stars-fill"></i>

                    </div>

                    <h4>
                        Rest Day
                    </h4>

                    <p>
                        No workout was scheduled
                        for this day.
                    </p>

                </div>
            `;
        }
    }

    bootstrap.Modal
        .getOrCreateInstance(
            calendarWorkoutModal
        )
        .show();
}


// ======================================================
// CALENDAR CONTROLS
// ======================================================

if (
    previousMonthBtn
) {

    previousMonthBtn.addEventListener(
        "click",
        () => {

            calendarDate.setMonth(
                calendarDate.getMonth() - 1
            );

            displayCalendar();
        }
    );
}


if (
    nextMonthBtn
) {

    nextMonthBtn.addEventListener(
        "click",
        () => {

            calendarDate.setMonth(
                calendarDate.getMonth() + 1
            );

            displayCalendar();
        }
    );
}


// ======================================================
// WEEKLY CHART
// ======================================================

function displayWeeklyChart() {

    const canvas =
        document.getElementById(
            "weeklyChart"
        );

    if (
        !canvas ||
        typeof Chart ===
        "undefined"
    ) {
        return;
    }

    const days = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];

    const workoutCounts =
        [
            0,
            0,
            0,
            0,
            0,
            0,
            0
        ];

    userWorkouts.forEach(
        workout => {

            if (
                !isCompletedWorkout(
                    workout
                )
            ) {
                return;
            }

            if (
                !isThisProgressWeek(
                    workout.completedDate
                )
            ) {
                return;
            }

            const completedDate =
                normalizeDateOnly(
                    workout.completedDate
                );

            if (!completedDate) {
                return;
            }

            workoutCounts[
                completedDate.getDay()
            ]++;
        }
    );

    const ctx =
        canvas.getContext(
            "2d"
        );

    if (weeklyChart) {

        weeklyChart.destroy();
    }

    weeklyChart =
        new Chart(
            ctx,
            {
                type: "bar",

                data: {

                    labels: days,

                    datasets: [

                        {
                            label:
                                "Completed Workouts",

                            data:
                                workoutCounts,

                            backgroundColor:
                                "#198754",

                            borderRadius:
                                12,

                            borderSkipped:
                                false,

                            maxBarThickness:
                                36
                        }

                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display:
                                false
                        }
                    },

                    scales: {

                        x: {

                            grid: {
                                display:
                                    false
                            }
                        },

                        y: {

                            beginAtZero:
                                true,

                            ticks: {
                                precision:
                                    0
                            }
                        }
                    }
                }
            }
        );
}


// ======================================================
// EXPORT JSON
// ======================================================

function exportWorkouts() {

    const data =
        JSON.stringify(
            userWorkouts,
            null,
            2
        );

    const blob =
        new Blob(
            [
                data
            ],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    link.download =
        "liftlog-workouts.json";

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );
}


if (exportBtn) {

    exportBtn.addEventListener(
        "click",
        exportWorkouts
    );
}


// ======================================================
// EXPORT PDF
// ======================================================

function exportWorkoutPDF(
    workoutsList,
    unit = "kg"
) {

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        alert(
            "PDF library failed to load. Check your internet connection."
        );

        return;
    }

    const {
        jsPDF
    } =
        window.jspdf;

    const doc =
        new jsPDF();

    doc.setFontSize(
        16
    );

    doc.text(
        "LiftLog Workout Export",
        14,
        18
    );

    doc.setFontSize(
        10
    );

    doc.text(
        `Exported: ${new Date().toLocaleString()}`,
        14,
        26
    );

    let y =
        36;

    const completed =
        (
            workoutsList ||
            []
        ).filter(
            isCompletedWorkout
        );

    if (
        completed.length === 0
    ) {

        doc.text(
            "No completed workouts to export.",
            14,
            y
        );

        doc.save(
            "liftlog-workouts.pdf"
        );

        return;
    }

    completed.forEach(
        (
            workout,
            index
        ) => {

            if (
                y > 270
            ) {

                doc.addPage();

                y =
                    20;
            }

            doc.setFontSize(
                12
            );

            doc.text(
                `${index + 1}. ${workout.name || "Workout"}`,
                14,
                y
            );

            y +=
                6;

            doc.setFontSize(
                10
            );

            const completedDate =
                workout.completedDate
                    ? new Date(
                        workout.completedDate
                    ).toLocaleDateString()
                    : "-";

            doc.text(
                `Date: ${completedDate}`,
                14,
                y
            );

            y +=
                5;

            doc.text(
                `Category: ${workout.category || "-"} | Goal: ${workout.goal || "-"}`,
                14,
                y
            );

            y +=
                5;

            const durationSec =
                Number(
                    workout.durationSeconds
                ) ||
                (
                    Number(
                        workout.actualDurationMinutes
                    ) || 0
                ) * 60;

            doc.text(
                `Duration: ${formatWorkoutDuration(durationSec)}`,
                14,
                y
            );

            y +=
                8;

            (
                workout.exercises ||
                []
            ).forEach(
                exercise => {

                    if (
                        y > 280
                    ) {

                        doc.addPage();

                        y =
                            20;
                    }

                    const stats =
                        getExerciseStats(
                            exercise
                        );

                    const displayWeight =
                        stats.weightKg > 0
                            ? `${formatProgressWeight(
                                stats.weightKg
                            )}${unit}`
                            : "";

                    doc.text(
                        `• ${exercise.name || ""}: ${stats.sets} x ${stats.reps}` +
                        (
                            displayWeight
                                ? ` @ ${displayWeight}`
                                : ""
                        ),
                        18,
                        y
                    );

                    y +=
                        5;
                }
            );

            y +=
                6;
        }
    );

    doc.save(
        "liftlog-workouts.pdf"
    );
}


if (
    exportWorkoutBtn
) {

    exportWorkoutBtn.addEventListener(
        "click",
        () => {

            exportWorkoutPDF(
                userWorkouts,
                getProgressWeightUnit()
            );
        }
    );
}


// ======================================================
// LOAD USER WORKOUTS
// ======================================================

async function loadProgressData() {

    const session =
        getCurrentProgressSession();

    if (
        !session ||
        !session.access_token
    ) {

        window.location.replace(
            "login.html"
        );

        return false;
    }

    try {

        if (
            typeof syncWorkouts !==
            "function"
        ) {

            throw new Error(
                "syncWorkouts() is not available."
            );
        }

        await syncWorkouts();

        userWorkouts =
            Array.isArray(
                workouts
            )
                ? workouts
                    .map(
                        normalizeProgressWorkout
                    )
                    .filter(Boolean)
                : [];

        calculatePersonalRecordsFromWorkouts();

        return true;

    } catch (error) {

        console.error(
            "Progress data loading failed:",
            error
        );

        if (
            typeof showToast ===
            "function"
        ) {

            showToast(
                "Unable to load your progress data.",
                "error"
            );
        }

        return false;
    }
}


// ======================================================
// INIT
// ======================================================

async function initProgressPage() {

    const loaded =
        await loadProgressData();

    if (!loaded) {
        return;
    }

    displayProgress();

    displayWorkoutHistory();

    displayPersonalRecords();

    displayWorkoutStreak();

    displayWeeklyChart();

    displayCalendar();

    displayAchievements();

    displayStrength();

    displayCalories();
}


// ======================================================
// START
// ======================================================

initProgressPage();