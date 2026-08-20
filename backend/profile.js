// backend/profile.js
const express = require("express");
const router = express.Router();

const supabaseAdmin = require("./supabase");
const requireAuth = require("./middleware/authMiddleware");

// ======================================================
// GET /api/profile
// ======================================================

router.get("/", requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", req.user.id)
            .maybeSingle();

        if (error) {
            console.error("Profile fetch error:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        // No row yet → empty profile
        if (!data) {
            return res.json({
                success: true,
                profile: {
                    id: req.user.id,
                    email: req.user.email || "",
                    name: "",
                    height: "",
                    weight: "",
                    level: "Beginner",
                    goal: "Build Muscle"
                }
            });
        }

        return res.json({
            success: true,
            profile: data
        });
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to load profile"
        });
    }
});

// ======================================================
// PUT /api/profile
// ======================================================

router.put("/", requireAuth, async (req, res) => {
    try {
        const { name, height, weight, level, goal } = req.body;

        const { data, error } = await supabaseAdmin
            .from("users")
            .upsert(
                {
                    id: req.user.id,
                    email: req.user.email || null,
                    name: name || "",
                    height: height || "",
                    weight: weight || "",
                    level: level || "Beginner",
                    goal: goal || "Build Muscle"
                },
                { onConflict: "id" }
            )
            .select()
            .maybeSingle();

        if (error) {
            console.error("PUT PROFILE ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.json({
            success: true,
            profile: data
        });
    } catch (error) {
        console.error("PUT PROFILE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to update profile"
        });
    }
});

// ======================================================
// DELETE /api/profile
// ======================================================

router.delete("/", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete profile row
        const { error: profileError } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("id", userId);

        if (profileError) {
            console.error("Profile deletion error:", profileError);
            return res.status(400).json({
                success: false,
                error: profileError.message
            });
        }

        // Delete Auth user (needs service role / admin client)
        const { error: authDeleteError } =
            await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error("Auth account deletion error:", authDeleteError);
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
        console.error("DELETE ACCOUNT ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to delete account."
        });
    }
});

module.exports = router;