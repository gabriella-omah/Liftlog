// ========================================
// LiftLog — Workouts Page
// javascript/workouts.js
// ========================================
// ========================================
// AUTH / SUPABASE SESSION
// ========================================
/*
 * data.js calls getLiftLogSession().
 *
 * Your current project does not have that function defined,
 * which causes:
 *
 * ReferenceError: getLiftLogSession is not defined
 *
 * Keep this function here so data.js and workouts.js can both
 * use the same stored Supabase session.
 */
function getLiftLogSession() {
    try {
        // Primary session key
        const storedSession = localStorage.getItem("liftlogSession");
        if (storedSession) {
            const session = JSON.parse(storedSession);
            if (session && session.access_token) {
                return session;
            }
        }
        // Fallback in case Supabase/session code stores it differently
        const supabaseSession = localStorage.getItem("supabaseSession");
        if (supabaseSession) {
            const session = JSON.parse(supabaseSession);
            if (session && session.access_token) {
                return session;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to read LiftLog session:", error);
        return null;
    }
}
function getWorkoutAuthHeaders() {
    const session = getLiftLogSession();
    if (!session || !session.access_token) {
        return null;
    }
    return {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
    };
}
function requireWorkoutSession() {
    const session = getLiftLogSession();
    if (!session || !session.access_token) {
        console.error("No authenticated Supabase session found.");
        window.location.replace("login.html");
        return null;
    }
    return session;
}
// ========================================
// WORKOUT STATE
// ========================================
let workoutToDelete = null;
let currentWorkoutId = null;
let workoutToReplace = null;
let pendingWorkout = null;
// ========================================
// DOM ELEMENTS
// ========================================
const workoutList = document.getElementById("workoutList");
const workoutName = document.getElementById("workoutName");
const workoutDay = document.getElementById("workoutDay");
const workoutDate = document.getElementById("workoutDate");
const workoutHours = document.getElementById("workoutHours");
const workoutMinutes = document.getElementById("workoutMinutes");
const workoutCategory = document.getElementById("workoutCategory");
const workoutGoal = document.getElementById("workoutGoal");
const workoutDifficulty = document.getElementById("workoutDifficulty");
const addWorkoutBtn = document.getElementById("addWorkoutBtn");
const searchWorkout = document.getElementById("searchWorkout");
const confirmDeleteWorkout = document.getElementById("confirmDeleteWorkout");
const editWorkoutName = document.getElementById("editWorkoutName");
const editWorkoutDay = document.getElementById("editWorkoutDay");
const editWorkoutHours = document.getElementById("editWorkoutHours");
const editWorkoutMinutes = document.getElementById("editWorkoutMinutes");
const saveWorkoutChanges = document.getElementById("saveWorkoutChanges");
const confirmReplaceWorkout = document.getElementById("confirmReplaceWorkout");
// ========================================
// HELPERS
// ========================================
function getDifficultyBadge(difficulty) {
    const raw = String(difficulty || "").toLowerCase().trim();

    if (raw.includes("begin")) {
        return `<span class="difficulty-badge beginner"><i class="bi bi-lightning-charge"></i> Beginner</span>`;
    }
    if (raw.includes("inter")) {
        return `<span class="difficulty-badge intermediate"><i class="bi bi-bar-chart"></i> Intermediate</span>`;
    }
    if (raw.includes("adv")) {
        return `<span class="difficulty-badge advanced"><i class="bi bi-trophy"></i> Advanced</span>`;
    }
    return "";
}

function formatWorkoutDuration(minutes) {
    minutes = Number(minutes) || 0;
    if (minutes >= 60) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins === 0
            ? `${hrs} hr`
            : `${hrs} hr ${mins} min`;
    }
    return `${minutes} min`;
}
function formatScheduledDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "Unscheduled";
    }
    return date.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric"
    });
}
function formatDateForDatabase(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function isWorkoutCompleted(workout) {
    return (
        workout.completed === true ||
        Boolean(workout.completedDate) ||
        Boolean(workout.completed_date)
    );
}
// ========================================
// CARD DATE TEXT
// ========================================
function formatCardScheduledText(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "Unscheduled";
    }
    const currentYear = getToday().getFullYear();
    const options = {
        weekday: "short",
        month: "short",
        day: "numeric"
    };
    if (date.getFullYear() !== currentYear) {
        options.year = "numeric";
    }
    return date.toLocaleDateString("en-US", options);
}
// ========================================
// WORKOUT VISIBILITY
// ========================================
function shouldShowOnWorkoutsPage(workout) {
    const scheduled = getWorkoutScheduledDate(workout);
    if (!scheduled) {
        return true;
    }
    const weekStart = getStartOfWeek(getToday());
    return scheduled.getTime() >= weekStart.getTime();
}
// ========================================
// WORKOUT STATUS
// ========================================
function getWorkoutStatus(workout) {
    if (isWorkoutCompleted(workout)) {
        return {
            status: `<i class="bi bi-check-circle-fill"></i> Completed`,
            statusClass: "status-completed",
            buttonText: "View Workout"
        };
    }
    const scheduled = getWorkoutScheduledDate(workout);
    if (!scheduled) {
        return {
            status: `<i class="bi bi-question-circle"></i> Unscheduled`,
            statusClass: "status-upcoming",
            buttonText: "Open Workout"
        };
    }
    if (isWorkoutToday(workout)) {
        return {
            status: `<i class="bi bi-lightning-charge-fill"></i> Today`,
            statusClass: "status-today",
            buttonText:
                workout.startTime || workout.start_time
                    ? "Continue Workout"
                    : "Open Workout"
        };
    }
    if (isWorkoutFuture(workout)) {
        return {
            status: `<i class="bi bi-calendar-event"></i> Upcoming`,
            statusClass: "status-upcoming",
            buttonText: "View Workout"
        };
    }
    return {
        status: `<i class="bi bi-x-circle-fill"></i> Missed`,
        statusClass: "status-missed",
        buttonText: "Log Previous Workout"
    };
}
// ========================================
// WEEK LABEL
// ========================================
function getWeekLabel(date) {
    const today = getToday();
    const thisWeek = getStartOfWeek(today);
    const nextWeek = new Date(thisWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const workoutWeek = getStartOfWeek(date);
    if (workoutWeek.getTime() === thisWeek.getTime()) {
        return "This Week";
    }
    if (workoutWeek.getTime() === nextWeek.getTime()) {
        return "Next Week";
    }
    const end = new Date(workoutWeek);
    end.setDate(end.getDate() + 6);
    const currentYear = today.getFullYear();
    const startYear = workoutWeek.getFullYear();
    const endYear = end.getFullYear();
    const startText = workoutWeek.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year:
            startYear !== currentYear || endYear !== currentYear
                ? "numeric"
                : undefined
    });
    const endText = end.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
    return `${startText} – ${endText}`;
}
// ========================================
// DISPLAY WORKOUTS
// ========================================
function displayWorkouts(list = workouts) {
    if (!workoutList) {
        return;
    }
    workoutList.innerHTML = "";
    const visible = list.filter(shouldShowOnWorkoutsPage);
    const sortedWorkouts = [...visible].sort((a, b) => {
        const dateA = getWorkoutScheduledDate(a);
        const dateB = getWorkoutScheduledDate(b);
        if (dateA && dateB) {
            return dateA - dateB;
        }
        if (dateA && !dateB) {
            return -1;
        }
        if (!dateA && dateB) {
            return 1;
        }
        return (
            dayOrder.indexOf(a.day) -
            dayOrder.indexOf(b.day)
        );
    });
    if (sortedWorkouts.length === 0) {
        workoutList.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-barbell display-1 text-success"></i>
                <h3 class="mt-4">
                    No workouts yet
                </h3>
                <p>
                    Create your first workout to begin tracking your progress.
                </p>
            </div>
        `;
        return;
    }
    let currentSection = "";
    sortedWorkouts.forEach(workout => {
        const {
            status,
            statusClass,
            buttonText
        } = getWorkoutStatus(workout);
        const scheduledDate =
            getWorkoutScheduledDate(workout);
        const weekLabel = scheduledDate
            ? getWeekLabel(scheduledDate)
            : "Unscheduled";
        if (weekLabel !== currentSection) {
            currentSection = weekLabel;
            workoutList.innerHTML += `
                <div class="mt-4 mb-3">
                    <h4 class="fw-bold week-header">
                        ${weekLabel}
                    </h4>
                    <hr>
                </div>
            `;
        }
        const scheduledText = scheduledDate
            ? formatCardScheduledText(scheduledDate)
            : "Unscheduled";
        const category = workout.category || "";
        const categoryClass =
            category
                .toLowerCase()
                .replace(/\s+/g, "-");
        const exerciseCount =
            Array.isArray(workout.exercises)
                ? workout.exercises.length
                : Number(workout.exerciseCount) || 0;
        const editButton =
            isWorkoutCompleted(workout)
                ? `
                    <button
                        class="btn btn-outline-secondary"
                        disabled
                    >
                        <i class="bi bi-lock-fill"></i>
                        Edit Workout
                    </button>
                `
                : `
                    <button
                        class="btn btn-outline-success edit-btn"
                        data-id="${workout.id}"
                    >
                        <i class="bi bi-pencil"></i>
                        Edit Workout
                    </button>
                `;
        workoutList.innerHTML += `
            <section class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h3 class="workout-title">
                                ${workout.name || "Workout"}
                            </h3>
                            <p class="text-muted mb-0">
                                <i class="bi bi-calendar3"></i>
                                ${scheduledText}
                            </p>
                        </div>
                        <span class="${statusClass}">
                            ${status}
                        </span>
                    </div>
                    <hr>
                    <div class="row text-center">
                        <div class="col">
                            <h5>
                                ${exerciseCount}
                            </h5>
                            <small>
                                Exercises
                            </small>
                        </div>
                        <div class="col">
                            <h5>
                                ${formatWorkoutDuration(workout.duration)}
                            </h5>
                            <small>
                                Duration
                            </small>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap gap-2 mb-4">
                        ${
                            category
                                ? `
                                    <span
                                        class="workout-category category-${categoryClass}"
                                    >
                                        ${category}
                                    </span>
                                `
                                : ""
                        }
                        ${
                            workout.goal
                                ? `
                                    <span class="workout-goal">
                                        ${workout.goal}
                                    </span>
                                `
                                : ""
                        }
                    </div>
                    <div class="d-grid gap-2">
                        <a
                            href="workout.html?id=${workout.id}"
                            class="btn btn-success"
                        >
                            ${buttonText}
                        </a>
                        ${editButton}
                        <button
                            class="btn btn-outline-danger delete-btn"
                            data-id="${workout.id}"
                        >
                            <i class="bi bi-trash"></i>
                            Delete Workout
                        </button>
                    </div>
                </div>
            </section>
        `;
    });
}
// ========================================
// REPLACE WORKOUT
// ========================================
function showReplaceWorkoutModal(existingWorkout, newWorkout) {
    workoutToReplace = existingWorkout;
    pendingWorkout = newWorkout;
    const existingName =
        document.getElementById("existingWorkoutName");
    const existingDate =
        document.getElementById("existingWorkoutDate");
    if (existingName) {
        existingName.textContent =
            existingWorkout.name;
    }
    const scheduledDate =
        getWorkoutScheduledDate(existingWorkout);
    if (existingDate) {
        existingDate.textContent =
            scheduledDate
                ? formatScheduledDate(scheduledDate)
                : "Unscheduled";
    }
    const modalElement =
        document.getElementById("replaceWorkoutModal");
    if (modalElement) {
        bootstrap.Modal
            .getOrCreateInstance(modalElement)
            .show();
    }
}
async function replaceWorkout() {
    if (!workoutToReplace || !pendingWorkout) {
        return;
    }
    const session = requireWorkoutSession();
    if (!session) {
        return;
    }
    const headers = getWorkoutAuthHeaders();
    if (!headers) {
        return;
    }
    try {
        // ------------------------------
        // DELETE OLD WORKOUT
        // ------------------------------
        const deleteResponse = await fetch(
            `http://localhost:5000/api/workouts/${workoutToReplace.id}`,
            {
                method: "DELETE",
                headers
            }
        );
        if (!deleteResponse.ok) {
            const errorText =
                await deleteResponse.text();
            throw new Error(
                `Failed to delete existing workout: ${errorText}`
            );
        }
        // ------------------------------
        // CREATE NEW WORKOUT
        // ------------------------------
        const createResponse = await fetch(
            "http://localhost:5000/api/workouts",
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: pendingWorkout.name,
                    day: pendingWorkout.day,
                    category: pendingWorkout.category,
                    goal: pendingWorkout.goal,
                    difficulty: pendingWorkout.difficulty,
                    scheduled_date:
                        pendingWorkout.scheduledDate,
                    duration:
                        pendingWorkout.duration,
                    exercises:
                        pendingWorkout.exercises || [],
                    exercise_count:
                        pendingWorkout.exerciseCount ||
                        (pendingWorkout.exercises || []).length,
                    completed_date:
                        pendingWorkout.completedDate || null,
                    start_time:
                        pendingWorkout.startTime || null
                })
            }
        );
        const responseText =
            await createResponse.text();
        if (!createResponse.ok) {
            throw new Error(
                `Failed to create replacement workout: ${responseText}`
            );
        }
        // ------------------------------
        // RELOAD FROM SUPABASE
        // ------------------------------
        await syncWorkouts();
        refreshWorkouts();
        // ------------------------------
        // CLOSE MODALS
        // ------------------------------
        const replaceModal =
            bootstrap.Modal.getInstance(
                document.getElementById("replaceWorkoutModal")
            );
        if (replaceModal) {
            replaceModal.hide();
        }
        const editModal =
            document.getElementById("editWorkoutModal");
        if (editModal) {
            const modal =
                bootstrap.Modal.getInstance(editModal);
            if (modal) {
                modal.hide();
            }
        }
        const addModal =
            document.getElementById("newWorkoutModal");
        if (addModal) {
            const modal =
                bootstrap.Modal.getInstance(addModal);
            if (modal) {
                modal.hide();
            }
        }
        workoutToReplace = null;
        pendingWorkout = null;
        showToast(
            "Workout replaced successfully!",
            "success"
        );
    } catch (error) {
        console.error(
            "Replace workout failed:",
            error
        );
        showToast(
            "Failed to replace workout.",
            "error"
        );
    }
}
// ========================================
// ADD WORKOUT
// ========================================
async function addWorkout() {
    const session = requireWorkoutSession();
    if (!session) {
        return;
    }
    const name =
        workoutName.value.trim();
    if (!name) {
        showToast(
            "Please enter a workout name.",
            "warning"
        );
        return;
    }
    const selectedDate =
        workoutDate.value;
    if (!selectedDate) {
        showToast(
            "Please select a workout date.",
            "warning"
        );
        return;
    }
    const scheduled =
        parseLocalDate(selectedDate);
    if (!scheduled) {
        showToast(
            "Invalid workout date.",
            "warning"
        );
        return;
    }
    const day =
        scheduled.toLocaleDateString(
            "en-US",
            {
                weekday: "long"
            }
        );
    const newWorkout = {
        name,
        day,
        scheduledDate:
            selectedDate,
        exercises: [],
        exerciseCount: 0,
        duration:
            (Number(workoutHours.value) || 0) * 60 +
            (Number(workoutMinutes.value) || 0),
        category:
            workoutCategory.value,
        goal:
            workoutGoal.value,
        difficulty:
            workoutDifficulty.value,
        completed: false,
        completedDate: null,
        startTime: null
    };
    // ----------------------------------------
    // CHECK FOR EXISTING WORKOUT ON SAME DATE
    // ----------------------------------------
    const existingWorkout =
        workouts.find(w => {
            if (!w.scheduledDate) {
                return false;
            }
            return (
                String(w.scheduledDate)
                    .slice(0, 10) ===
                selectedDate
            );
        });
    if (existingWorkout) {
        showReplaceWorkoutModal(
            existingWorkout,
            newWorkout
        );
        return;
    }
    // ----------------------------------------
    // SAVE TO SUPABASE
    // ----------------------------------------
    const headers =
        getWorkoutAuthHeaders();
    if (!headers) {
        return;
    }
    try {
        const response =
            await fetch(
                "http://localhost:5000/api/workouts",
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        name:
                            newWorkout.name,
                        day:
                            newWorkout.day,
                        category:
                            newWorkout.category,
                        goal:
                            newWorkout.goal,
                        difficulty:
                            newWorkout.difficulty,
                        scheduled_date:
                            newWorkout.scheduledDate,
                        duration:
                            newWorkout.duration,
                        exercises:
                            newWorkout.exercises,
                        exercise_count:
                            newWorkout.exerciseCount,
                        completed_date:
                            newWorkout.completedDate,
                        start_time:
                            newWorkout.startTime
                    })
                }
            );
        const responseText =
            await response.text();
        let savedWorkout;
        try {
            savedWorkout =
                JSON.parse(responseText);
        } catch {
            throw new Error(
                `Server returned ${response.status} ${response.statusText}`
            );
        }
        if (!response.ok) {
            throw new Error(
                savedWorkout.error ||
                "Failed to save workout"
            );
        }
        const saved =
            Array.isArray(savedWorkout)
                ? savedWorkout[0]
                : savedWorkout;
        if (!saved) {
            throw new Error(
                "Server returned no saved workout."
            );
        }
        const savedFrontendWorkout = {
            ...saved,
            scheduledDate:
                saved.scheduled_date,
            exerciseCount:
                saved.exercise_count,
            completedDate:
                saved.completed_date,
            startTime:
                saved.start_time,
            completed:
                Boolean(saved.completed) ||
                Boolean(saved.completed_date)
        };
        workouts.push(
            savedFrontendWorkout
        );
        saveWorkouts();
        refreshWorkouts();
        showToast(
            "Workout saved to Supabase!",
            "success"
        );
    } catch (error) {
        console.error(
            "Failed to save workout:",
            error
        );
        showToast(
            "Failed to save workout.",
            "error"
        );
        return;
    }
    // ----------------------------------------
    // CLOSE MODAL
    // ----------------------------------------
    const newWorkoutModal =
        document.getElementById(
            "newWorkoutModal"
        );
    if (newWorkoutModal) {
        const modal =
            bootstrap.Modal.getInstance(
                newWorkoutModal
            );
        if (modal) {
            modal.hide();
        }
    }
    // ----------------------------------------
    // RESET FORM
    // ----------------------------------------
    workoutName.value = "";
    workoutDate.value = "";
    workoutHours.value = "";
    workoutMinutes.value = "";
    workoutCategory.selectedIndex = 0;
    workoutGoal.selectedIndex = 0;
    workoutDifficulty.selectedIndex = 0;
}
// ========================================
// SEARCH & REFRESH
// ========================================
function searchWorkouts() {
    const filtered =
        searchData({
            data: workouts,
            query:
                searchWorkout.value,
            fields: [
                "name",
                "category",
                "goal",
                "day",
                "difficulty"
            ]
        });
    displayWorkouts(filtered);
    attachEditEvents();
}
function refreshWorkouts() {
    if (!workoutList) {
        return;
    }
    displayWorkouts();
    attachEditEvents();
    saveWorkouts();
    const todayCard =
        document.querySelector(
            ".status-today"
        );
    if (todayCard) {
        const card =
            todayCard.closest(".card");
        if (card) {
            setTimeout(() => {
                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }, 100);
        }
    }
}
// ========================================
// DELETE WORKOUT
// ========================================
document.addEventListener(
    "click",
    e => {
        const deleteButton =
            e.target.closest(".delete-btn");
        if (!deleteButton) {
            return;
        }
        workoutToDelete =
            deleteButton.dataset.id;
        const workout =
            workouts.find(
                w =>
                    String(w.id) ===
                    String(workoutToDelete)
            );
        if (!workout) {
            return;
        }
        const deleteWorkoutName =
            document.getElementById(
                "deleteWorkoutName"
            );
        if (deleteWorkoutName) {
            deleteWorkoutName.textContent =
                workout.name;
        }
        const deleteModal =
            document.getElementById(
                "deleteWorkoutModal"
            );
        if (deleteModal) {
            bootstrap.Modal
                .getOrCreateInstance(
                    deleteModal
                )
                .show();
        }
    }
);
if (confirmDeleteWorkout) {
    confirmDeleteWorkout.addEventListener(
        "click",
        async () => {
            if (workoutToDelete === null) {
                return;
            }
            const session =
                requireWorkoutSession();
            if (!session) {
                return;
            }
            const headers =
                getWorkoutAuthHeaders();
            if (!headers) {
                return;
            }
            try {
                const response =
                    await fetch(
                        `http://localhost:5000/api/workouts/${workoutToDelete}`,
                        {
                            method: "DELETE",
                            headers
                        }
                    );
                if (!response.ok) {
                    const responseText =
                        await response.text();
                    throw new Error(
                        responseText ||
                        "Failed to delete workout"
                    );
                }
                workoutToDelete = null;
                await syncWorkouts();
                refreshWorkouts();
                const deleteModal =
                    document.getElementById(
                        "deleteWorkoutModal"
                    );
                if (deleteModal) {
                    const modal =
                        bootstrap.Modal.getInstance(
                            deleteModal
                        );
                    if (modal) {
                        modal.hide();
                    }
                }
                showToast(
                    "Workout deleted successfully.",
                    "success"
                );
            } catch (error) {
                console.error(
                    "Delete workout failed:",
                    error
                );
                showToast(
                    "Failed to delete workout.",
                    "error"
                );
            }
        }
    );
}
// ========================================
// EDIT WORKOUT
// ========================================
function editWorkout(id) {
    const workout =
        workouts.find(
            w =>
                String(w.id) ===
                String(id)
        );
    if (!workout) {
        return;
    }
    if (isWorkoutCompleted(workout)) {
        return;
    }
    currentWorkoutId =
        workout.id;
    editWorkoutName.value =
        workout.name || "";
    editWorkoutDay.value =
        workout.scheduledDate
            ? String(
                workout.scheduledDate
            ).slice(0, 10)
            : "";
    editWorkoutHours.value =
        Math.floor(
            (workout.duration || 0) / 60
        );
    editWorkoutMinutes.value =
        (workout.duration || 0) % 60;
    const editModal =
        document.getElementById(
            "editWorkoutModal"
        );
    if (editModal) {
        bootstrap.Modal
            .getOrCreateInstance(
                editModal
            )
            .show();
    }
}
// ========================================
// SAVE EDITED WORKOUT
// ========================================
async function saveWorkout() {
    const session =
        requireWorkoutSession();
    if (!session) {
        return;
    }
    const workout =
        workouts.find(
            w =>
                String(w.id) ===
                String(currentWorkoutId)
        );
    if (!workout) {
        return;
    }
    const newName =
        editWorkoutName.value.trim();
    if (!newName) {
        showToast(
            "Please enter a workout name.",
            "warning"
        );
        return;
    }
    const selectedDate =
        editWorkoutDay.value;
    if (!selectedDate) {
        showToast(
            "Please select a workout date.",
            "warning"
        );
        return;
    }
    // ----------------------------------------
    // CHECK DATE CONFLICT
    // ----------------------------------------
    const existingWorkout =
        workouts.find(
            w =>
                String(w.id) !==
                String(workout.id) &&
                w.scheduledDate &&
                String(w.scheduledDate)
                    .slice(0, 10) ===
                selectedDate
        );
    if (existingWorkout) {
        const scheduled =
            parseLocalDate(
                selectedDate
            );
        workoutToReplace =
            existingWorkout;
        pendingWorkout = {
            ...workout,
            name:
                newName,
            scheduledDate:
                selectedDate,
            day:
                scheduled
                    ? scheduled.toLocaleDateString(
                        "en-US",
                        {
                            weekday: "long"
                        }
                    )
                    : workout.day,
            duration:
                (Number(
                    editWorkoutHours.value
                ) || 0) * 60 +
                (Number(
                    editWorkoutMinutes.value
                ) || 0)
        };
        const existingName =
            document.getElementById(
                "existingWorkoutName"
            );
        const existingDate =
            document.getElementById(
                "existingWorkoutDate"
            );
        if (existingName) {
            existingName.textContent =
                existingWorkout.name;
        }
        if (existingDate) {
            existingDate.textContent =
                getWorkoutScheduledDate(
                    existingWorkout
                )?.toLocaleDateString() ||
                "Unscheduled";
        }
        const replaceModal =
            document.getElementById(
                "replaceWorkoutModal"
            );
        if (replaceModal) {
            bootstrap.Modal
                .getOrCreateInstance(
                    replaceModal
                )
                .show();
        }
        return;
    }
    // ----------------------------------------
    // BUILD UPDATE
    // ----------------------------------------
    const scheduled =
        parseLocalDate(
            selectedDate
        );
    const updatedWorkout = {
        name:
            newName,
        day:
            scheduled
                ? scheduled.toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long"
                    }
                )
                : workout.day,
        category:
            workout.category,
        goal:
            workout.goal,
        difficulty:
            workout.difficulty,
        scheduled_date:
            selectedDate,
        duration:
            (Number(
                editWorkoutHours.value
            ) || 0) * 60 +
            (Number(
                editWorkoutMinutes.value
            ) || 0),
        exercises:
            workout.exercises || [],
        exercise_count:
            workout.exerciseCount ||
            (workout.exercises || []).length,
        completed_date:
            workout.completedDate ||
            workout.completed_date ||
            null,
        start_time:
            workout.startTime ||
            workout.start_time ||
            null
    };
    // ----------------------------------------
    // UPDATE SUPABASE
    // ----------------------------------------
    const headers =
        getWorkoutAuthHeaders();
    if (!headers) {
        return;
    }
    try {
        const response =
            await fetch(
                `http://localhost:5000/api/workouts/${workout.id}`,
                {
                    method: "PUT",
                    headers,
                    body:
                        JSON.stringify(
                            updatedWorkout
                        )
                }
            );
        const responseText =
            await response.text();
        let result;
        try {
            result =
                JSON.parse(
                    responseText
                );
        } catch {
            throw new Error(
                `Server returned ${response.status} ${response.statusText}`
            );
        }
        if (!response.ok) {
            throw new Error(
                result.error ||
                "Failed to update workout"
            );
        }
        const savedWorkout =
            Array.isArray(result)
                ? result[0]
                : result;
        if (!savedWorkout) {
            throw new Error(
                "Server returned no updated workout"
            );
        }
        const updatedFrontendWorkout = {
            ...savedWorkout,
            scheduledDate:
                savedWorkout.scheduled_date,
            exerciseCount:
                savedWorkout.exercise_count,
            completedDate:
                savedWorkout.completed_date,
            startTime:
                savedWorkout.start_time,
            completed:
                Boolean(
                    savedWorkout.completed
                ) ||
                Boolean(
                    savedWorkout.completed_date
                )
        };
        const index =
            workouts.findIndex(
                w =>
                    String(w.id) ===
                    String(workout.id)
            );
        if (index !== -1) {
            workouts[index] =
                updatedFrontendWorkout;
        }
        saveWorkouts();
        refreshWorkouts();
        const editModal =
            document.getElementById(
                "editWorkoutModal"
            );
        if (editModal) {
            const modal =
                bootstrap.Modal.getInstance(
                    editModal
                );
            if (modal) {
                modal.hide();
            }
        }
        showToast(
            "Workout updated successfully!",
            "success"
        );
    } catch (error) {
        console.error(
            "Update workout failed:",
            error
        );
        showToast(
            "Failed to update workout.",
            "error"
        );
    }
}
// ========================================
// EDIT BUTTON EVENTS
// ========================================
function attachEditEvents() {
    document
        .querySelectorAll(".edit-btn")
        .forEach(button => {
            button.onclick = () => {
                if (button.disabled) {
                    return;
                }
                editWorkout(
                    button.dataset.id
                );
            };
        });
}
// ========================================
// REMOVE STALE RECOMMENDED WORKOUTS
// ========================================
function removeStaleRecommendedWorkouts() {
    const currentWeekStart =
        getStartOfWeek();
    const beforeCount =
        workouts.length;
    workouts =
        workouts.filter(workout => {
            if (
                workout.source !==
                "recommended"
            ) {
                return true;
            }
            if (
                isWorkoutCompleted(
                    workout
                )
            ) {
                return true;
            }
            const scheduledDate =
                getWorkoutScheduledDate(
                    workout
                );
            if (!scheduledDate) {
                return false;
            }
            return (
                scheduledDate >=
                currentWeekStart
            );
        });
    if (
        workouts.length !==
        beforeCount
    ) {
        saveWorkouts();
    }
}
// ========================================
// EVENT LISTENERS
// ========================================
if (addWorkoutBtn) {
    addWorkoutBtn.addEventListener(
        "click",
        addWorkout
    );
}
if (saveWorkoutChanges) {
    saveWorkoutChanges.addEventListener(
        "click",
        saveWorkout
    );
}
if (searchWorkout) {
    searchWorkout.addEventListener(
        "input",
        searchWorkouts
    );
}
if (confirmReplaceWorkout) {
    confirmReplaceWorkout.addEventListener(
        "click",
        replaceWorkout
    );
}
// ========================================
// RECOMMENDED PLAN
// ========================================
const recommendedPlanBtn =
    document.getElementById(
        "recommendedPlanBtn"
    );
