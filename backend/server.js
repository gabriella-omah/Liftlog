const express = require("express");
const supabase = require("./supabase");

const app = express();

const PORT = 5000;

app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.send("LiftLog Backend Running 🚀");
});

// Get all workouts from Supabase
app.get("/api/workouts", async (req, res) => {
    const { data, error } = await supabase
        .from("workouts")
        .select("*");

    console.log("DATA:", data);
    console.log("ERROR:", error);

    res.json({ data, error });
});

app.post("/api/workouts", async (req, res) => {

    const { user_id, name, day, category, goal, difficulty } = req.body;

    const { data, error } = await supabase
        .from("workouts")
        .insert([
            {
                user_id,
                name,
                day,
                category,
                goal,
                difficulty,
                completed: false
            }
        ])
        .select();

    if (error) {
        return res.status(500).json(error);
    }

    res.status(201).json(data);

});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});