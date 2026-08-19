const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve CSS, JS, images, HTML, etc.
app.use(express.static(__dirname));

// Home = landing page (first visit)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Other pages
app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/workouts", (req, res) => {
    res.sendFile(path.join(__dirname, "workouts.html"));
});

app.get("/workout", (req, res) => {
    res.sendFile(path.join(__dirname, "workout.html"));
});

app.get("/library", (req, res) => {
    res.sendFile(path.join(__dirname, "library.html"));
});

app.get("/progress", (req, res) => {
    res.sendFile(path.join(__dirname, "progress.html"));
});

app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, "settings.html"));
});

app.listen(PORT, () => {
});