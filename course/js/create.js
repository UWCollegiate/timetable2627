import init, { js_solve_all } from './dlx.js';

const slotPlacements = [
    [[84, 1100], [334, 1100], [584, 1100]],
    [[84, 900], [334, 900], [584, 900]],
    [[84, 650], [334, 650], [584, 650]],
    [[84, 450], [334, 450], [584, 450]],
    [[84, 200], [334, 200], [584, 200]],
    [[209, 1050], [459, 1050]],
    [[209, 800], [459, 800]],
    [[209, 400], [459, 400]],
    [[209, 150], [459, 150]]
];

const pdfSlotLayouts = [
    { width: 108, height: 115, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 115, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 115, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 115, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 115, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 210, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 210, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 295, fontSize: 11, lineGap: 3, sidePadding: 5 },
    { width: 108, height: 80, fontSize: 10, lineGap: 2, sidePadding: 5 }
];

const scheduleColumns = [
    {
        day: "Monday",
        lunch: "12:20-1:20",
        blocks: [
            { slot: 0, time: "8:30-9:40", type: "mwf" },
            { slot: 1, time: "9:50-11:00", type: "mwf" },
            { slot: 2, time: "11:10-12:20", type: "mwf" },
            { slot: 3, time: "1:20-2:30", type: "mwf" },
            { slot: 4, time: "2:40-3:50", type: "mwf" }
        ]
    },
    {
        day: "Tuesday",
        lunch: "12:10-1:10",
        blocks: [
            { slot: 5, time: "8:30-10:15", type: "tthTall" },
            { slot: 6, time: "10:25-12:10", type: "tthTall" },
            { slot: 7, time: "1:10-2:55", type: "tthTall" },
            { slot: 8, time: "3:05-4:00", type: "tthShort" }
        ]
    },
    {
        day: "Wednesday",
        lunch: "12:20-1:20",
        blocks: [
            { slot: 0, time: "8:30-9:40", type: "mwf" },
            { slot: 1, time: "9:50-11:00", type: "mwf" },
            { slot: 2, time: "11:10-12:20", type: "mwf" },
            { slot: 3, time: "1:20-2:30", type: "mwf" },
            { slot: 4, time: "2:40-3:50", type: "mwf" }
        ]
    },
    {
        day: "Thursday",
        lunch: "12:10-1:10",
        blocks: [
            { slot: 5, time: "8:30-10:15", type: "tthTall" },
            { slot: 6, time: "10:25-12:10", type: "tthTall" },
            { slot: 7, time: "1:10-2:55", type: "tthTall" },
            { slot: 8, time: "3:05-4:00", type: "tthShort" }
        ]
    },
    {
        day: "Friday",
        lunch: "12:20-1:20",
        blocks: [
            { slot: 0, time: "8:30-9:40", type: "mwf" },
            { slot: 1, time: "9:50-11:00", type: "mwf" },
            { slot: 2, time: "11:10-12:20", type: "mwf" },
            { slot: 3, time: "1:20-2:30", type: "mwf" },
            { slot: 4, time: "2:40-3:50", type: "mwf" }
        ]
    }
];

function getCourseLabel(courses, courseName, slot) {
    if (courseName === "---Spare---") return "";
    if (/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(courseName)) return courseName;

    let instructor = courses[courseName]?.instructors?.[slot] ?? null;
    return instructor ? `${courseName} (${instructor})` : courseName;
}

