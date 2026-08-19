// ========================================
// LiftLog — Streak Helpers
// javascript/streak.js
// ========================================
// ========================================
// DAY NAMES
// ========================================
const STREAK_DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];
// ========================================
// DATE KEY
// ========================================
function getStreakDateKey(date) {
    if (!date) {
        return null;
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
        return null;
    }
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
    ].join("-");
}
// ========================================
// GET WORKOUT SCHEDULED DATE
// ========================================
function getStreakWorkoutDate(workout) {
    if (!workout) {
        return null;
    }
    const value =
        workout.scheduledDate ||
        workout.scheduled_date;
    if (value) {
        const date =
            new Date(
                String(value).slice(0, 10) +
                "T00:00:00"
            );
        if (!Number.isNaN(date.getTime())) {
            date.setHours(0, 0, 0, 0);
            return date;
        }
    }
    // ----------------------------------------
    // Fallback for older workouts using "day"
    // ----------------------------------------
    if (workout.day) {
        const today =
            new Date();
        today.setHours(0, 0, 0, 0);
        const dayIndex =
            STREAK_DAY_NAMES.indexOf(
                workout.day
            );
        if (dayIndex === -1) {
            return null;
        }
        const start =
            new Date(today);
        start.setDate(
            start.getDate() -
            start.getDay()
        );
        start.setDate(
            start.getDate() +
            dayIndex
        );
        return start;
    }
    return null;
}
// ========================================
// GET SCHEDULED DATE STATUS
//
// Returns:
//
// {
//     "2026-08-11": true,
//     "2026-08-12": true,
//     "2026-08-13": false
// }
//
// true  = scheduled + completed
// false = scheduled + missed
//
// REST DAYS ARE NOT INCLUDED.
// ========================================
function getScheduledWorkoutStatus() {
    const status =
        new Map();
    workouts.forEach(
        workout => {
            const scheduledDate =
                getStreakWorkoutDate(
                    workout
                );
            if (!scheduledDate) {
                return;
            }
            const dateKey =
                getStreakDateKey(
                    scheduledDate
                );
            if (!dateKey) {
                return;
            }
            const completed =
                workout.completed === true ||
                Boolean(
                    workout.completedDate ||
                    workout.completed_date
                );
            // --------------------------------
            // Multiple workouts can exist
            // on the same scheduled day.
            //
            // The day counts as completed
            // when at least one scheduled
            // workout for that day is completed.
            // --------------------------------
            if (!status.has(dateKey)) {
                status.set(
                    dateKey,
                    completed
                );
            } else if (completed) {
                status.set(
                    dateKey,
                    true
                );
            }
        }
    );
    return status;
}
// ========================================
// IS WORKOUT SCHEDULED
// ========================================
function isWorkoutScheduledOnDate(
    date
) {
    const targetKey =
        getStreakDateKey(date);
    if (!targetKey) {
        return false;
    }
    return workouts.some(
        workout => {
            const workoutDate =
                getStreakWorkoutDate(
                    workout
                );
            if (!workoutDate) {
                return false;
            }
            return (
                getStreakDateKey(
                    workoutDate
                ) === targetKey
            );
        }
    );
}
// ========================================
// IS SCHEDULED DAY COMPLETED
// ========================================
function isScheduledWorkoutCompletedOnDate(
    date
) {
    const targetKey =
        getStreakDateKey(date);
    if (!targetKey) {
        return false;
    }
    return workouts.some(
        workout => {
            const workoutDate =
                getStreakWorkoutDate(
                    workout
                );
            if (!workoutDate) {
                return false;
            }
            const workoutKey =
                getStreakDateKey(
                    workoutDate
                );
            if (
                workoutKey !==
                targetKey
            ) {
                return false;
            }
            return (
                workout.completed === true ||
                Boolean(
                    workout.completedDate ||
                    workout.completed_date
                )
            );
        }
    );
}
// ========================================
// CURRENT STREAK
// ========================================
function calculateCurrentStreak() {
    if (
        !Array.isArray(workouts) ||
        workouts.length === 0
    ) {
        return 0;
    }
    const today =
        new Date();
    today.setHours(
        0,
        0,
        0,
        0
    );
    let cursor =
        new Date(today);
    let streak = 0;
    while (true) {
        const scheduled =
            isWorkoutScheduledOnDate(
                cursor
            );
        // --------------------------------
        // REST DAY
        //
        // Rest days do NOT increase
        // the streak and do NOT break it.
        // --------------------------------
        if (!scheduled) {
            cursor.setDate(
                cursor.getDate() - 1
            );
            continue;
        }
        const completed =
            isScheduledWorkoutCompletedOnDate(
                cursor
            );
        // --------------------------------
        // TODAY
        //
        // If today's scheduled workout
        // has not happened yet, don't break
        // yesterday's streak.
        // --------------------------------
        if (
            cursor.getTime() ===
            today.getTime()
        ) {
            if (!completed) {
                cursor.setDate(
                    cursor.getDate() - 1
                );
                continue;
            }
        }
        // --------------------------------
        // MISSED SCHEDULED WORKOUT
        //
        // This is the ONLY thing that
        // breaks the streak.
        // --------------------------------
        if (!completed) {
            break;
        }
        // --------------------------------
        // COMPLETED SCHEDULED WORKOUT
        // --------------------------------
        streak++;
        cursor.setDate(
            cursor.getDate() - 1
        );
    }
    return streak;
}
// ========================================
// LONGEST STREAK
// ========================================
function calculateLongestStreak() {
    if (
        !Array.isArray(workouts) ||
        workouts.length === 0
    ) {
        return 0;
    }
    const scheduledStatus =
        getScheduledWorkoutStatus();
    if (
        scheduledStatus.size === 0
    ) {
        return 0;
    }
    const scheduledDates = [
        ...scheduledStatus.keys()
    ]
        .map(
            key =>
                new Date(
                    `${key}T00:00:00`
                )
        )
        .sort(
            (a, b) =>
                a.getTime() -
                b.getTime()
        );
    const firstDate =
        new Date(
            scheduledDates[0]
        );
    const lastDate =
        new Date(
            scheduledDates[
                scheduledDates.length - 1
            ]
        );
    let cursor =
        new Date(firstDate);
    let current = 0;
    let longest = 0;
    while (
        cursor <= lastDate
    ) {
        const dateKey =
            getStreakDateKey(
                cursor
            );
        const scheduled =
            scheduledStatus.has(
                dateKey
            );
        // --------------------------------
        // REST DAY
        //
        // Ignore it completely.
        // It neither adds nor breaks
        // the streak.
        // --------------------------------
        if (!scheduled) {
            cursor.setDate(
                cursor.getDate() + 1
            );
            continue;
        }
        const completed =
            scheduledStatus.get(
                dateKey
            );
        // --------------------------------
        // COMPLETED
        // --------------------------------
        if (completed) {
            current++;
            longest =
                Math.max(
                    longest,
                    current
                );
        }
        // --------------------------------
        // MISSED SCHEDULED WORKOUT
        // --------------------------------
        else {
            current = 0;
        }
        cursor.setDate(
            cursor.getDate() + 1
        );
    }
    return longest;
}
// ========================================
// PUBLIC STREAK DATA
// ========================================
function getWorkoutStreakData() {
    const current =
        calculateCurrentStreak();
    const longest =
        Math.max(
            calculateLongestStreak(),
            current
        );
    // --------------------------------
    // Compatibility only.
    //
    // Supabase/workout data remains
    // the source of truth.
    // --------------------------------
    localStorage.setItem(
        "currentStreak",
        String(current)
    );
    localStorage.setItem(
        "longestStreak",
        String(longest)
    );
    return {
        current,
        longest
    };
}