const supabaseAdmin = require("../supabase");

/**
 * Require a valid Supabase access token.
 *
 * Expected header:
 * Authorization: Bearer <access_token>
 */
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authentication token missing."
            });
        }

        const {
            data: { user },
            error
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            console.error("AUTH TOKEN ERROR:", error);
            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Authentication check failed."
        });
    }
}

module.exports = requireAuth;