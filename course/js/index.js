localStorage.replacing = JSON.stringify(null);

function removeCourse(name) {
    let courses = JSON.parse(localStorage.courses);
    delete courses[name];
    localStorage.courses = JSON.stringify(courses);
    createElements();
}

function replaceCourse(name) {
    localStorage.replacing = JSON.stringify(name);
    prepareForNavigation();
    location.href = "new.html";
}

function createElements() {
    let courseContainer = document.getElementById("courseContainer");
    courseContainer.innerHTML = "";
    for (let key in JSON.parse(localStorage.courses)) {
        courseContainer.insertAdjacentHTML('beforeend', `
            <div class="courseContainer">
                <div class="course">
                    <span class="courseName">${key}</span>
                    <button class="replace" onclick="replaceCourse('${key}')">Replace</button>
                    <button class="remove" onclick="removeCourse('${key}')">Remove</button>
                </div>
            </div>
        `)
    }
}

createElements();
