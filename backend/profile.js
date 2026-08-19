const express = require("express");
const router = express.Router();
const supabase = require("./supabase");
// ======================================================
// GET PROFILE
// GET /api/profile
// ======================================================
router.get("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }
        const token = authHeader.replace("Bearer ", "").trim();
        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser(token);
        if (userError || !user) {
            console.error("Profile authentication error:", userError);
            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }
        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();
        if (profileError) {
            console.error("Profile fetch error:", profileError);
            return res.status(404).json({
                success: false,
                error: "Profile not found."
            });
        }
        return res.json({
            success: true,
            profile
        });
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to load profile."
        });
    }
});
// ======================================================
// UPDATE PROFILE
// PUT /api/profile
// ======================================================
router.put("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }
        const token = authHeader.replace("Bearer ", "").trim();
        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser(token);
        if (userError || !user) {
            console.error("Profile authentication error:", userError);
            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }
        const {
            name,
            height,
            weight,
            level,
            goal
        } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: "Name is required."
            });
        }
        const cleanName = name.trim();
        const namePattern = /^[A-Za-z]+([ '-][A-Za-z]+)*$/;
        if (!namePattern.test(cleanName)) {
            return res.status(400).json({
                success: false,
                error: "Name can only contain letters."
            });
        }
        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("users")
            .update({
                name: cleanName,
                height: height || null,
                weight: weight || null,
                level: level || "Beginner",
                goal: goal || "Build Muscle"
            })
            .eq("id", user.id)
            .select()
            .single();
        if (profileError) {
            console.error("Profile update error:", profileError);
            return res.status(400).json({
                success: false,
                error: profileError.message
            });
        }
        // Keep Supabase Auth metadata synchronized with profile name.
        const {
            error: authUpdateError
        } = await supabase.auth.admin.updateUserById(
            user.id,
            {
                user_metadata: {
                    ...user.user_metadata,
                    name: cleanName
                }
            }
        );
        if (authUpdateError) {
            console.error(
                "Auth metadata update warning:",
                authUpdateError
            );
        }
        return res.json({
            success: true,
            message: "Profile updated successfully.",
            profile
        });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to update profile."
        });
    }
});

// ======================================================
// DELETE ACCOUNT
// DELETE /api/profile
// ======================================================

router.delete("/", async (req, res) => {
    try {

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        const token =
            authHeader
                .replace("Bearer ", "")
                .trim();

        // Verify the user's access token
        const {
            data: { user },
            error: userError
        } =
            await supabase.auth.getUser(token);

        if (userError || !user) {

            console.error(
                "Delete account authentication error:",
                userError
            );

            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }

        // Delete the user's profile row
        const {
            error: profileError
        } =
            await supabase
                .from("users")
                .delete()
                .eq("id", user.id);

        if (profileError) {

            console.error(
                "Profile deletion error:",
                profileError
            );

            return res.status(400).json({
                success: false,
                error: profileError.message
            });
        }

        // Delete the Supabase Auth account
        const {
            error: authDeleteError
        } =
            await supabase.auth.admin.deleteUser(
                user.id
            );

        if (authDeleteError) {

            console.error(
                "Auth account deletion error:",
                authDeleteError
            );

            return res.status(500).json({
                success: false,
                error:
                    "Profile data was deleted, but the authentication account could not be removed."
            });
        }

        return res.json({
            success: true,
            message: "Account deleted successfully."
        });

    } catch (error) {

        console.error(
            "DELETE ACCOUNT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Failed to delete account."
        });
    }
});


module.exports = router;