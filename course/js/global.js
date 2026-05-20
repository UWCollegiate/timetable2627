const storageDefaults = {
    courses: {},
    spareRestrictions: Array(9).fill(true),
    replacing: null,
    versionOverride: false
};

const slotLabels = [
    { short: "Slot 1", full: "Slot 1 (MWF 8:30-9:40)" },
    { short: "Slot 2", full: "Slot 2 (MWF 9:50-11:00)" },
    { short: "Slot 3", full: "Slot 3 (MWF 11:40-12:50)" },
    { short: "Slot 4", full: "Slot 4 (MWF 1:00-2:10)" },
    { short: "Slot 5", full: "Slot 5 (MWF 2:20-3:30)" },
    { short: "Slot 6", full: "Slot 6 (T/Th 8:30-10:15)" },
    { short: "Slot 7", full: "Slot 7 (T/Th 10:30-12:15)" },
    { short: "Slot 8", full: "Slot 8 (T/Th 1:00-2:45)" },
    { short: "Slot 9", full: "Slot 9 (T/Th 2:55-4:40)" }
];

const legacyCourseNameMap = {
    "Academic Writing 42U": "Academic Writing 42U (PA) 10:00-11:15",
    "Business 42U": "Business 42U 16:00-17:15",
    "Calculus 42U": "Calculus 42U 11:30-12:20",
    "Chemistry 42U": "Chemistry 42U (RP) 8:30-9:20",
    "Choral Ensemble 42U": "Choral Ensemble 42U (MSt) 16:00-18:00",
    "Conflict Res. 42U": "Conflict Res. 42U (MMac) 13:30-14:20",
    "Economics 42U": "Economics 42U 9:30-10:20",
    "English 42U": "English 42U (BT) 10:30-11:20",
    "Ensemble practicum-Instrumental 42U": "Ensemble practicum-Instrumental 42U (MSt) 17:00-19:00",
    "Geography 42U": "Geography 42U (JJ) 8:30-9:20",
    "Global Citizenship 42U": "Global Citizenship 42U 9:30-10:20",
    "Intro Arabic 42U": "Intro Arabic 42U (TBD) 16:00-17:15",
    "Intro Chinese 42U": "Intro Chinese 42U (TBD) 14:30-15:45",
    "Intro Japanese 42U": "Intro Japanese 42U (TBD) 9:30-10:20",
    "Intro Korean 42U": "Intro Korean 42U (TBD) 16:00-17:15",
    "Intro to Uni 42U": "Intro to Uni 42U (PA) 14:30-15:45",
    "Kinesiology 42U": "Kinesiology 42U (TBD) 1:30-2:20",
    "Music Appreciation 42U": "Music Appreciation 42U (MSt) 16:00-17:30",
    "Philosophy 42U": "Philosophy 42U (KZ) 13:30-14:20",
    "Physics (Calculus) 42U": "Physics (Calculus) 42U (TBD) 13:30-14:20",
    "Physics (Med - based) 42U": "Physics (Med - based) 42U (TBD) 9:30-10:20",
    "Physics 42U": "Physics 42U (TBD) 9:30-10:20",
    "Physics 42U (Algebra)": "Physics 42U (Algebra) (TBD) 9:30-10:20",
    "Programming 42U": "Programming 42U (EH) 13:00-14:15",
    "Religion 42U": "Religion 42U (KZ) 11:30-12:20"
};

async function ensureFreshPage() {
    let url = new URL(window.location.href);
    if (url.searchParams.get("reloaded") === "1") return;

    let response = await fetch(uncachedPath(url.pathname), {
        cache: "no-store",
        method: "HEAD"
    });
    let lastModified = response.headers.get("last-modified");

    if (lastModified && document.lastModified && lastModified !== document.lastModified) {
        url.searchParams.set("reloaded", "1");
        url.searchParams.set("t", Date.now().toString());
        window.location.replace(url.toString());
        return;
    }
}

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});

function prepareForNavigation() {
    sessionStorage.setItem("preserveAppState", "true");
}

function shouldPreserveAppState() {
    let preserveAppState = sessionStorage.getItem("preserveAppState") === "true";
    sessionStorage.removeItem("preserveAppState");
    return preserveAppState;
}

function uncachedPath(path) {
    let joiner = path.includes("?") ? "&" : "?";
    return `${path}${joiner}t=${Date.now()}`;
}

