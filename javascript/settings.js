// ========================================
// LiftLog — Settings Page
// javascript/settings.js
// ========================================


// ========================================
// PROFILE ELEMENTS
// ========================================

const profileName =
    document.getElementById("profileName");

const bodyHeight =
    document.getElementById("bodyHeight");

const bodyWeightUnit =
    document.getElementById("bodyWeightUnit");

const bodyWeight =
    document.getElementById("bodyWeight");

const fitnessLevel =
    document.getElementById("fitnessLevel");

const fitnessGoal =
    document.getElementById("fitnessGoal");

const bmiField =
    document.getElementById("bmi");

const saveProfileBtn =
    document.getElementById("saveProfileBtn");

const profileAvatar =
    document.getElementById("profileAvatar");

const displayName =
    document.getElementById("displayName");

const displayGoal =
    document.getElementById("displayGoal");


// ========================================
// PROFILE STATE
// ========================================

let profile = {
    id: "",
    email: "",
    name: "",
    height: "",
    weight: "",
    level: "Beginner",
    goal: "Build Muscle"
};


// ========================================
// CLOSE ALL OPEN SECTIONS
// ========================================

function closeAllSections() {

    document
        .querySelectorAll(".accordion-collapse.show")
        .forEach(section => {

            bootstrap
                .Collapse
                .getOrCreateInstance(section)
                .hide();

        });

}


// ========================================
// LOAD PROFILE FROM BACKEND
// ========================================

async function loadProfile() {

    const session =
        getLiftLogSession();

    if (
        !session ||
        !session.access_token
    ) {

        window.location.replace(
            "login.html"
        );

        return;
    }

    try {

        const response =
            await fetch(
                "http://localhost:5000/api/profile",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${session.access_token}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );

        const result =
            await response.json();

        console.log(
            "PROFILE LOAD RESPONSE:",
            response.status,
            result
        );

        if (!response.ok) {

            showToast(
                result.error ||
                "Failed to load profile.",
                "error"
            );

            return;
        }

        if (!result.profile) {

            showToast(
                "No profile data was returned.",
                "error"
            );

            return;
        }

        profile =
            result.profile;

        // --------------------------------
        // Fill form
        // --------------------------------

        if (profileName) {

            profileName.value =
                profile.name || "";

        }

        if (bodyHeight) {

            bodyHeight.value =
                profile.height || "";

        }

        if (bodyWeight) {

            bodyWeight.value =
                profile.weight 
                ? convertFromKg(profile.weight)
                : "";

        }

        if (fitnessLevel) {

            fitnessLevel.value =
                profile.level ||
                "Beginner";

        }

        if (fitnessGoal) {

            fitnessGoal.value =
                profile.goal ||
                "Build Muscle";

        }

        updateProfileCard();
        calculateBMI();
        updateNavbarProfile();

        console.log(
            "Profile loaded successfully:",
            profile
        );

    } catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

        showToast(
            "Unable to connect to the LiftLog server.",
            "error"
        );
    }
}


// ========================================
// UPDATE PROFILE CARD
// ========================================

function updateProfileCard() {

    if (!displayName) {
        return;
    }

    const fullName =
        String(profile.name || "").trim();

    if (fullName) {

        displayName.textContent =
            fullName
                .split(" ")
                .map(word =>
                    word.charAt(0).toUpperCase() +
                    word.slice(1).toLowerCase()
                )
                .join(" ");

        const initials =
            fullName
                .split(" ")
                .map(word =>
                    word.charAt(0)
                )
                .join("")
                .substring(0, 2)
                .toUpperCase();

        if (profileAvatar) {
            profileAvatar.textContent =
                initials;
        }

    } else {

        displayName.textContent =
            "Your Name";

        if (profileAvatar) {
            profileAvatar.textContent =
                "G";
        }
    }

    if (displayGoal) {

        displayGoal.textContent =
            profile.goal ||
            "Build Muscle";
    }
}


// ========================================
// BMI
// ========================================

