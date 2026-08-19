
// ========================================
// LiftLog — Exercise Library
// javascript/library.js
// ========================================


// ========================================
// DOM ELEMENTS
// ========================================

const categoryContainer =
    document.getElementById("exerciseCategories");

const addExerciseBtn =
    document.getElementById("saveExerciseBtn");

const existingWorkoutContainer =
    document.getElementById("existingWorkoutContainer");

const newWorkoutContainer =
    document.getElementById("newWorkoutContainer");

const existingWorkoutName =
    document.getElementById("existingWorkoutName");

const newWorkoutName =
    document.getElementById("newWorkoutName");

const library =
    document.getElementById("exerciseLibrary");

const search =
    document.getElementById("exerciseSearch");

const weightLabel =
    document.getElementById("weightLabel");

const workoutDateSelect =
    document.getElementById("workoutDateSelect");

const openAddWorkoutBtn =
    document.getElementById("openAddWorkout");


// ========================================
// STATE
// ========================================

let activeFilter = "all";
let selectedExercise = null;
let selectedWorkout = null;


// ========================================
// AUTH
// ========================================

function getLibrarySession() {

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


function requireLibrarySession() {

    const session =
        getLibrarySession();

    if (
        !session ||
        !session.access_token
    ) {

        window.location.replace(
            "login.html"
        );

        return null;
    }

    return session;
}


// ========================================
// TOAST
// ========================================

function showLibraryToast(
    message,
    type = "success"
) {

    if (
        typeof showToast ===
        "function"
    ) {

        showToast(
            message,
            type
        );

        return;
    }

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    const toastElement =
        document.getElementById(
            "exerciseToast"
        );

    if (
        !toastMessage ||
        !toastElement
    ) {
        return;
    }

    toastMessage.textContent =
        message;

    toastElement.classList.remove(
        "toast-success",
        "toast-warning",
        "toast-error"
    );

    toastElement.classList.add(
        type === "warning"
            ? "toast-warning"
            : type === "error"
                ? "toast-error"
                : "toast-success"
    );

    bootstrap.Toast
        .getOrCreateInstance(
            toastElement
        )
        .show();
}


// ========================================
// WEIGHT UNIT
// ========================================

function updateWeightUnit() {

    const unit =
        typeof weightUnit !==
        "undefined"
            ? weightUnit
            : (
                localStorage.getItem(
                    "weightUnit"
                ) || "kg"
            );

    if (weightLabel) {
        weightLabel.textContent =
            unit;
    }
}


function getLibraryWeightUnit() {

    return (
        typeof weightUnit !==
        "undefined"
    )
        ? weightUnit
        : (
            localStorage.getItem(
                "weightUnit"
            ) || "kg"
        );
}


// ========================================
// FILTER DATA
// ========================================

const filterData = {

    muscle: [
        "Chest",
        "Back",
        "Legs",
        "Shoulders",
        "Arms",
        "Core"
    ],

    type: [
        "Compound",
        "Isolation",
        "Cardio"
    ],

    equipment: [
        ...new Set(
            (
                typeof exerciseLibrary !==
                "undefined"
                    ? exerciseLibrary
                    : []
            )
                .map(
                    exercise =>
                        exercise.equipment
                )
                .filter(Boolean)
        )
    ]
};


const muscleGroups = {

    Chest: [
        "Chest"
    ],

    Back: [
        "Back"
    ],

    Legs: [
        "Quadriceps",
        "Hamstrings",
        "Glutes",
        "Calves"
    ],

    Shoulders: [
        "Shoulders"
    ],

    Arms: [
        "Biceps",
        "Triceps"
    ],

    Core: [
        "Core"
    ]
};


// ========================================
// DISPLAY EXERCISES
// ========================================

function displayLibraryExercises(
    list
) {

    if (!library) {
        return;
    }

    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        library.innerHTML = `
            <div class="text-center py-5">

                <i class="bi bi-search display-4 text-muted"></i>

                <h4 class="mt-3">
                    No exercises found
                </h4>

                <p class="text-muted">
                    Try a different search or filter.
                </p>

            </div>
        `;

        return;
    }

    library.innerHTML = "";

    list.forEach(
        exercise => {

            library.innerHTML += `
                <section
                    class="exercise-card"
                    data-id="${exercise.id}"
                >

                    <div class="card-body">

                        <div class="exercise-info">

                            <h4>
                                ${exercise.name || ""}
                            </h4>

                            <p
                                class="muscle-badge ${
                                    String(
                                        exercise.muscle || ""
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
    );
}


// ========================================
// MAIN FILTERS
// ========================================

const mainFilters =
    document.querySelectorAll(
        ".library-filter"
    );

mainFilters.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                mainFilters.forEach(
                    btn =>
                        btn.classList.remove(
                            "active"
                        )
                );

                button.classList.add(
                    "active"
                );

                activeFilter =
                    button.dataset.filterType;

                if (!categoryContainer) {
                    return;
                }

                categoryContainer.innerHTML =
                    "";

                if (
                    activeFilter ===
                    "all"
                ) {

                    displayLibraryExercises(
                        exerciseLibrary
                    );

                    return;
                }

                const options =
                    filterData[
                        activeFilter
                    ] || [];

                categoryContainer.innerHTML =
                    options
                        .map(
                            item => `
                                <button
                                    type="button"
                                    class="sub-filter-btn"
                                    data-value="${item}"
                                >
                                    ${item}
                                </button>
                            `
                        )
                        .join("");
            }
        );
    }
);


// ========================================
// SUB FILTERS
// ========================================

document.addEventListener(
    "click",
    event => {

        const subButton =
            event.target.closest(
                ".sub-filter-btn"
            );

        if (!subButton) {
            return;
        }

        document
            .querySelectorAll(
                ".sub-filter-btn"
            )
            .forEach(
                button =>
                    button.classList.remove(
                        "active"
                    )
            );

        subButton.classList.add(
            "active"
        );

        const value =
            subButton.dataset.value;

        let filtered = [];

        if (
            activeFilter ===
            "muscle"
        ) {

            filtered =
                exerciseLibrary.filter(
                    exercise =>
                        (
                            muscleGroups[
                                value
                            ] || []
                        ).includes(
                            exercise.muscle
                        )
                );

        } else if (
            activeFilter ===
            "type"
        ) {

            filtered =
                exerciseLibrary.filter(
                    exercise =>
                        exercise.type ===
                        value
                );

        } else if (
            activeFilter ===
            "equipment"
        ) {

            filtered =
                exerciseLibrary.filter(
                    exercise =>
                        exercise.equipment ===
                        value
                );
        }

        displayLibraryExercises(
            filtered
        );
    }
);


// ========================================
// SEARCH
// ========================================

if (search) {

    search.addEventListener(
        "input",
        () => {

            const value =
                search.value
                    .toLowerCase()
                    .trim();

            const filtered =
                exerciseLibrary.filter(
                    exercise =>

                        String(
                            exercise.name || ""
                        )
                            .toLowerCase()
                            .includes(
                                value
                            ) ||

                        String(
                            exercise.muscle || ""
                        )
                            .toLowerCase()
                            .includes(
                                value
                            ) ||

                        String(
                            exercise.equipment || ""
                        )
                            .toLowerCase()
                            .includes(
                                value
                            )
                );

            displayLibraryExercises(
                filtered
            );
        }
    );
}


// ========================================
// VIEW EXERCISE
// ========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".viewExerciseBtn"
            );

        if (!button) {
            return;
        }

        const id =
            Number(
                button.dataset.id
            );

        selectedExercise =
            exerciseLibrary.find(
                exercise =>
                    exercise.id ===
                    id
            );

        if (!selectedExercise) {
            showLibraryToast(
                "Exercise not found.",
                "error"
            );

            return;
        }

        const bodyImage =
            document.getElementById(
                "exerciseMuscleImage"
            );

        if (bodyImage) {

            bodyImage.src =
                selectedExercise.bodyMap ||
                "";

            bodyImage.alt =
                selectedExercise.name ||
                "Target muscle";
        }

        const titleEl =
            document.getElementById(
                "exerciseTitle"
            );

        if (titleEl) {

            titleEl.textContent =
                selectedExercise.name ||
                "";
        }

        const bodyEl =
            document.getElementById(
                "exerciseBody"
            );

        if (bodyEl) {

            const images =
                Array.isArray(
                    selectedExercise.images
                )
                    ? selectedExercise.images
                    : [];

            bodyEl.innerHTML = `
                <hr>

                <p>
                    <strong>Muscle:</strong>
                    ${selectedExercise.muscle || "—"}
                </p>

                <p>
                    <strong>Equipment:</strong>
                    ${selectedExercise.equipment || "—"}
                </p>

                <p>
                    <strong>Difficulty:</strong>
                    ${selectedExercise.difficulty || "—"}
                </p>

                <p>
                    <strong>Type:</strong>
                    ${selectedExercise.type || "—"}
                </p>

                <hr>

                ${
                    images.length
                        ? `
                            <div class="exercise-images mb-3">

                                ${images
                                    .map(
                                        image => `
                                            <img
                                                src="${image}"
                                                class="img-fluid rounded mb-2"
                                                alt="${selectedExercise.name || "Exercise"}"
                                            >
                                        `
                                    )
                                    .join("")}

                            </div>
                        `
                        : ""
                }

                <h5>
                    How to Perform
                </h5>

                <ol>
                    ${
                        (
                            selectedExercise.instructions ||
                            []
                        )
                            .map(
                                step =>
                                    `<li>${step}</li>`
                            )
                            .join("")
                    }
                </ol>

                <h5>
                    Tips
                </h5>

                <ul>
                    ${
                        (
                            selectedExercise.tips ||
                            []
                        )
                            .map(
                                tip =>
                                    `<li>${tip}</li>`
                            )
                            .join("")
                    }
                </ul>

                <h5>
                    Common Mistakes
                </h5>

                <ul>
                    ${
                        (
                            selectedExercise.mistakes ||
                            []
                        )
                            .map(
                                mistake =>
                                    `<li>${mistake}</li>`
                            )
                            .join("")
                    }
                </ul>
            `;
        }

        selectedWorkout =
            null;

        if (workoutDateSelect) {

            workoutDateSelect.value =
                "";

            checkWorkoutDate();
        }

        const modalEl =
            document.getElementById(
                "exerciseModal"
            );

        if (modalEl) {

            bootstrap.Modal
                .getOrCreateInstance(
                    modalEl
                )
                .show();
        }
    }
);


// ========================================
// OPEN ADD-TO-WORKOUT
// ========================================

if (openAddWorkoutBtn) {

    openAddWorkoutBtn.addEventListener(
        "click",
        () => {

            if (!selectedExercise) {

                showLibraryToast(
                    "Please select an exercise first.",
                    "warning"
                );

                return;
            }

            updateWeightUnit();

            const exerciseModal =
                document.getElementById(
                    "exerciseModal"
                );

            if (exerciseModal) {

                bootstrap.Modal
                    .getOrCreateInstance(
                        exerciseModal
                    )
                    .hide();
            }

            const addModal =
                document.getElementById(
                    "addWorkoutModal"
                );

            if (addModal) {

                bootstrap.Modal
                    .getOrCreateInstance(
                        addModal
                    )
                    .show();
            }
        }
    );
}


// ========================================
// CHECK WORKOUT DATE
// ========================================

function checkWorkoutDate() {
    if (!workoutDateSelect) return;

    const date = workoutDateSelect.value;
    selectedWorkout = null;

    if (!date) {
        if (existingWorkoutContainer) {
            existingWorkoutContainer.classList.add("d-none");
        }
        if (newWorkoutContainer) {
            newWorkoutContainer.classList.add("d-none");
        }
        return;
    }

    selectedWorkout =
        workouts.find(workout => {
            const scheduled =
                workout.scheduledDate || workout.scheduled_date;

            if (!scheduled) return false;

            return String(scheduled).slice(0, 10) === date;
        }) || null;

    if (selectedWorkout) {
        normalizeSelectedWorkout();

        if (existingWorkoutContainer) {
            existingWorkoutContainer.classList.remove("d-none");
        }
        if (newWorkoutContainer) {
            newWorkoutContainer.classList.add("d-none");
        }
        if (existingWorkoutName) {
            existingWorkoutName.textContent =
                `${selectedWorkout.day || ""} • ${selectedWorkout.name || "Workout"}`;
        }
        if (addExerciseBtn) {
            addExerciseBtn.textContent = "Add Exercise";
        }
        return;
    }

    // No workout on this date
    if (existingWorkoutContainer) {
        existingWorkoutContainer.classList.add("d-none");
    }
    if (newWorkoutContainer) {
        newWorkoutContainer.classList.remove("d-none");
    }

    showLibraryToast(
        "No workout scheduled for this date. Create one below.",
        "warning"
    );

    const nameInput = document.getElementById("newWorkoutName");
    const categoryInput = document.getElementById("newWorkoutCategory");
    const goalInput = document.getElementById("newWorkoutGoal");
    const difficultyInput = document.getElementById("newWorkoutDifficulty");

    if (nameInput) nameInput.value = "";
    if (categoryInput) categoryInput.value = "Strength";
    if (goalInput) goalInput.value = "Build Muscle";
    if (difficultyInput) difficultyInput.value = "Beginner";

    if (addExerciseBtn) {
        addExerciseBtn.textContent = "Create Workout & Add Exercise";
    }
}


function normalizeSelectedWorkout() {

    if (!selectedWorkout) {
        return null;
    }

    if (!Array.isArray(
        selectedWorkout.exercises
    )) {

        selectedWorkout.exercises =
            [];
    }

    selectedWorkout.scheduledDate =
        selectedWorkout.scheduledDate ||
        selectedWorkout.scheduled_date ||
        null;

    selectedWorkout.exerciseCount =
        selectedWorkout.exercises.length;

    return selectedWorkout;
}


if (workoutDateSelect) {

    workoutDateSelect.addEventListener(
        "change",
        checkWorkoutDate
    );
}


// ========================================
// API HELPERS
// ========================================

async function createWorkoutFromLibrary(
    workoutData,
    session
) {

    const response =
        await fetch(
            "http://localhost:5000/api/workouts",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${session.access_token}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(
                    workoutData
                )
            }
        );

    const text =
        await response.text();

    let result = null;

    try {
        result =
            text
                ? JSON.parse(text)
                : null;
    } catch {
        result = null;
    }

    if (!response.ok) {

        throw new Error(
            result?.error ||
            "Failed to create workout."
        );
    }

    return Array.isArray(
        result
    )
        ? result[0]
        : result;
}


async function updateWorkoutFromLibrary(
    workout,
    session
) {

    const response =
        await fetch(
            `http://localhost:5000/api/workouts/${workout.id}`,
            {
                method: "PUT",

                headers: {
                    "Authorization":
                        `Bearer ${session.access_token}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    name:
                        workout.name,

                    day:
                        workout.day,

                    category:
                        workout.category ||
                        null,

                    goal:
                        workout.goal ||
                        null,

                    difficulty:
                        workout.difficulty ||
                        null,

                    scheduled_date:
                        workout.scheduledDate ||
                        workout.scheduled_date ||
                        null,

                    duration:
                        Number(
                            workout.duration
                        ) || 60,

                    exercises:
                        Array.isArray(
                            workout.exercises
                        )
                            ? workout.exercises
                            : [],

                    exercise_count:
                        Array.isArray(
                            workout.exercises
                        )
                            ? workout.exercises.length
                            : 0,

                    completed_date:
                        workout.completedDate ||
                        workout.completed_date ||
                        null,

                    start_time:
                        workout.startTime ||
                        workout.start_time ||
                        null,

                    duration_seconds:
                        Number(
                            workout.durationSeconds
                        ) || 0,

                    actual_duration_minutes:
                        Number(
                            workout.actualDurationMinutes
                        ) || 0
                })
            }
        );

    const text =
        await response.text();

    let result = null;

    try {
        result =
            text
                ? JSON.parse(text)
                : null;
    } catch {
        result = null;
    }

    if (!response.ok) {

        throw new Error(
            result?.error ||
            "Failed to update workout."
        );
    }

    return Array.isArray(
        result
    )
        ? result[0]
        : result;
}


// ========================================
// ADD EXERCISE TO WORKOUT
// ========================================

if (addExerciseBtn) {

    addExerciseBtn.addEventListener(
        "click",
        async () => {

            if (!selectedExercise) {

                showLibraryToast(
                    "Please select an exercise first.",
                    "warning"
                );

                return;
            }

            const session =
                requireLibrarySession();

            if (!session) {
                return;
            }

            let workout =
                selectedWorkout;

            // ==================================
            // CREATE NEW WORKOUT
            // ==================================

            if (!workout) {

                if (
                    !workoutDateSelect ||
                    !workoutDateSelect.value
                ) {

                    showLibraryToast(
                        "Please choose a workout date.",
                        "warning"
                    );

                    return;
                }

                const nameInput =
                    document.getElementById(
                        "newWorkoutName"
                    );

                const workoutName =
                    nameInput
                        ? nameInput.value.trim()
                        : "";

                if (!workoutName) {

                    showLibraryToast(
                        "Workout name is required.",
                        "warning"
                    );

                    return;
                }

                const dateValue =
                    workoutDateSelect.value;

                const scheduled =
                    new Date(
                        `${dateValue}T00:00:00`
                    );

                if (
                    Number.isNaN(
                        scheduled.getTime()
                    )
                ) {

                    showLibraryToast(
                        "Invalid workout date.",
                        "warning"
                    );

                    return;
                }

                const day =
                    scheduled.toLocaleDateString(
                        "en-US",
                        {
                            weekday:
                                "long"
                        }
                    );

                const selectedSets =
                    Number(
                        document.getElementById(
                            "exerciseSets"
                        )?.value
                    ) || 3;

                const selectedReps =
                    Number(
                        document.getElementById(
                            "exerciseReps"
                        )?.value
                    ) || 10;

                const selectedWeight =
                    document.getElementById(
                        "exerciseWeight"
                    )?.value || "";

                const selectedNotes =
                    document.getElementById(
                        "exerciseNotes"
                    )?.value || "";

                const exercise = {
                    ...selectedExercise,

                    sets:
                        selectedSets,

                    reps:
                        selectedReps,

                    weight:
                        selectedWeight,

                    notes:
                        selectedNotes,

                    completed:
                        false,

                    volume:
                        0,

                    calories:
                        0
                };

                try {

                    const saved =
                        await createWorkoutFromLibrary(
                            {
                                name:
                                    capitalizeLibraryWorkoutName(
                                        workoutName
                                    ),

                                day,

                                category:
                                    document.getElementById(
                                        "newWorkoutCategory"
                                    )?.value ||
                                    "Strength",

                                goal:
                                    document.getElementById(
                                        "newWorkoutGoal"
                                    )?.value ||
                                    "Build Muscle",

                                difficulty:
                                    document.getElementById(
                                        "newWorkoutDifficulty"
                                    )?.value ||
                                    "Beginner",

                                scheduled_date:
                                    dateValue,

                                duration:
                                    60,

                                exercises: [
                                    exercise
                                ],

                                exercise_count:
                                    1,

                                completed_date:
                                    null,

                                start_time:
                                    null
                            },
                            session
                        );

                    const frontendWorkout =
                        normalizeLibraryWorkout(
                            saved
                        );

                    // Keep local cache synchronized
                    const existingIndex =
                        workouts.findIndex(
                            item =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    frontendWorkout.id
                                )
                        );

                    if (
                        existingIndex >=
                        0
                    ) {

                        workouts[
                            existingIndex
                        ] =
                            frontendWorkout;

                    } else {

                        workouts.push(
                            frontendWorkout
                        );
                    }

                    saveWorkouts();

                    selectedWorkout =
                        frontendWorkout;

                    closeAddWorkoutModal();

                    showLibraryToast(
                        `${selectedExercse.name} added to ${frontendWorkout.name}.`,
                        "success"
                    );

                } catch (error) {

                    console.error(
                        "Library workout creation failed:",
                        error
                    );

                    showLibraryToast(
                        error.message ||
                        "Failed to create workout.",
                        "error"
                    );

                }

                return;
            }


            // ==================================
            // EXISTING WORKOUT
            // ==================================

            normalizeSelectedWorkout();

            if (
                selectedWorkout.completed
            ) {

                showLibraryToast(
                    "Completed workouts cannot be changed.",
                    "warning"
                );

                return;
            }

            if (
                selectedWorkout.exercises.some(
                    exercise =>
                        Number(
                            exercise.id
                        ) ===
                        Number(
                            selectedExercise.id
                        )
                )
            ) {

                showLibraryToast(
                    "Exercise already exists in this workout.",
                    "warning"
                );

                return;
            }

            const sets =
                Number(
                    document.getElementById(
                        "exerciseSets"
                    )?.value
                ) || 3;

            const reps =
                Number(
                    document.getElementById(
                        "exerciseReps"
                    )?.value
                ) || 10;

            const weight =
                document.getElementById(
                    "exerciseWeight"
                )?.value || "";

            const notes =
                document.getElementById(
                    "exerciseNotes"
                )?.value || "";

            selectedWorkout.exercises.push({

                ...selectedExercise,

                sets,

                reps,

                weight,

                notes,

                completed:
                    false,

                volume:
                    0,

                calories:
                    0
            });

            selectedWorkout.exerciseCount =
                selectedWorkout.exercises.length;

            try {

                const saved =
                    await updateWorkoutFromLibrary(
                        selectedWorkout,
                        session
                    );

                if (saved) {

                    selectedWorkout =
                        normalizeLibraryWorkout(
                            saved
                        );
                }

                const index =
                    workouts.findIndex(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                selectedWorkout.id
                            )
                    );

                if (index !== -1) {

                    workouts[index] =
                        selectedWorkout;
                }

                saveWorkouts();

                closeAddWorkoutModal();

                showLibraryToast(
                    `${selectedExercise.name} added to ${selectedWorkout.name}.`,
                    "success"
                );

            } catch (error) {

                console.error(
                    "Library workout update failed:",
                    error
                );

                showLibraryToast(
                    error.message ||
                    "Failed to update workout.",
                    "error"
                );
            }
        }
    );
}


// ========================================
// NORMALIZE WORKOUT FROM API
// ========================================

function normalizeLibraryWorkout(
    workout
) {

    if (!workout) {
        return null;
    }

    const normalized = {
        ...workout,

        scheduledDate:
            workout.scheduled_date ??
            workout.scheduledDate ??
            null,

        exerciseCount:
            workout.exercise_count ??
            workout.exerciseCount ??
            0,

        completedDate:
            workout.completed_date ??
            workout.completedDate ??
            null,

        startTime:
            workout.start_time ??
            workout.startTime ??
            null,

        durationSeconds:
            Number(
                workout.duration_seconds ??
                workout.durationSeconds ??
                0
            ),

        actualDurationMinutes:
            Number(
                workout.actual_duration_minutes ??
                workout.actualDurationMinutes ??
                0
            ),

        completed:
            Boolean(
                workout.completed
            ) ||
            Boolean(
                workout.completed_date ||
                workout.completedDate
            ),

        exercises:
            Array.isArray(
                workout.exercises
            )
                ? workout.exercises
                : []
    };

    normalized.exerciseCount =
        normalized.exercises.length;

    return normalized;
}


// ========================================
// CAPITALIZE WORKOUT NAME
// ========================================

function capitalizeLibraryWorkoutName(
    name
) {

    if (!name) {
        return "";
    }

    const text =
        String(
            name
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
// CLOSE ADD MODAL
// ========================================

function closeAddWorkoutModal() {

    const addModal =
        document.getElementById(
            "addWorkoutModal"
        );

    if (addModal) {

        const instance =
            bootstrap.Modal.getInstance(
                addModal
            );

        if (instance) {
            instance.hide();
        }
    }

    const workoutNameInput =
        document.getElementById(
            "newWorkoutName"
        );

    if (workoutNameInput) {
        workoutNameInput.value =
            "";
    }

    const setsInput =
        document.getElementById(
            "exerciseSets"
        );

    const repsInput =
        document.getElementById(
            "exerciseReps"
        );

    const weightInput =
        document.getElementById(
            "exerciseWeight"
        );

    const notesInput =
        document.getElementById(
            "exerciseNotes"
        );

    if (setsInput) {
        setsInput.value =
            3;
    }

    if (repsInput) {
        repsInput.value =
            10;
    }

    if (weightInput) {
        weightInput.value =
            "";
    }

    if (notesInput) {
        notesInput.value =
            "";
    }

    selectedWorkout =
        null;

    if (workoutDateSelect) {

        workoutDateSelect.value =
            "";
    }

    if (existingWorkoutContainer) {

        existingWorkoutContainer.classList.add(
            "d-none"
        );
    }

    if (newWorkoutContainer) {

        newWorkoutContainer.classList.add(
            "d-none"
        );
    }
}


// ========================================
// INITIALIZE
// ========================================

updateWeightUnit();

displayLibraryExercises(
    typeof exerciseLibrary !==
    "undefined"
        ? exerciseLibrary
        : []
);

