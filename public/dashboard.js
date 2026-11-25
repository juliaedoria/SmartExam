async function loadDashboard() {
    try {
        const response = await fetch("/api/dashboard");
        const result = await response.json();

        if (!result.success) throw new Error("Unable to load records.");

        const students = {};

        result.records.forEach(record => {
            const id = record.student_id;
            if (!id) return;

            if (!students[id]) {
                students[id] = {
                    name: record.student_name || "Unknown Student",
                    id,
                    departures: 0,
                    lastActivity: record.event_timestamp
                };
            }

            if (record.event_type === "LEFT_EXAM_TAB") {
                students[id].departures++;
            }

            if (new Date(record.event_timestamp) >
                new Date(students[id].lastActivity)) {
                students[id].lastActivity = record.event_timestamp;
            }
        });

        const studentList = Object.values(students);

        document.getElementById("totalStudents").textContent =
            studentList.length;

        document.getElementById("studentsWhoLeft").textContent =
            studentList.filter(s => s.departures > 0).length;

        document.getElementById("totalDepartures").textContent =
            studentList.reduce((sum, s) => sum + s.departures, 0);

        document.getElementById("studentTable").innerHTML =
            studentList.length
                ? studentList.map(s => `
                    <tr>
                        <td>${escapeHTML(s.name)}</td>
                        <td>${escapeHTML(s.id)}</td>
                        <td>${s.departures}</td>
                        <td>${new Date(s.lastActivity).toLocaleString()}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="4">No student records found.</td></tr>`;

    } catch (error) {
        console.error("Dashboard error:", error);
        document.getElementById("studentTable").innerHTML =
            `<tr><td colspan="4">Unable to load student records.</td></tr>`;
    }
}

async function loadExams() {
    const examList = document.getElementById("examList");

    try {
        const response = await fetch("/api/exams");
        const result = await response.json();

        if (!result.success) throw new Error("Unable to load examinations.");

        if (result.exams.length === 0) {
            examList.textContent = "No examinations created yet.";
            return;
        }

        examList.innerHTML = result.exams.map(exam => `
            <div class="exam-item">
                <div>
                    <h3>${escapeHTML(exam.title)}</h3>
                    <p>${exam.is_active ? "● Active Examination" : "Inactive"}</p>
                    ${exam.is_active ? "" : `
                        <button onclick="activateExam('${exam.id}')">
                            Activate Exam
                        </button>
                    `}
                </div>
            </div>
        `).join("");

    } catch (error) {
        console.error("Exam loading error:", error);
        examList.textContent = "Unable to load examinations.";
    }
}

async function addExam() {
    const title = document.getElementById("examTitle").value.trim();
    const form_url = document.getElementById("examFormUrl").value.trim();
    const message = document.getElementById("examMessage");

    if (!title || !form_url) {
        message.textContent = "Please enter the exam title and Google Forms URL.";
        return;
    }

    try {
        const response = await fetch("/api/exams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, form_url })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Unable to create examination.");
        }

        message.textContent = "Examination added successfully!";
        document.getElementById("examTitle").value = "";
        document.getElementById("examFormUrl").value = "";

        await loadExams();

    } catch (error) {
        message.textContent = error.message;
    }
}

async function activateExam(id) {
    try {
        const response = await fetch(`/api/exams/${id}/activate`, {
            method: "PUT"
        });

        const result = await response.json();

        if (!result.success) throw new Error("Unable to activate examination.");

        alert("Examination activated successfully!");
        await loadExams();

    } catch (error) {
        alert(error.message);
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

document.getElementById("addExamButton")
    .addEventListener("click", addExam);

loadDashboard();
loadExams();