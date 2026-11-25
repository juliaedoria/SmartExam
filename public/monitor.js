let currentStudent = {
    name: "",
    studentID: ""
};

let currentExam = null;
let examStarted = false;


// Load the instructor's active examination
async function loadActiveExam() {
    const startButton = document.getElementById("startButton");
    startButton.disabled = true;

    try {
        const response = await fetch("/api/active-exam");
        const result = await response.json();

        if (!result.success || !result.exam) {
            document.getElementById("activityStatus").textContent =
                "No active examination is available.";

            return;
        }

        currentExam = result.exam;

        const formURL = new URL(currentExam.form_url);

        if (
            formURL.hostname !== "docs.google.com" ||
            !formURL.pathname.includes("/forms/")
        ) {
            throw new Error("Invalid Google Forms URL.");
        }

        formURL.searchParams.set("embedded", "true");

        document.getElementById("examFrame").src = formURL.toString();

        document.getElementById("activityStatus").textContent =
            "Selected examination: " + currentExam.title;

        startButton.disabled = false;

    } catch (error) {
        console.error("Exam loading error:", error);

        document.getElementById("activityStatus").textContent =
            "Unable to load the examination. Please contact your instructor.";

    }
}


// Send browser activity to the server
function logActivity(eventName) {
    if (!examStarted || !currentStudent.studentID) return;

    fetch("/api/activity", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            event: eventName,
            timestamp: new Date().toISOString(),
            studentName: currentStudent.name,
            studentID: currentStudent.studentID
        })
    }).catch(error => {
        console.error("Unable to send activity:", error);
    });
}


// Detect tab switching
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        logActivity("LEFT_EXAM_TAB");
    } else {
        logActivity("RETURNED_TO_EXAM_TAB");
    }
});


// Detect window focus changes
window.addEventListener("blur", () => {
    logActivity("WINDOW_LOST_FOCUS");
});

window.addEventListener("focus", () => {
    logActivity("WINDOW_REGAINED_FOCUS");
});


// Load the active exam when the page opens
loadActiveExam();