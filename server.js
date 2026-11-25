const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
console.log("Supabase URL loaded:", Boolean(process.env.SUPABASE_URL));
console.log("Supabase key loaded:", Boolean(process.env.SUPABASE_KEY));
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
    res.json({
        system: "SmartExam",
        status: "running",
        message: "SmartExam Monitoring Server is working!"
    });
});

app.post("/api/activity", async (req, res) => {
    try {
        const activity = req.body;

        // Find the currently active examination
        const { data: exam, error: examError } = await supabase
            .from("exams")
            .select("id")
            .eq("is_active", true)
            .maybeSingle();

        if (examError) throw examError;

        if (!exam) {
            return res.status(400).json({
                success: false,
                message: "No active examination."
            });
        }

        const { data, error } = await supabase
            .from("activity_logs")
            .insert({
                student_name: activity.studentName,
                student_id: activity.studentID,
                exam_id: exam.id,
                event_type: activity.event,
                event_timestamp: activity.timestamp
            })
            .select();

        if (error) throw error;

        console.log("Activity saved:", data);

        res.json({ success: true });

    } catch (error) {
        console.error("Activity error:", error.message);
        res.status(500).json({ success: false });
    }
});
// GET: Retrieve all examinations
app.get("/api/exams", async (req, res) => {
    const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Exam retrieval error:", error.message);
        return res.status(500).json({ success: false });
    }

    res.json({ success: true, exams: data });
});


// GET: Retrieve the currently active examination
app.get("/api/active-exam", async (req, res) => {
    const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
        console.error("Active exam error:", error.message);
        return res.status(500).json({ success: false });
    }

    res.json({ success: true, exam: data });
});


// POST: Create a new examination
app.post("/api/exams", async (req, res) => {
    try {
        const { title, form_url } = req.body;

        if (!title?.trim() || !form_url?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Exam title and Google Forms URL are required."
            });
        }

        const url = new URL(form_url);

        if (
            url.hostname !== "docs.google.com" ||
            !url.pathname.includes("/forms/")
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Google Forms URL."
            });
        }

        const { data, error } = await supabase
            .from("exams")
            .insert({
                title: title.trim(),
                form_url: form_url.trim(),
                is_active: false
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, exam: data });

    } catch (error) {
        console.error("Create exam error:", error.message);
        res.status(500).json({ success: false });
    }
});


// PUT: Activate an examination
app.put("/api/exams/:id/activate", async (req, res) => {
    try {
        const examId = req.params.id;

        // Deactivate the currently active examination
        const { error: deactivateError } = await supabase
            .from("exams")
            .update({ is_active: false })
            .eq("is_active", true);

        if (deactivateError) throw deactivateError;

        // Activate the selected examination
        const { data, error } = await supabase
            .from("exams")
            .update({ is_active: true })
            .eq("id", examId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, exam: data });

    } catch (error) {
        console.error("Activate exam error:", error.message);
        res.status(500).json({ success: false });
    }
});
app.post("/api/submissions", async (req, res) => {
    try {
        const { exam_id, student_name, student_id } = req.body;

        if (!exam_id || !student_name || !student_id) {
            return res.status(400).json({
                success: false,
                message: "Missing submission information."
            });
        }

        const { data, error } = await supabase
            .from("exam_submissions")
            .upsert(
                {
                    exam_id,
                    student_name,
                    student_id,
                    submitted_at: new Date().toISOString()
                },
                {
                    onConflict: "exam_id,student_id"
                }
            )
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            submission: data
        });

    } catch (error) {
        console.error("Submission error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to record submission."
        });
    }
});

// GET: Retrieve student activity records for the dashboard
app.get("/api/dashboard", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("activity_logs")
            .select("student_name, student_id, event_type, event_timestamp")
            .order("event_timestamp", { ascending: false });

        if (error) {
            console.error("Dashboard error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve student records."
            });
        }

        res.json({
            success: true,
            records: data
        });

    } catch (error) {
        console.error("Dashboard server error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
});

app.listen(PORT, () => {
    console.log(`SmartExam server running at http://localhost:${PORT}`);
});