function calculateBMI() {

    if (
        !bmiField ||
        !bodyHeight ||
        !bodyWeight
    ) {
        return;
    }

    const height =
        parseFloat(
            bodyHeight.value
        );

    const weight =
        parseFloat(
            bodyWeight.value
        );

    if (
        !height ||
        !weight ||
        height <= 0 ||
        weight <= 0
    ) {

        bmiField.value = "";

        return;
    }

    const bmi =
        weight /
        Math.pow(
            height / 100,
            2
        );

    bmiField.value =
        bmi.toFixed(1);
}


// ========================================
// SAVE PROFILE TO BACKEND
// ========================================

if (saveProfileBtn) {

    saveProfileBtn.addEventListener(
        "click",
        async () => {

            const name =
                profileName
                    ? profileName.value.trim()
                    : "";

            // --------------------------------
            // Validate name
            // --------------------------------

            if (!name) {

                showToast(
                    "Please enter your name.",
                    "warning"
                );

                return;
            }

            const namePattern =
                /^[A-Za-z]+([ '-][A-Za-z]+)*$/;

            if (!namePattern.test(name)) {

                showToast(
                    "Name can only contain letters.",
                    "warning"
                );

                return;
            }

            // --------------------------------
            // Get session
            // --------------------------------

            const session =
                getLiftLogSession();

            if (
                !session ||
                !session.access_token
            ) {

                window.location.replace(
                    "login.html"
                );

                return;
            }

            // --------------------------------
            // Prepare profile
            // --------------------------------

            const updatedProfile = {

                name,

                height:
                    bodyHeight
                        ? bodyHeight.value
                        : "",

                weight:
                    bodyWeight && bodyWeight.value
                        ? convertFromKg(bodyWeight.value)
                        : "",

                level:
                    fitnessLevel
                        ? fitnessLevel.value
                        : "Beginner",

                goal:
                    fitnessGoal
                        ? fitnessGoal.value
                        : "Build Muscle"
            };

            try {

                saveProfileBtn.disabled =
                    true;

                saveProfileBtn.textContent =
                    "Saving...";

                const response =
                    await fetch(
                        "http://localhost:5000/api/profile",
                        {
                            method: "PUT",

                            headers: {
                                "Authorization":
                                    `Bearer ${session.access_token}`,

                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    updatedProfile
                                )
                        }
                    );

                const result =
                    await response.json();

                console.log(
                    "PROFILE SAVE RESPONSE:",
                    response.status,
                    result
                );

                if (!response.ok) {

                    showToast(
                        result.error ||
                        "Failed to update profile.",
                        "error"
                    );

                    return;
                }

                // --------------------------------
                // Update local page state
                // --------------------------------

                profile =
                    result.profile;

                localStorage.setItem("profile", JSON.stringify(profile));

                updateProfileCard();
                calculateBMI();
                updateNavbarProfile();


                showToast(
                    "Profile updated successfully!",
                    "success"
                );

                closeAllSections();

            } catch (error) {

                console.error(
                    "PROFILE UPDATE ERROR:",
                    error
                );

                showToast(
                    "Unable to save your profile.",
                    "error"
                );

            } finally {

                saveProfileBtn.disabled =
                    false;

                saveProfileBtn.textContent =
                    "Save Profile";
            }
        }
    );
}


// ========================================
// LIVE BMI
// ========================================

if (bodyHeight) {

    bodyHeight.addEventListener(
        "input",
        calculateBMI
    );
}

if (bodyWeight) {

    bodyWeight.addEventListener(
        "input",
        calculateBMI
    );
}


// ========================================
// PREFERENCES
// ========================================

const weightUnitSelect =
    document.getElementById(
        "weightUnit"
    );


// ========================================
// NOTIFICATIONS
// ========================================

// ========================================
// NOTIFICATIONS
// ========================================

const notificationsSwitch =
    document.getElementById(
        "notifications"
    );


// ----------------------------------------
// Local preference
// ----------------------------------------

const savedNotificationPreference =
    localStorage.getItem(
        "notifications"
    );


// Default to ON only if the user has
// already explicitly enabled it.
// Otherwise leave it OFF.
if (
    savedNotificationPreference ===
    null
) {
    localStorage.setItem(
        "notifications",
        "false"
    );
}


// ----------------------------------------
// Update switch appearance
// ----------------------------------------

function updateNotificationSwitch() {

    if (!notificationsSwitch) {
        return;
    }

    notificationsSwitch.checked =
        localStorage.getItem(
            "notifications"
        ) === "true";
}


// ----------------------------------------
// Enable notifications
// ----------------------------------------

async function enableLiftLogNotifications() {

    if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
    ) {

        showToast(
            "This browser does not support LiftLog push notifications.",
            "error"
        );

        return false;
    }


    // IMPORTANT:
    // This is called directly from the
    // user's switch click.
    const permission =
        await Notification.requestPermission();


    if (
        permission !==
        "granted"
    ) {

        localStorage.setItem(
            "notifications",
            "false"
        );

        updateNotificationSwitch();

        if (
            permission === "denied"
        ) {

            showToast(
                "Notifications were blocked. You can allow them in your browser or phone settings.",
                "warning"
            );

        } else {

            showToast(
                "Notification permission was not granted.",
                "warning"
            );
        }

        return false;
    }


    try {

        // Register service worker.
        if (
            typeof registerLiftLogServiceWorker ===
            "function"
        ) {

            await registerLiftLogServiceWorker();
        }


        const registration =
            await navigator.serviceWorker.ready;


        let subscription =
            await registration
                .pushManager
                .getSubscription();


        // --------------------------------
        // Create push subscription
        // --------------------------------

        if (!subscription) {

            const keyResponse =
                await authenticatedFetch(
                    "http://localhost:5000/api/push/public-key",
                    {
                        method: "GET"
                    }
                );


            if (!keyResponse.ok) {

                throw new Error(
                    "Could not retrieve push public key."
                );
            }


            const keyData =
                await keyResponse.json();


            if (
                !keyData.publicKey
            ) {

                throw new Error(
                    "Push public key is missing."
                );
            }


            const applicationServerKey =
                urlBase64ToUint8Array(
                    keyData.publicKey
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


        // --------------------------------
        // Save subscription to backend
        // --------------------------------

        const saveResponse =
            await authenticatedFetch(
                "http://localhost:5000/api/push/subscribe",
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            subscription.toJSON()
                        )
                }
            );


        if (!saveResponse.ok) {

            const errorText =
                await saveResponse.text();

            throw new Error(
                errorText ||
                "Failed to save push subscription."
            );
        }


        localStorage.setItem(
            "notifications",
            "true"
        );


        updateNotificationSwitch();


        showToast(
            "Workout notifications enabled.",
            "success"
        );


        // Optional test notification so the user
        // immediately knows the setup worked.
        if (
            typeof getLiftLogServiceWorker ===
            "function"
        ) {

            const sw =
                await getLiftLogServiceWorker();


            if (sw) {

                await sw.showNotification(
                    "LiftLog Notifications Enabled",
                    {
                        body:
                            "You will receive workout timer notifications from LiftLog.",

                        icon:
                            "/icons/icon-192.png",

                        badge:
                            "/icons/icon-192.png",

                        tag:
                            "liftlog-notification-test",

                        data: {
                            type:
                                "notification-test"
                        }
                    }
                );
            }
        }


        return true;

    } catch (error) {

        console.error(
            "Enable notifications failed:",
            error
        );


        localStorage.setItem(
            "notifications",
            "false"
        );


        updateNotificationSwitch();


        showToast(
            "LiftLog could not finish notification setup.",
            "error"
        );


        return false;
    }
}


// ----------------------------------------
// Disable notifications
// ----------------------------------------

async function disableLiftLogNotifications() {

    try {

        if (
            "serviceWorker" in navigator &&
            "PushManager" in window
        ) {

            const registration =
                await navigator.serviceWorker.ready;


            const subscription =
                await registration
                    .pushManager
                    .getSubscription();


            if (subscription) {

                const endpoint =
                    subscription.endpoint;


                // Remove subscription from browser.
                await subscription.unsubscribe();


                // Tell backend to stop using
                // this device subscription.
                try {

                    await authenticatedFetch(
                        "http://localhost:5000/api/push/unsubscribe",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    endpoint
                                })
                        }
                    );

                } catch (serverError) {

                    console.warn(
                        "Could not remove push subscription from server:",
                        serverError
                    );
                }
            }
        }


        localStorage.setItem(
            "notifications",
            "false"
        );


        updateNotificationSwitch();


        showToast(
            "Workout notifications disabled.",
            "warning"
        );


        return true;

    } catch (error) {

        console.error(
            "Disable notifications failed:",
            error
        );


        // Still disable locally.
        localStorage.setItem(
            "notifications",
            "false"
        );


        updateNotificationSwitch();


        showToast(
            "Notifications were disabled on this device.",
            "warning"
        );


        return false;
    }
}


