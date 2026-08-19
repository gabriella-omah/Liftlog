// ========================================
// LiftLog — Frontend Session Manager
// javascript/session.js
// ========================================

function getLiftLogSession() {
try {
const session = localStorage.getItem("liftlogSession");

    if (!session) {
        return null;
    }
    return JSON.parse(session);
} catch (error) {
    console.error("Invalid LiftLog session:", error);
    localStorage.removeItem("liftlogSession");
    return null;
}

}

function getLiftLogUser() {
try {
const user = localStorage.getItem("liftlogUser");

    if (!user) {
        return null;
    }
    return JSON.parse(user);
} catch (error) {
    console.error("Invalid LiftLog user:", error);
    localStorage.removeItem("liftlogUser");
    return null;
}

}

function isLiftLogLoggedIn() {
const session = getLiftLogSession();

return !!(
    session &&
    session.access_token &&
    session.user
);

}

function requireLiftLogLogin() {

if (isLiftLogLoggedIn()) {
    return true;
}
window.location.replace("login.html");
return false;

}

function logoutLiftLog() {

localStorage.removeItem("liftlogSession");
localStorage.removeItem("liftlogUser");
window.location.replace("login.html");

}

// ========================================
// Protect current page
// ========================================

requireLiftLogLogin();