function normalizePdfLabel(text) {
    return text.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

function buildWrapTokens(text) {
    let words = text.split(/\s+/).filter(Boolean);
    let tokens = [];

    for (let i = 0; i < words.length; i++) {
        let word = words[i];

        if (word.length === 1 && words[i + 1]) {
            tokens.push(`${word} ${words[i + 1]}`);
            i++;
            continue;
        }

        tokens.push(word);
    }

    if (tokens.length >= 2 && tokens[tokens.length - 1].length === 1) {
        tokens.splice(tokens.length - 2, 2, `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`);
    }

    return tokens;
}

function wrapPdfText(text, font, fontSize, maxWidth) {
    let tokens = buildWrapTokens(normalizePdfLabel(text));
    let lines = [];
    let currentLine = "";

    for (let token of tokens) {
        let candidate = currentLine ? `${currentLine} ${token}` : token;
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !currentLine) {
            currentLine = candidate;
            continue;
        }

        lines.push(currentLine);
        currentLine = token;
    }

    if (currentLine) lines.push(currentLine);

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].length === 1 || /^\S$/.test(lines[i])) {
            lines[i - 1] = `${lines[i - 1]} ${lines[i]}`;
            lines.splice(i, 1);
            i--;
        }
    }

    return lines;
}

function fitPdfText(text, font, layout) {
    let fontSize = layout.fontSize;
    let maxWidth = layout.width - layout.sidePadding * 2;
    let maxHeight = layout.height;

    while (fontSize >= 7.5) {
        let lineGap = Math.max(2, layout.lineGap * (fontSize / layout.fontSize));
        let lineHeight = fontSize + lineGap;
        let lines = wrapPdfText(text, font, fontSize, maxWidth);
        let totalHeight = lines.length * lineHeight - lineGap;

        if (totalHeight <= maxHeight) {
            return { lines, fontSize, lineHeight };
        }

        fontSize -= 0.5;
    }

    let finalFontSize = 7.5;
    let finalLineGap = 2;
    return {
        lines: wrapPdfText(text, font, finalFontSize, maxWidth),
        fontSize: finalFontSize,
        lineHeight: finalFontSize + finalLineGap
    };
}

function drawCenteredWrappedText(page, text, origin, layout, font) {
    if (!text) return;

    let { lines, fontSize, lineHeight } = fitPdfText(text, font, layout);
    let startY = origin[1];

    lines.forEach((line, index) => {
        let lineWidth = font.widthOfTextAtSize(line, fontSize);
        let x = origin[0] + (layout.width - lineWidth) / 2;
        let y = startY - index * lineHeight;

        page.drawText(line, {
            x,
            y,
            size: fontSize,
            font,
            color: PDFLib.rgb(0, 0, 0)
        });
    });
}

async function run() {
    await init();

    let courses = JSON.parse(localStorage.courses);
    let courseNames = Object.keys(courses);
    let courseData = Object.values(courses);
    let courseSlots = courseData.map(i => i.slots);
    let spareRestrictions = JSON.parse(localStorage.spareRestrictions);

    // initialize matrix and names with spares
    let matrix = Array.from({ length: 9 }, (_, i) =>
        Array.from({ length: 18 }, (_, j) => i + 9 === j)
    );
    let names = Array(9).fill("---Spare---");
    let times = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    // this is weird but it won't loop over spares
    for (let i = 0; i < courseSlots.length; i++) {
        let selectedName = courseNames[i];
        let selectedSlots = courseSlots[i];
        selectedSlots.forEach((slotAllowed, slotNumber) => {
            if (slotAllowed) {
                names.push(selectedName);
                times.push(slotNumber);
                matrix.push(Array.from({ length: 18 }, (_, j) => j === i || j === slotNumber + 9))
            }
        });
    }

    let solutions = js_solve_all(matrix);
    solutions = solutions.filter(s => s.every(i => names[i] === "---Spare---" ? spareRestrictions[times[i]] : courses[names[i]].restrictions[times[i]]));
    return solutions.map(s => s.sort((a, b) => times[a] - times[b]).map(i => names[i]));
}