// ----------------------------------------
// Switch initialization
// ----------------------------------------

if (notificationsSwitch) {

    notificationsSwitch.disabled =
        false;


    updateNotificationSwitch();


    notificationsSwitch.addEventListener(
        "change",
        async () => {

            // User turned ON
            if (
                notificationsSwitch.checked
            ) {

                // Disable the switch while
                // async permission/subscription work
                // is happening.
                notificationsSwitch.disabled =
                    true;


                const success =
                    await enableLiftLogNotifications();


                notificationsSwitch.disabled =
                    false;


                if (!success) {

                    notificationsSwitch.checked =
                        false;
                }


                return;
            }


            // User turned OFF
            notificationsSwitch.disabled =
                true;


            await disableLiftLogNotifications();


            notificationsSwitch.disabled =
                false;
        }
    );
}


// ========================================
// WEIGHT UNIT
// ========================================

if (weightUnitSelect) {

    weightUnitSelect.value =
        weightUnit;

    weightUnitSelect.addEventListener(
        "change",
        () => {

            weightUnit =
                weightUnitSelect.value;

            localStorage.setItem(
                "weightUnit",
                weightUnit
            );

            updateWeightLabels();

            if (
                bodyWeight &&
                profile.weight
            ) {

                bodyWeight.value =
                    convertFromKg(
                        profile.weight
                    );
            }

            showToast(
                weightUnit === "kg"
                    ? "Weight unit changed to kilograms."
                    : "Weight unit changed to pounds.",
                "success"
            );

            const collapse =
                document.getElementById(
                    "weightUnitCollapse"
                );

            if (collapse) {

                bootstrap
                    .Collapse
                    .getOrCreateInstance(
                        collapse
                    )
                    .hide();
            }
        }
    );
}