async function loadCourseDefinitionCSV(path) {
    let response = await fetch(uncachedPath(path), { cache: "no-store" });
    if (!response.ok) return {};

    let text = await response.text();
    let rows = text.trim().split("\n");
    rows.shift();

    let items = {};
    rows.forEach((row) => {
        let values = row.split(",");
        let name = values.shift();
        let slots = [];
        let instructors = [];

        values.forEach((value) => {
            let trimmed = value.trim();
            let slotAvailable = trimmed !== "" && trimmed !== "N";

            slots.push(slotAvailable);
            instructors.push(slotAvailable && trimmed !== "Y" ? trimmed : null);
        });

        items[name] = { slots, instructors };
    });

    return items;
}

async function refreshStoredCoursesFromCatalog(version) {
    let storedCourses = getStoredJSON("courses", {});
    let selectedCourseNames = Object.keys(storedCourses);

    if (selectedCourseNames.length === 0) return;

    let catalogPaths = ["grade9", "grade10", "grade11", "grade12", "dualcredit"]
        .map((name) => `data/${version}/${name}.csv`);
    let catalogs = await Promise.all(catalogPaths.map(loadCourseDefinitionCSV));
    let combinedCatalog = Object.assign({}, ...catalogs);
    let updated = false;

    for (let courseName of selectedCourseNames) {
        let mappedName = legacyCourseNameMap[courseName];
        if (!mappedName || storedCourses[mappedName] || !combinedCatalog[mappedName]) continue;

        storedCourses[mappedName] = storedCourses[courseName];
        delete storedCourses[courseName];
        updated = true;
    }

    selectedCourseNames = Object.keys(storedCourses);

    for (let courseName of selectedCourseNames) {
        let currentDefinition = combinedCatalog[courseName];
        if (!currentDefinition) continue;

        let stored = storedCourses[courseName];
        let nextSlots = currentDefinition.slots;
        let nextInstructors = currentDefinition.instructors;

        if (JSON.stringify(stored.slots) !== JSON.stringify(nextSlots)) {
            storedCourses[courseName].slots = nextSlots;
            updated = true;
        }

        if (JSON.stringify(stored.instructors ?? Array(9).fill(null)) !== JSON.stringify(nextInstructors)) {
            storedCourses[courseName].instructors = nextInstructors;
            updated = true;
        }

        if (!Array.isArray(storedCourses[courseName].restrictions)) {
            storedCourses[courseName].restrictions = Array(9).fill(true);
            updated = true;
        }
    }

    if (updated) {
        localStorage.courses = JSON.stringify(storedCourses);
    }
}

async function loadVer() {
    let res = await fetch(uncachedPath("data/version.txt"), { cache: "no-store" });
    return (await res.text()).trim();
}

function getStoredJSON(key, fallback) {
    try {
        let value = localStorage.getItem(key);
        if (value === null) throw new Error("missing storage key");
        return JSON.parse(value);
    }
    catch {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
    }
}

function ensureStorageDefaults() {
    for (let [key, value] of Object.entries(storageDefaults)) {
        getStoredJSON(key, value);
    }
}

async function initData() {
    await ensureFreshPage();
    ensureStorageDefaults();

    let version = await loadVer();
    let versionOverride = getStoredJSON("versionOverride", false);

    if (localStorage.version !== version && !versionOverride) {
        console.log("replacing localStorage with default");
        localStorage.clear();
        localStorage.version = version;
        localStorage.courses = JSON.stringify(storageDefaults.courses);
        localStorage.spareRestrictions = JSON.stringify(storageDefaults.spareRestrictions);
        localStorage.replacing = JSON.stringify(storageDefaults.replacing);
        localStorage.versionOverride = JSON.stringify(storageDefaults.versionOverride);
        location.href = "index.html";
        return;
    }

    shouldPreserveAppState();
    await refreshStoredCoursesFromCatalog(version);

    document.dispatchEvent(new CustomEvent("app-data-ready", {
        detail: { version: localStorage.version }
    }));
}

window.appDataReady = initData();
window.prepareForNavigation = prepareForNavigation;
window.uncachedPath = uncachedPath;
window.slotLabels = slotLabels;

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "`") {
        if (getStoredJSON("versionOverride", false)) {
            localStorage.versionOverride = JSON.stringify(false);
            alert("version override turned off");
            initData();
        }
        else {
            localStorage.versionOverride = JSON.stringify(true);
            localStorage.version = prompt("input the new version:");
            alert(`version override turned on, testing version ${localStorage.version}`);
        }
    }
});