run().then(solutions => {
    let selectionContainer = document.getElementById("selectionContainer");
    let courses = JSON.parse(localStorage.courses);
    if (solutions.length === 0) {
        selectionContainer.innerHTML = "<b>No solutions found.</b>";
        return;
    }

    for (let i = 0; i < solutions.length; i++) {
        let sol = solutions[i];
        // it might give a solution with a length less than 9, make sure that all 9 slots are handled
        if (sol.length === 9) {
            let scheduleMarkup = scheduleColumns.map((column) => {
                let blocks = column.blocks.map((block, blockIndex) => {
                    let course = getCourseLabel(courses, sol[block.slot], block.slot);
                    let lunchAfter = column.day === "Tuesday" || column.day === "Thursday"
                        ? blockIndex === 1
                        : blockIndex === 2;

                    return `
                        <div class="scheduleBlock scheduleBlock--${block.type}">
                            <span class="scheduleTime">${block.time}</span>
                            <span class="scheduleSlot">Slot ${block.slot + 1}</span>
                            <span class="scheduleName">${course}</span>
                        </div>
                        ${lunchAfter ? `
                            <div class="scheduleLunchBlock">
                                <span class="scheduleTime">${column.lunch}</span>
                                <span class="scheduleLunchText">Lunch</span>
                            </div>
                        ` : ""}
                    `;
                }).join("");

                return `
                    <div class="scheduleDayColumn">
                        <div class="scheduleDayHeader">${column.day}</div>
                        <div class="scheduleColumnBody">
                            ${blocks}
                        </div>
                    </div>
                `;
            }).join("");

            selectionContainer.insertAdjacentHTML('beforeend', `
                <div class="selection">
                    <div class="scheduleBoard">
                        ${scheduleMarkup}
                    </div>
                </div>
            `);
        }
    }

    let selections = document.querySelectorAll(".selection");
    let currentSelected = 0;
    document.getElementById("selectionText").innerHTML = `Schedule 1 / ${solutions.length}`;

    function show(i) {
        selections.forEach((sel, j) => sel.classList.toggle("active", i === j));
    }

    document.getElementById("left").addEventListener('click', () => {
        // modulo is goofy
        currentSelected = (currentSelected - 1 + solutions.length) % solutions.length;
        document.getElementById("selectionText").innerHTML = `Schedule ${currentSelected + 1} / ${solutions.length}`;
        show(currentSelected);
    });

    document.getElementById("right").addEventListener('click', () => {
        currentSelected = (currentSelected + 1) % solutions.length;
        document.getElementById("selectionText").innerHTML = `Schedule ${currentSelected + 1} / ${solutions.length}`;
        show(currentSelected);
    });

    show(currentSelected);

    document.getElementById("print").addEventListener('click', async () => {
        let defaultPDF = await fetch(uncachedPath("data/timetable.pdf"), { cache: "no-store" }).then((res) => res.arrayBuffer());
        let pdf = await PDFLib.PDFDocument.load(defaultPDF);
        let page = pdf.getPages()[0];
        let font = await pdf.embedFont(PDFLib.StandardFonts.TimesRoman);
        let watermarkFont = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
        let { width, height } = page.getSize();
        let watermarkSize = 150;
        let watermarkText = "DRAFT";
        let watermarkWidth = watermarkFont.widthOfTextAtSize(watermarkText, watermarkSize);

        page.drawText(watermarkText, {
            x: (width - watermarkWidth) / 2,
            y: height * 0.44,
            size: watermarkSize,
            font: watermarkFont,
            color: PDFLib.rgb(0.82, 0.82, 0.82),
            rotate: PDFLib.degrees(35),
            opacity: 0.35
        });

        solutions[currentSelected].forEach((course, slot) => {
            for (let coord of slotPlacements[slot]) {
                drawCenteredWrappedText(
                    page,
                    getCourseLabel(courses, course, slot),
                    coord,
                    pdfSlotLayouts[slot],
                    font
                );
            }
        });

        let savedPDF = await pdf.save();
        let blob = new Blob([savedPDF], { type: "application/pdf" });
        window.open(URL.createObjectURL(blob), "_blank");
    });
});