// ========================================
// UPDATE WEIGHT LABELS
// ========================================


function updateProfileWeightUnit() {

    if (!bodyWeightUnit) {
        return;
    }

    bodyWeightUnit.textContent =
        weightUnit === "lb"
            ? "(lb)"
            : "(kg)";
}


function updateWeightLabels() {

    document
        .querySelectorAll(".weight-unit")
        .forEach(label => {

            label.textContent =
                weightUnit;
        });

    updateProfileWeightUnit();
}


// ========================================
// GLOBAL WEIGHT HELPERS
// ========================================

function formatWeight(weightKg) {

    if (!weightKg) {
        return "0";
    }

    if (weightUnit === "kg") {

        return Number(weightKg)
            .toFixed(1);
    }

    return (
        Number(weightKg) *
        2.20462
    ).toFixed(1);
}


function convertToKg(value) {

    if (weightUnit === "kg") {

        return Number(value);
    }

    return Number(value) /
        2.20462;
}


function convertFromKg(valueKg) {

    if (weightUnit === "kg") {

        return Number(valueKg)
            .toFixed(1);
    }

    return (
        Number(valueKg) *
        2.20462
    ).toFixed(1);
}


// ========================================
// MODALS
// ========================================

const signOutBtn =
    document.getElementById(
        "signOutBtn"
    );

const confirmSignOut =
    document.getElementById(
        "confirmSignOut"
    );

const deleteAccountBtn =
    document.getElementById(
        "deleteAccountBtn"
    );

const confirmDeleteAccount =
    document.getElementById(
        "confirmDeleteAccount"
    );