if (recommendedPlanBtn) {
    recommendedPlanBtn.addEventListener(
        "click",
        () => {
            const welcomeModal =
                document.getElementById(
                    "welcomeWorkoutModal"
                );
            if (welcomeModal) {
                const modal =
                    bootstrap.Modal.getInstance(
                        welcomeModal
                    );
                if (modal) {
                    modal.hide();
                }
            }
            const goalModal =
                document.getElementById(
                    "goalModal"
                );
            if (goalModal) {
                bootstrap.Modal
                    .getOrCreateInstance(
                        goalModal
                    )
                    .show();
            }
        }
    );
}
// ========================================
// RECOMMENDED PLAN GOAL BUTTONS
// ========================================
document
    .querySelectorAll(".goal-btn")
    .forEach(button => {
        button.addEventListener(
            "click",
            async () => {
                const session =
                    requireWorkoutSession();
                if (!session) {
                    return;
                }
                const goal =
                    button.dataset.goal;
                const selectedPlan =
                    workoutPlans[goal];
                if (!selectedPlan) {
                    return;
                }
                const today =
                    getToday();
                removeStaleRecommendedWorkouts();
                const headers =
                    getWorkoutAuthHeaders();
                if (!headers) {
                    return;
                }
                // --------------------------------
                // CREATE EACH RECOMMENDED WORKOUT
                // DIRECTLY IN SUPABASE
                // --------------------------------
                for (
                    const [day, plan]
                    of Object.entries(
                        selectedPlan.days
                    )
                ) {
                    if (
                        !plan.exercises ||
                        plan.exercises.length === 0
                    ) {
                        continue;
                    }
                    const scheduled =
                        getScheduledDateForDay(
                            day,
                            today
                        );
                    if (
                        !scheduled ||
                        scheduled < today
                    ) {
                        continue;
                    }
                    const exercises =
                        getWorkoutExercises(
                            plan.exercises,
                            exerciseLibrary
                        )
                        .filter(Boolean)
                        .map(exercise => ({
                            ...exercise,
                            sets:
                                exercise.sets ||
                                3,
                            reps:
                                exercise.reps ||
                                10,
                            weight: "",
                            notes: "",
                            completed: false
                        }));
                    const scheduledDate =
                        formatDateForDatabase(
                            scheduled
                        );
                    // Check local list first
                    const alreadyExists =
                        workouts.some(
                            workout => {
                                if (
                                    workout.source !==
                                    "recommended"
                                ) {
                                    return false;
                                }
                                const existingDate =
                                    getWorkoutScheduledDate(
                                        workout
                                    );
                                return (
                                    existingDate &&
                                    existingDate.getTime() ===
                                    scheduled.getTime()
                                );
                            }
                        );
                    if (alreadyExists) {
                        continue;
                    }
                    const recommendedWorkout = {
                        name:
                            plan.title,
                        day,
                        scheduled_date:
                            scheduledDate,
                        source:
                            "recommended",
                        weekStart:
                            getStartOfWeek(
                                today
                            ).toISOString(),
                        exercises,
                        exercise_count:
                            exercises.length,
                        duration:
                            60,
                        category:
                            plan.title,
                        goal:
                            selectedPlan.title,
                        difficulty:
                            "Intermediate",
                        completed_date:
                            null,
                        start_time:
                            null
                    };
                    try {
                        const response =
                            await fetch(
                                "http://localhost:5000/api/workouts",
                                {
                                    method: "POST",
                                    headers,
                                    body:
                                        JSON.stringify(
                                            recommendedWorkout
                                        )
                                }
                            );
                        const responseText =
                            await response.text();
                        if (!response.ok) {
                            console.error(
                                "Failed to create recommended workout:",
                                responseText
                            );
                            continue;
                        }
                        let savedWorkout;
                        try {
                            savedWorkout =
                                JSON.parse(
                                    responseText
                                );
                        } catch {
                            console.error(
                                "Recommended workout API returned invalid JSON:",
                                responseText
                            );
                            continue;
                        }
                        const saved =
                            Array.isArray(
                                savedWorkout
                            )
                                ? savedWorkout[0]
                                : savedWorkout;
                        if (!saved) {
                            continue;
                        }
                        workouts.push({
                            ...saved,
                            scheduledDate:
                                saved.scheduled_date,
                            exerciseCount:
                                saved.exercise_count,
                            completedDate:
                                saved.completed_date,
                            startTime:
                                saved.start_time,
                            completed:
                                Boolean(
                                    saved.completed
                                ) ||
                                Boolean(
                                    saved.completed_date
                                )
                        });
                    } catch (error) {
                        console.error(
                            "Recommended workout save failed:",
                            error
                        );
                    }
                }
                // --------------------------------
                // SAVE LOCAL CACHE
                // --------------------------------
                saveWorkouts();
                localStorage.setItem(
                    "recommendedPlanUsed",
                    "true"
                );
                // --------------------------------
                // CLOSE GOAL MODAL
                // --------------------------------
                const goalModal =
                    document.getElementById(
                        "goalModal"
                    );
                if (goalModal) {
                    const modal =
                        bootstrap.Modal.getInstance(
                            goalModal
                        );
                    if (modal) {
                        modal.hide();
                    }
                }
                // --------------------------------
                // REFRESH FROM SUPABASE
                // --------------------------------
                await syncWorkouts();
                refreshWorkouts();
                showToast(
                    `${selectedPlan.title} plan created successfully!`,
                    "success"
                );
            }
        );
    });
