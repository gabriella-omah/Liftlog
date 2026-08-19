require("dotenv").config();

const express = require("express");
const cors = require("cors");
const webpush = require("web-push");

const supabaseAdmin = require("./supabase");
const authRoutes = require("./auth");
const profileRoutes = require("./profile");
const requireAuth = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================================
// STARTUP LOGS
// ======================================================

console.log("=================================");
console.log("LIFTLOG BACKEND");
console.log("=================================");
console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log("Supabase secret loaded:", !!process.env.SUPABASE_SECRET_KEY);
console.log(
    "Supabase publishable key loaded:",
    !!process.env.SUPABASE_PUBLISHABLE_KEY
);
console.log("=================================");

// ======================================================
// WEB PUSH
// ======================================================

if (
    !process.env.VAPID_SUBJECT ||
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
) {
    console.warn(
        "VAPID environment variables are missing. Push notifications will not work."
    );
} else {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log("Web Push VAPID configuration loaded.");
}

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
    cors({
        origin: [
            "http://127.0.0.1:5501",
            "http://localhost:5501",
            "http://127.0.0.1:3000",
            "http://localhost:3000"
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(express.json());

// ======================================================
// ROUTES
// ======================================================

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "LiftLog Backend Running 🚀"
    });
});

// ======================================================
// GET WORKOUTS
// ======================================================

app.get("/api/workouts", requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("workouts")
            .select("*")
            .eq("user_id", req.user.id)
            .order("scheduled_date", { ascending: true });

        if (error) {
            console.error("GET WORKOUTS ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.json(data || []);
    } catch (error) {
        console.error("GET /api/workouts ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch workouts"
        });
    }
});

// ======================================================
// CREATE WORKOUT
// ======================================================

app.post("/api/workouts", requireAuth, async (req, res) => {
    try {
        const {
            name,
            day,
            category,
            goal,
            difficulty,
            scheduled_date,
            duration,
            exercises,
            exercise_count,
            completed,
            completed_date,
            start_time,
            duration_seconds,
            actual_duration_seconds,
            actual_duration_minutes,
            total_paused_seconds,
            paused_at,
            session_status,
            missed,
            missed_date,
            timer_end_at,
            timer_remaining_seconds,
            timer_paused,
            notification_sent
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Workout name is required."
            });
        }

        if (!scheduled_date) {
            return res.status(400).json({
                success: false,
                error: "Workout date is required."
            });
        }

        const normalizedExercises = Array.isArray(exercises) ? exercises : [];
        const normalizedName = String(name).trim();
        const finalName = normalizedName
            ? normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1)
            : "Workout";

        const { data, error } = await supabaseAdmin
            .from("workouts")
            .insert({
                user_id: req.user.id,
                name: finalName,
                day: day || null,
                category: category || null,
                goal: goal || null,
                difficulty: difficulty || null,
                scheduled_date,
                duration: Number(duration) || 0,
                exercises: normalizedExercises,
                exercise_count:
                    Number(exercise_count) || normalizedExercises.length,
                completed: Boolean(completed),
                completed_date: completed_date || null,
                start_time: start_time || null,
                duration_seconds: Number(duration_seconds) || 0,
                actual_duration_seconds: Number(actual_duration_seconds) || 0,
                actual_duration_minutes: Number(actual_duration_minutes) || 0,
                total_paused_seconds: Number(total_paused_seconds) || 0,
                paused_at: paused_at || null,
                session_status: session_status || "scheduled",
                missed: Boolean(missed),
                missed_date: missed_date || null,
                timer_end_at: timer_end_at || null,
                timer_remaining_seconds: Number(timer_remaining_seconds) || 0,
                timer_paused: Boolean(timer_paused),
                notification_sent: Boolean(notification_sent)
            })
            .select()
            .single();

        if (error) {
            console.error("POST WORKOUT ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.status(201).json(data);
    } catch (error) {
        console.error("POST /api/workouts ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to create workout"
        });
    }
});

// ======================================================
// UPDATE WORKOUT
// ======================================================

