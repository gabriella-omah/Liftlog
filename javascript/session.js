// ========================================
// LiftLog — Frontend Session Manager
// javascript/session.js
// ========================================

(function () {

    // ==================================================
    // GET SESSION
    // ==================================================

    window.getLiftLogSession = function () {

        try {

            const session =
                localStorage.getItem(
                    "liftlogSession"
                );


            if (!session) {
                return null;
            }


            const parsed =
                JSON.parse(session);


            if (
                !parsed ||
                !parsed.access_token
            ) {
                return null;
            }


            return parsed;

        } catch (error) {

            console.error(
                "Invalid LiftLog session:",
                error
            );


            localStorage.removeItem(
                "liftlogSession"
            );


            return null;

        }

    };


    // ==================================================
    // GET USER
    // ==================================================

    window.getLiftLogUser = function () {

        try {

            const user =
                localStorage.getItem(
                    "liftlogUser"
                );


            if (!user) {
                return null;
            }


            return JSON.parse(user);

        } catch (error) {

            console.error(
                "Invalid LiftLog user:",
                error
            );


            localStorage.removeItem(
                "liftlogUser"
            );


            return null;

        }

    };


    // ==================================================
    // CHECK LOGIN
    // ==================================================

    window.isLiftLogLoggedIn = function () {

        const session =
            window.getLiftLogSession();


        return !!(
            session &&
            session.access_token
        );

    };


    // ==================================================
    // REQUIRE LOGIN
    // ==================================================

    window.requireLiftLogLogin = function () {

        if (
            window.isLiftLogLoggedIn()
        ) {

            return true;

        }


        console.warn(
            "No LiftLog session found. Redirecting to login."
        );


        window.location.replace(
            "login.html"
        );


        return false;

    };


    // ==================================================
    // LOGOUT
    // ==================================================

    window.logoutLiftLog = function () {

        localStorage.removeItem(
            "liftlogSession"
        );


        localStorage.removeItem(
            "liftlogUser"
        );


        localStorage.removeItem(
            "liftlog_token"
        );


        window.location.replace(
            "login.html"
        );

    };


    // ==================================================
    // PROTECT CURRENT PAGE
    // ==================================================

    window.requireLiftLogLogin();

})();