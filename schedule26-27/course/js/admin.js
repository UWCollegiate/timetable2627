const adminFiles = [
    { key: "grade9", label: "Grade 9", path: (version) => `data/${version}/grade9.csv`, suggestedName: "grade9.csv" },
    { key: "grade10", label: "Grade 10", path: (version) => `data/${version}/grade10.csv`, suggestedName: "grade10.csv" },
    { key: "grade11", label: "Grade 11", path: (version) => `data/${version}/grade11.csv`, suggestedName: "grade11.csv" },
    { key: "grade12", label: "Grade 12", path: (version) => `data/${version}/grade12.csv`, suggestedName: "grade12.csv" },
    { key: "dualcredit", label: "Dual Credit", path: (version) => `data/${version}/dualcredit.csv`, suggestedName: "dualcredit.csv" },
    { key: "core9", label: "Core 9", path: () => "data/core9.csv", suggestedName: "core9.csv" },
    { key: "core10", label: "Core 10", path: () => "data/core10.csv", suggestedName: "core10.csv" }
];

let adminState = {
    version: "",
    selectedKey: "grade9",
    rows: []
};

function setAdminStatus(message, isError = false) {
    let status = document.getElementById("adminStatus");
    status.textContent = message;
    status.classList.toggle("error", isError);
}

function getSelectedAdminFile() {
    return adminFiles.find((file) => file.key === adminState.selectedKey) ?? adminFiles[0];
}

function parseCsvText(text) {
    let rows = text.trim().split("\n");
    rows.shift();

    return rows.map((row) => {
        let values = row.split(",");
        let name = values.shift() ?? "";
        let slots = values.slice(0, 9).map((value) => {
            let trimmed = value.trim();
            return trimmed === "" ? "N" : trimmed;
        });

        while (slots.length < 9) slots.push("N");
        return { name, slots };
    });
}

function serializeCsv(rows) {
    let lines = ["NAME,1,2,3,4,5,6,7,8,9"];
    rows.forEach((row) => {
        let name = (row.name ?? "").trim();
        if (!name) return;

        let slotValues = row.slots.map((value) => {
            let trimmed = (value ?? "").trim();
            return trimmed === "" ? "N" : trimmed;
        });

        lines.push([name, ...slotValues].join(","));
    });

    return `${lines.join("\n")}\n`;
}

function syncRowsFromInputs() {
    let bodyRows = Array.from(document.querySelectorAll("#adminTable tbody tr"));
    adminState.rows = bodyRows.map((row) => ({
        name: row.querySelector(".adminCourseName").value,
        slots: Array.from(row.querySelectorAll(".adminSlotValue")).map((input) => input.value.trim() || "N")
    }));
}

function renderAdminTable() {
    let thead = document.querySelector("#adminTable thead");
    let tbody = document.querySelector("#adminTable tbody");
    let slotLabels = window.slotLabels ?? Array.from({ length: 9 }, (_, i) => ({
        short: `Slot ${i + 1}`,
        full: `Slot ${i + 1}`
    }));

    thead.innerHTML = `
        <tr>
            <th>Course</th>
            ${slotLabels.map((label) => `<th title="${label.full}">${label.short.replace("Slot ", "")}</th>`).join("")}
            <th>Remove</th>
        </tr>
    `;

    tbody.innerHTML = "";

    adminState.rows.forEach((row, rowIndex) => {
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <input class="adminCourseName" type="text" value="${row.name.replace(/"/g, "&quot;")}" placeholder="Course name">
            </td>
            ${row.slots.map((value, slotIndex) => `
                <td>
                    <input
                        class="adminSlotValue"
                        type="text"
                        value="${value.replace(/"/g, "&quot;")}"
                        placeholder="N"
                        title="${slotLabels[slotIndex].full}"
                    >
                </td>
            `).join("")}
            <td>
                <button class="adminRemoveRow" data-row-index="${rowIndex}">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (adminState.rows.length === 0) {
        let tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="11" class="adminEmpty">No courses yet. Click "Add Course".</td>`;
        tbody.appendChild(tr);
    }

    document.querySelectorAll(".adminRemoveRow").forEach((button) => {
        button.addEventListener("click", () => {
            syncRowsFromInputs();
            adminState.rows.splice(Number(button.dataset.rowIndex), 1);
            renderAdminTable();
        });
    });
}

async function loadAdminFile() {
    let selectedFile = getSelectedAdminFile();
    let path = selectedFile.path(adminState.version);
    let response = await fetch(uncachedPath(path), { cache: "no-store" });

    if (!response.ok) {
        setAdminStatus(`Could not load ${selectedFile.label}.`, true);
        return;
    }

    adminState.rows = parseCsvText(await response.text());
    renderAdminTable();
    setAdminStatus(`Loaded ${selectedFile.label}.`);
}

async function saveAdminFile() {
    syncRowsFromInputs();
    let selectedFile = getSelectedAdminFile();
    let csv = serializeCsv(adminState.rows);

    try {
        if (window.showSaveFilePicker) {
            let handle = await window.showSaveFilePicker({
                suggestedName: selectedFile.suggestedName,
                types: [{
                    description: "CSV files",
                    accept: { "text/csv": [".csv"] }
                }]
            });
            let writable = await handle.createWritable();
            await writable.write(csv);
            await writable.close();
            setAdminStatus(`Saved ${selectedFile.suggestedName}.`);
            return;
        }
    }
    catch (error) {
        if (error.name !== "AbortError") {
            setAdminStatus(`Save failed: ${error.message}`, true);
        }
        return;
    }

    let blob = new Blob([csv], { type: "text/csv" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url;
    link.download = selectedFile.suggestedName;
    link.click();
    URL.revokeObjectURL(url);
    setAdminStatus(`Downloaded ${selectedFile.suggestedName}.`);
}

async function copyAdminCsv() {
    syncRowsFromInputs();
    let csv = serializeCsv(adminState.rows);

    try {
        await navigator.clipboard.writeText(csv);
        setAdminStatus("CSV copied to clipboard.");
    }
    catch {
        setAdminStatus("Could not copy to clipboard.", true);
    }
}

async function initAdminPage() {
    await window.appDataReady;

    adminState.version = localStorage.version;

    let select = document.getElementById("adminFileSelect");
    adminFiles.forEach((file) => {
        let option = document.createElement("option");
        option.value = file.key;
        option.textContent = file.label;
        select.appendChild(option);
    });

    select.value = adminState.selectedKey;
    select.addEventListener("change", () => {
        syncRowsFromInputs();
        adminState.selectedKey = select.value;
        loadAdminFile();
    });

    document.getElementById("adminLoad").addEventListener("click", () => {
        syncRowsFromInputs();
        loadAdminFile();
    });

    document.getElementById("adminAddRow").addEventListener("click", () => {
        syncRowsFromInputs();
        adminState.rows.push({
            name: "",
            slots: Array(9).fill("N")
        });
        renderAdminTable();
        setAdminStatus("Added a blank course row.");
    });

    document.getElementById("adminSort").addEventListener("click", () => {
        syncRowsFromInputs();
        adminState.rows.sort((a, b) => a.name.localeCompare(b.name));
        renderAdminTable();
        setAdminStatus("Sorted courses A-Z.");
    });

    document.getElementById("adminSave").addEventListener("click", saveAdminFile);
    document.getElementById("adminCopy").addEventListener("click", copyAdminCsv);

    await loadAdminFile();
}

initAdminPage();