app.put("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            day,
            category,
            goal,
            difficulty,
            scheduled_date,
            duration,
            exercises,
            exercise_count,
            completed,
            completed_date,
            start_time,
            duration_seconds,
            actual_duration_seconds,
            actual_duration_minutes,
            total_paused_seconds,
            paused_at,
            session_status,
            missed,
            missed_date,
            timer_end_at,
            timer_remaining_seconds,
            timer_paused,
            notification_sent
        } = req.body;

        const normalizedExercises = Array.isArray(exercises) ? exercises : [];

        let normalizedName = null;
        if (name != null) {
            const nameText = String(name).trim();
            normalizedName = nameText
                ? nameText.charAt(0).toUpperCase() + nameText.slice(1)
                : null;
        }

        const updateData = {
            name: normalizedName,
            day: day || null,
            category: category || null,
            goal: goal || null,
            difficulty: difficulty || null,
            scheduled_date: scheduled_date || null,
            duration: Number(duration) || 0,
            exercises: normalizedExercises,
            exercise_count:
                Number(exercise_count) || normalizedExercises.length,
            completed: Boolean(completed),
            completed_date: completed_date || null,
            start_time: start_time || null,
            duration_seconds: Number(duration_seconds) || 0,
            actual_duration_seconds: Number(actual_duration_seconds) || 0,
            actual_duration_minutes: Number(actual_duration_minutes) || 0,
            total_paused_seconds: Number(total_paused_seconds) || 0,
            paused_at: paused_at || null,
            session_status: session_status || "scheduled",
            missed: Boolean(missed),
            missed_date: missed_date || null,
            timer_end_at: timer_end_at || null,
            timer_remaining_seconds: Number(timer_remaining_seconds) || 0,
            timer_paused: Boolean(timer_paused),
            notification_sent: Boolean(notification_sent)
        };

        const { data, error } = await supabaseAdmin
            .from("workouts")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select()
            .single();

        if (error) {
            console.error("UPDATE WORKOUT ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Workout not found."
            });
        }

        return res.json(data);
    } catch (error) {
        console.error("PUT WORKOUT ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to update workout"
        });
    }
});

// ======================================================
// DELETE WORKOUT
// ======================================================

app.delete("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from("workouts")
            .delete()
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select()
            .single();

        if (error) {
            console.error("DELETE WORKOUT ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Workout not found."
            });
        }

        return res.json(data);
    } catch (error) {
        console.error("DELETE WORKOUT ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to delete workout"
        });
    }
});

// ======================================================
// PUSH
// ======================================================

app.get("/api/push/public-key", requireAuth, (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(500).json({
            success: false,
            error: "VAPID public key is not configured."
        });
    }

    return res.json({
        publicKey: process.env.VAPID_PUBLIC_KEY
    });
});

app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: "Push endpoint is required."
            });
        }

        const { error } = await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("user_id", req.user.id)
            .eq("endpoint", endpoint);

        if (error) {
            console.error("PUSH UNSUBSCRIBE ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("PUSH UNSUBSCRIBE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to remove push subscription."
        });
    }
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({
                success: false,
                error: "Invalid push subscription."
            });
        }

        const { data, error } = await supabaseAdmin
            .from("push_subscriptions")
            .upsert(
                {
                    user_id: req.user.id,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "user_id,endpoint" }
            )
            .select()
            .single();

        if (error) {
            console.error("PUSH SUBSCRIBE ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.json({
            success: true,
            subscription: data
        });
    } catch (error) {
        console.error("PUSH SUBSCRIBE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to save push subscription."
        });
    }
});

async function sendPushToUser(userId, payload) {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
        console.error("VAPID keys are missing.");
        return;
    }

    const { data: subscriptions, error } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

    if (error) {
        console.error("FAILED TO LOAD PUSH SUBSCRIPTIONS:", error);
        return;
    }

    for (const subscription of subscriptions || []) {
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
            }
        };

        try {
            await webpush.sendNotification(
                pushSubscription,
                JSON.stringify(payload)
            );
        } catch (error) {
            console.error(
                "PUSH SEND FAILED:",
                error.statusCode,
                error.body || error.message
            );

            if (error.statusCode === 404 || error.statusCode === 410) {
                await supabaseAdmin
                    .from("push_subscriptions")
                    .delete()
                    .eq("endpoint", subscription.endpoint);
            }
        }
    }
}

