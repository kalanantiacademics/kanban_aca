function doGet(e) {
  var action = e.parameter.action;

  if (!action) {
    // Default: Return the HTML file (for direct access or debugging)
    return HtmlService.createTemplateFromFile("index")
      .evaluate()
      .setTitle("Kalananti Kanban")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // API Router
  var result;
  try {
    if (action === "getKanbanData") {
      result = getKanbanData();
    } else if (action === "checkLogin") {
      result = checkLogin(e.parameter.email);
    } else {
      result = { error: "Invalid Action" };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  // Return JSON
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  // Optional: Handle POST if you need to save data later
  // For now, we just mock it or leave it empty
  return ContentService.createTextOutput("POST request received");
}

function getKanbanData() {
  // Spreadsheet ID provided by user
  var ss = SpreadsheetApp.openById(
    "1-cThD_eS9HsbV_aoBiSWjUZFvtdz1sjiq8Zlmn6LqZs",
  );
  var sheet = ss.getSheetByName("❌ON-Prog[Kanban] Weekly Prioritization");

  if (!sheet) {
    return []; // Return empty if sheet not found
  }

  // Get all data - assuming headers are in row 1, data starts row 2
  // We grab a large range to be safe, or use getDataRange
  var data = sheet.getDataRange().getValues();
  var tasks = [];

  // Start from row 2 (index 1) to skip header
  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Column Mapping (0-indexed based on user description A-J)
    // A: Backlog Title (0)
    // B: Due Date (1)
    // C: Status (Backlog side) (2)
    // F: Processed Tasks Title (5)
    // G: PIC (6)
    // H: Status (Active side) (7)

    var backlogTitle = row[0];
    var backlogDate = row[1];
    var activeTitle = row[5];
    var pic = row[6]; // Person in Charge
    var activeStatus = row[7];

    var task = {};

    // Logic: Active Task takes precedence if present in the row?
    // Or are they separate tasks on the same row?
    // Usually in these sheets, a task moves from left to right.
    // If "Processed Tasks" is filled, it's likely the same task moved over or a new active task.
    // Let's assume if F is filled, that's the current state of the *row*.

    if (activeTitle && activeTitle !== "") {
      task.id = "row-" + (i + 1) + "-active";
      task.title = activeTitle;
      task.tag = pic || "Unassigned";
      task.priority = "medium"; // Default, as sheet doesn't have priority col
      task.date = "Ongoing";
      task.status = mapStatus(activeStatus);
      tasks.push(task);
    } else if (backlogTitle && backlogTitle !== "") {
      task.id = "row-" + (i + 1) + "-backlog";
      task.title = backlogTitle;
      task.tag = "Backlog";
      task.priority = "medium";

      // Format Date if it's a date object
      var dateStr = backlogDate;
      if (Object.prototype.toString.call(backlogDate) === "[object Date]") {
        dateStr = backlogDate.getMonth() + 1 + "/" + backlogDate.getDate();
      }
      task.date = dateStr || "No Date";
      task.status = "backlog";
      tasks.push(task);
    }
  }

  return tasks;
}

function mapStatus(statusText) {
  if (!statusText) return "todo"; // Default to To Do if active but no status

  var normalized = statusText.toString().toLowerCase().trim();

  // Map "Backlog, To Do, On Progress, Done (Review), Complete"
  if (normalized.includes("progress") || normalized.includes("doing"))
    return "progress";
  if (normalized.includes("review") || normalized.includes("done"))
    return "review";
  if (normalized.includes("complete") || normalized.includes("close"))
    return "complete";
  if (normalized.includes("todo") || normalized.includes("to-do"))
    return "todo";

  return "todo"; // Fallback
}

// --- Authentication ---

function checkLogin(email) {
  if (!email) return { valid: false, message: "Email is required" };

  const normalizedEmail = email.toString().toLowerCase().trim();

  // Authorized Users List (server-side security)
  const authorizedUsers = {
    "aldeina@kalananti.id": { name: "Aldeina", role: "Team Lead" },
    "laras.kalananti@gmail.com": {
      name: "Laras",
      role: "Academic Program Development",
    },
    "ahmadyazid.ruangguru@gmail.com": {
      name: "Yazid",
      role: "Academic Program Development",
    },
    "saras.kalananti@gmail.com": { name: "Saras", role: "Teacher Development" },
    "aisyahafra.kalananti@gmail.com": {
      name: "Aisyah",
      role: "Teacher Development",
    },
    "galuhretno@ruangguru.id": { name: "Galuh", role: "Student Experience" },
    // Dev backdoor for testing if needed
    "test@kalananti.id": { name: "Test User", role: "Member" },
  };

  if (authorizedUsers[normalizedEmail]) {
    return {
      valid: true,
      user: authorizedUsers[normalizedEmail],
    };
  } else {
    return {
      valid: false,
      message: "Email not authorized. Please contact administrator.",
    };
  }
}
