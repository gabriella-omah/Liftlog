// ======================================================
// LIFTLOG AUTH GUARD
// ======================================================

(function () {

    const session =
        localStorage.getItem("liftlogSession");

    // No session = user is not logged in
    if (!session) {
        window.location.replace("login.html");
        return;
    }

})();