// ======================================================
// TIMER
// ======================================================

app.post("/api/workouts/:id/timer/start", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const remainingSeconds = Math.max(
            0,
            Number(req.body.remaining_seconds) || 0
        );
        const timerEnd = new Date(Date.now() + remainingSeconds * 1000);

        const { data, error } = await supabaseAdmin
            .from("workouts")
            .update({
                timer_end_at: timerEnd.toISOString(),
                timer_remaining_seconds: remainingSeconds,
                timer_paused: false,
                notification_sent: false,
                session_status: "in_progress"
            })
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select()
            .single();

        if (error) {
            console.error("TIMER START ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Workout not found."
            });
        }

        return res.json({ success: true, workout: data });
    } catch (error) {
        console.error("TIMER START ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to start workout timer."
        });
    }
});

app.post("/api/workouts/:id/timer/pause", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const remainingSeconds = Math.max(
            0,
            Number(req.body.remaining_seconds) || 0
        );

        const { data, error } = await supabaseAdmin
            .from("workouts")
            .update({
                timer_remaining_seconds: remainingSeconds,
                timer_paused: true,
                timer_end_at: null,
                notification_sent: false,
                session_status: "paused"
            })
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select()
            .single();

        if (error) {
            console.error("TIMER PAUSE ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Workout not found."
            });
        }

        return res.json({ success: true, workout: data });
    } catch (error) {
        console.error("TIMER PAUSE ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to pause workout timer."
        });
    }
});

app.post("/api/workouts/:id/timer/resume", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const remainingSeconds = Math.max(
            0,
            Number(req.body.remaining_seconds) || 0
        );
        const timerEnd = new Date(Date.now() + remainingSeconds * 1000);

        const { data, error } = await supabaseAdmin
            .from("workouts")
            .update({
                timer_end_at: timerEnd.toISOString(),
                timer_remaining_seconds: remainingSeconds,
                timer_paused: false,
                notification_sent: false,
                session_status: "in_progress"
            })
            .eq("id", id)
            .eq("user_id", req.user.id)
            .select()
            .single();

        if (error) {
            console.error("TIMER RESUME ERROR:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Workout not found."
            });
        }

        return res.json({ success: true, workout: data });
    } catch (error) {
        console.error("TIMER RESUME ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to resume workout timer."
        });
    }
});

async function processWorkoutTimerNotifications() {
    try {
        const now = new Date().toISOString();

        const { data: workoutsToNotify, error } = await supabaseAdmin
            .from("workouts")
            .select(
                "id,user_id,name,timer_end_at,timer_remaining_seconds,timer_paused,notification_sent,completed,session_status"
            )
            .eq("notification_sent", false)
            .eq("timer_paused", false)
            .eq("completed", false)
            .not("timer_end_at", "is", null)
            .lte("timer_end_at", now);

        if (error) {
            console.error("TIMER NOTIFICATION QUERY ERROR:", error);
            return;
        }

        for (const workout of workoutsToNotify || []) {
            await sendPushToUser(workout.user_id, {
                title: "Workout Timer Finished",
                body: `${workout.name || "Your workout"} has reached its planned duration.`,
                icon: "/icons/icon-192.png",
                badge: "/icons/icon-192.png",
                url: `/workout.html?id=${workout.id}`,
                workoutId: workout.id
            });

            const { error: updateError } = await supabaseAdmin
                .from("workouts")
                .update({
                    notification_sent: true,
                    timer_remaining_seconds: 0,
                    timer_end_at: null
                })
                .eq("id", workout.id);

            if (updateError) {
                console.error(
                    "FAILED TO MARK NOTIFICATION SENT:",
                    updateError
                );
            }
        }
    } catch (error) {
        console.error("WORKOUT TIMER PROCESSOR ERROR:", error);
    }
}

setInterval(processWorkoutTimerNotifications, 5000);

// ======================================================
// 404 + ERRORS
// ======================================================

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        error: `Cannot ${req.method} ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {
    console.error("UNHANDLED SERVER ERROR:", err);
    return res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

// ======================================================
// START
// ======================================================

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});