// ========================================
// SIGN OUT
// ========================================

if (signOutBtn) {

    signOutBtn.addEventListener(
        "click",
        () => {

            closeAllSections();

            const modalElement =
                document.getElementById(
                    "signOutModal"
                );

            if (!modalElement) {
                return;
            }

            const modal =
                new bootstrap.Modal(
                    modalElement
                );

            modal.show();
        }
    );
}


if (confirmSignOut) {

    confirmSignOut.addEventListener(
        "click",
        () => {

            // Use the session manager
            // instead of clearing everything.
            logoutLiftLog();

        }
    );
}


// ========================================
// DELETE ACCOUNT
// ========================================

if (deleteAccountBtn) {

    deleteAccountBtn.addEventListener(
        "click",
        () => {

            closeAllSections();

            const modalElement =
                document.getElementById(
                    "deleteAccountModal"
                );

            if (!modalElement) {
                return;
            }

            const modal =
                new bootstrap.Modal(
                    modalElement
                );

            modal.show();
        }
    );
}

if (confirmDeleteAccount) {

    confirmDeleteAccount.addEventListener(
        "click",
        async () => {

            const session =
                getLiftLogSession();

            if (
                !session ||
                !session.access_token
            ) {

                window.location.replace(
                    "login.html"
                );

                return;
            }

            try {

                confirmDeleteAccount.disabled = true;

                confirmDeleteAccount.textContent =
                    "Deleting...";

                const response =
                    await fetch(
                        "http://localhost:5000/api/profile",
                        {
                            method: "DELETE",

                            headers: {
                                "Authorization":
                                    `Bearer ${session.access_token}`
                            }
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {

                    console.error(
                        "Account deletion failed:",
                        result
                    );

                    showToast(
                        result.error ||
                        "Failed to delete account.",
                        "error"
                    );

                    return;
                }

                // Account really was deleted.
                localStorage.clear();
                sessionStorage.clear();

                const modalEl =
                    document.getElementById(
                        "deleteAccountModal"
                    );

                const modal =
                    bootstrap.Modal.getInstance(
                        modalEl
                    );

                if (modal) {
                    modal.hide();
                }

                showToast(
                    "Your account has been deleted.",
                    "success"
                );

                setTimeout(() => {

                    window.location.replace(
                        "home.html"
                    );

                }, 1200);

            } catch (error) {

                console.error(
                    "DELETE ACCOUNT REQUEST ERROR:",
                    error
                );

                showToast(
                    "Unable to delete your account.",
                    "error"
                );

            } finally {

                confirmDeleteAccount.disabled =
                    false;

                confirmDeleteAccount.textContent =
                    "Delete Account";
            }
        }
    );
}


// ========================================
// ABOUT MODAL
// ========================================

const aboutTrigger =
    document.getElementById(
        "aboutTrigger"
    );

if (aboutTrigger) {

    aboutTrigger.addEventListener(
        "click",
        () => {

            closeAllSections();

            const modalElement =
                document.getElementById(
                    "aboutModal"
                );

            if (!modalElement) {
                return;
            }

            new bootstrap.Modal(
                modalElement
            ).show();
        }
    );
}


// ========================================
// SETTINGS ACCORDION BEHAVIOUR
// ========================================

const settingsTriggers =
    document.querySelectorAll(
        ".settings-collapse-trigger"
    );

settingsTriggers.forEach(
    trigger => {

        trigger.addEventListener(
            "click",
            () => {

                const targetSelector =
                    trigger.dataset.bsTarget;

                document
                    .querySelectorAll(
                        ".accordion-collapse"
                    )
                    .forEach(section => {

                        if (
                            "#" + section.id !==
                                targetSelector &&
                            section.classList.contains(
                                "show"
                            )
                        ) {

                            bootstrap
                                .Collapse
                                .getOrCreateInstance(
                                    section
                                )
                                .hide();
                        }
                    });
            }
        );
    }
);


// ========================================
// INITIALIZE SETTINGS PAGE
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadProfile();

        updateWeightLabels();

        calculateBMI();

    }
);