// backend/auth.js
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const supabaseAdmin = require("./supabase");

const router = express.Router();

console.log("=================================");
console.log("AUTH ROUTE LOADED");
console.log("Using supabaseAdmin:", !!supabaseAdmin);
console.log("=================================");

// ======================================================
// TEST
// ======================================================

router.get("/test", (req, res) => {
    return res.json({
        success: true,
        message: "Auth route is working"
    });
});

// ======================================================
// DEBUG — checks admin can read public.users
// ======================================================

router.get("/debug", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("id")
            .limit(1);

        if (error) {
            console.error("DEBUG USERS ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
        }

        return res.json({
            success: true,
            message: "Backend can access public.users",
            rowsReturned: data?.length || 0
        });
    } catch (error) {
        console.error("DEBUG ERROR:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================================================
// REGISTER
// ======================================================

router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: "Name, email and password are required."
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanName = String(name).trim();

        if (!cleanName) {
            return res.status(400).json({
                success: false,
                error: "Name cannot be empty."
            });
        }

        console.log("========== REGISTER ==========");
        console.log("Email:", cleanEmail);
        console.log("Name:", cleanName);

        // 1) Create Auth user
        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password: password,
                email_confirm: true,
                user_metadata: {
                    name: cleanName
                }
            });

        if (authError) {
            console.error("AUTH USER CREATION ERROR:", authError);
            return res.status(400).json({
                success: false,
                error: authError.message
            });
        }

        const user = authData?.user;

        if (!user) {
            return res.status(500).json({
                success: false,
                error: "Supabase created the account but returned no user."
            });
        }

        console.log("Auth user created:", user.id);

        // 2) Profile may already exist via DB trigger on auth.users
        let profile = null;

        const { data: existingProfile, error: existingError } =
            await supabaseAdmin
                .from("users")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

        if (existingError) {
            console.error("PROFILE LOOKUP ERROR:", existingError);

            try {
                await supabaseAdmin.auth.admin.deleteUser(user.id);
                console.log("Auth user rolled back.");
            } catch (rollbackError) {
                console.error("ROLLBACK ERROR:", rollbackError);
            }

            return res.status(400).json({
                success: false,
                error: existingError.message,
                code: existingError.code
            });
        }

        if (existingProfile) {
            // Trigger already created the row — update name/email
            const { data: updatedProfile, error: updateError } =
                await supabaseAdmin
                    .from("users")
                    .update({
                        name: cleanName,
                        email: cleanEmail
                    })
                    .eq("id", user.id)
                    .select()
                    .single();

            if (updateError) {
                console.error("PROFILE UPDATE ERROR:", updateError);
                profile = existingProfile;
            } else {
                profile = updatedProfile;
            }

            console.log("Profile already existed (likely trigger).");
        } else {
            // No row yet — insert manually
            const { data: newProfile, error: profileError } =
                await supabaseAdmin
                    .from("users")
                    .insert({
                        id: user.id,
                        email: cleanEmail,
                        name: cleanName
                    })
                    .select()
                    .single();

            if (profileError) {
                // Race with trigger: treat duplicate as success
                if (profileError.code === "23505") {
                    const { data: racedProfile } = await supabaseAdmin
                        .from("users")
                        .select("*")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (racedProfile) {
                        profile = racedProfile;
                        console.log("Profile created by trigger during insert race.");
                    } else {
                        console.error("PROFILE INSERT ERROR:", profileError);

                        try {
                            await supabaseAdmin.auth.admin.deleteUser(user.id);
                            console.log("Auth user rolled back.");
                        } catch (rollbackError) {
                            console.error("ROLLBACK ERROR:", rollbackError);
                        }

                        return res.status(400).json({
                            success: false,
                            error: profileError.message,
                            code: profileError.code
                        });
                    }
                } else {
                    console.error("PROFILE INSERT ERROR:", profileError);

                    try {
                        await supabaseAdmin.auth.admin.deleteUser(user.id);
                        console.log("Auth user rolled back.");
                    } catch (rollbackError) {
                        console.error("ROLLBACK ERROR:", rollbackError);
                    }

                    return res.status(400).json({
                        success: false,
                        error: profileError.message,
                        code: profileError.code
                    });
                }
            } else {
                profile = newProfile;
            }
        }

        console.log("========== REGISTRATION SUCCESS ==========");

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: {
                id: user.id,
                email: user.email
            },
            profile
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to create account."
        });
    }
});

// ======================================================
// LOGIN
// ======================================================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required."
            });
        }

        if (!process.env.SUPABASE_PUBLISHABLE_KEY) {
            return res.status(500).json({
                success: false,
                error: "Missing SUPABASE_PUBLISHABLE_KEY in .env"
            });
        }

        const supabasePublic = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_PUBLISHABLE_KEY
        );

        const { data, error } = await supabasePublic.auth.signInWithPassword({
            email: String(email).trim().toLowerCase(),
            password
        });

        if (error) {
            console.error("SUPABASE LOGIN ERROR:", error);
            return res.status(401).json({
                success: false,
                error: error.message
            });
        }

        return res.json({
            success: true,
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to log in."
        });
    }
});

console.log(
    "Auth routes:",
    router.stack
        .filter((r) => r.route)
        .map(
            (r) =>
                `${Object.keys(r.route.methods).join(",").toUpperCase()} ${r.route.path}`
        )
);

module.exports = router;