// ========================================
// INITIALIZE
// ========================================
(async function initializeWorkoutsPage() {
    const session =
        getLiftLogSession();
    if (
        !session ||
        !session.access_token
    ) {
        console.error(
            "No authenticated session found."
        );
        window.location.replace(
            "login.html"
        );
        return;
    }
    try {
        await syncWorkouts();
        removeStaleRecommendedWorkouts();
        refreshWorkouts();
        // ------------------------------------
        // WELCOME MODAL
        // ------------------------------------
        if (
            workouts.length === 0 &&
            !localStorage.getItem(
                "recommendedPlanUsed"
            )
        ) {
            const welcomeModal =
                document.getElementById(
                    "welcomeWorkoutModal"
                );
            if (welcomeModal) {
                bootstrap.Modal
                    .getOrCreateInstance(
                        welcomeModal
                    )
                    .show();
            }
        }
        // ------------------------------------
        // SCROLL TO TODAY
        // ------------------------------------
        setTimeout(() => {
            const todayCard =
                document.querySelector(
                    ".status-today"
                );
            if (todayCard) {
                const card =
                    todayCard.closest(
                        ".card"
                    );
                if (card) {
                    card.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }
            }
        }, 150);
    } catch (error) {
        console.error(
            "Failed to initialize workouts page:",
            error
        );
    }
})();