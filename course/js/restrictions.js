function createSlotButton(label, isActive, onClick, isDisabled = false, instructor = null) {
    let button = document.createElement("button");
    let slotNumber = label.short.replace("Slot ", "");
    let instructorText = instructor ? `<span class="slotInstructor">${instructor}</span>` : "";
    button.innerHTML = `<span class="slotNumber">${slotNumber}</span>${instructorText}`;
    button.title = label.full;
    button.setAttribute("aria-label", label.full);

    if (isDisabled) {
        button.classList.add("none");
        return button;
    }

    if (isActive) button.classList.add("active");
    button.addEventListener("click", onClick);
    return button;
}

async function renderRestrictionsPage() {
    await window.appDataReady;

    let restrictionsContainer = document.getElementById("restrictionsContainer");
    let courses = JSON.parse(localStorage.courses || "{}");
    let spareRestrictions = JSON.parse(localStorage.spareRestrictions || JSON.stringify(Array(9).fill(true)));
    let slotLabels = window.slotLabels ?? Array.from({ length: 9 }, (_, i) => ({
        short: `Slot ${i + 1}`,
        full: `Slot ${i + 1}`
    }));

    restrictionsContainer.innerHTML = "";

    if (Object.keys(courses).length === 0) {
        restrictionsContainer.innerHTML = "<p>No courses selected yet.</p>";
        return;
    }

    for (let key in courses) {
        let restrictionsButtons = document.createElement("div");
        restrictionsButtons.classList.add("restrictionsButtons");

        for (let i = 0; i < 9; i++) {
            if (courses[key].slots[i]) {
                let instructor = courses[key].instructors?.[i] ?? null;
                let button = createSlotButton(slotLabels[i], courses[key].restrictions[i], () => {
                    let temp = JSON.parse(localStorage.courses);
                    temp[key].restrictions[i] = !temp[key].restrictions[i];
                    localStorage.courses = JSON.stringify(temp);
                    button.classList.toggle("active", temp[key].restrictions[i]);
                }, false, instructor);
                restrictionsButtons.appendChild(button);
            }
            else {
                restrictionsButtons.appendChild(createSlotButton(slotLabels[i], false, () => {}, true));
            }
        }

        let restrictionsCourse = document.createElement("div");
        restrictionsCourse.classList.add("restrictionsCourse");
        restrictionsCourse.innerHTML = `<span>${key}</span>`;
        restrictionsCourse.appendChild(restrictionsButtons);
        restrictionsContainer.appendChild(restrictionsCourse);
    }

    let spareButtons = document.createElement("div");
    spareButtons.classList.add("restrictionsButtons");

    for (let i = 0; i < 9; i++) {
        let button = createSlotButton(slotLabels[i], spareRestrictions[i], () => {
            let temp = JSON.parse(localStorage.spareRestrictions);
            temp[i] = !temp[i];
            localStorage.spareRestrictions = JSON.stringify(temp);
            button.classList.toggle("active", temp[i]);
        });
        spareButtons.appendChild(button);
    }

    let spareCourse = document.createElement("div");
    spareCourse.classList.add("restrictionsCourse");
    spareCourse.innerHTML = "<span>---Spare---</span>";
    spareCourse.appendChild(spareButtons);
    restrictionsContainer.appendChild(spareCourse);
}

renderRestrictionsPage();
