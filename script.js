function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        return fallback;
    }
}

function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

const subjects = loadData("studyspaceSubjects", ["Data Structures", "Object Oriented Programming", "Digital System Design", "Computer Organization", "Discrete Mathematics"]);

const savedLinks = loadData("studyspaceLinks", {});
const syllabus = loadData("studyspaceSyllabus", {});

const subjectGrid = document.getElementById("subjectGrid");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const subjectWorkspace = document.getElementById("subjectWorkspace");
const workspaceTitle = document.getElementById("workspaceTitle");
const backBtn = document.getElementById("backBtn");

const materialsCard = document.getElementById("materialsCard");
const materialsSection = document.getElementById("materialsSection");
const materialTitle = document.getElementById("materialTitle");
const materialBackBtn = document.getElementById("materialBackBtn");
const materialInput = document.getElementById("materialInput");
const materialList = document.getElementById("materialList");

const linksCard = document.getElementById("linksCard");
const linksSection = document.getElementById("linksSection");
const linksTitle = document.getElementById("linksTitle");
const linksBackBtn = document.getElementById("linksBackBtn");
const linkName = document.getElementById("linkName");
const linkURL = document.getElementById("linkURL");
const addLinkBtn = document.getElementById("addLinkBtn");
const linksList = document.getElementById("linksList");

const pyqsCard = document.getElementById("pyqsCard");
const pyqsSection = document.getElementById("pyqsSection");
const pyqsTitle = document.getElementById("pyqsTitle");
const pyqsBackBtn = document.getElementById("pyqsBackBtn");
const pyqsInput = document.getElementById("pyqsInput");
const pyqsList = document.getElementById("pyqsList");

const syllabusCard = document.getElementById("syllabusCard");
const syllabusSection = document.getElementById("syllabusSection");
const syllabusTitle = document.getElementById("syllabusTitle");
const syllabusBackBtn = document.getElementById("syllabusBackBtn");
const unitName = document.getElementById("unitName");
const addUnitBtn = document.getElementById("addUnitBtn");
const syllabusList = document.getElementById("syllabusList");
const overallProgress = document.getElementById("overallProgress");

let currentSubject = "";
let db;

const materialURLs = new Map();
const pyqURLs = new Map();

function openDatabase() {
    return new Promise(function(resolve, reject) {
        const request = indexedDB.open("StudySpaceDB", 2);

        request.onupgradeneeded = function(event) {
            const database = event.target.result;

            if (!database.objectStoreNames.contains("materials")) {
                database.createObjectStore("materials", { keyPath: "id" });
            }

            if (!database.objectStoreNames.contains("pyqs")) {
                database.createObjectStore("pyqs", { keyPath: "id" });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function() {
            reject(request.error);
        };
    });
}

function saveFile(file, subject, storeName) {
    return new Promise(function(resolve, reject) {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const record = { id: Date.now() + Math.random(), subject: subject, name: file.name, file: file };

        store.add(record);

        transaction.oncomplete = function() {
            resolve();
        };

        transaction.onerror = function() {
            reject(transaction.error);
        };
    });
}

function getFiles(subject, storeName) {
    return new Promise(function(resolve, reject) {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = function() {
            const result = request.result.filter(function(item) {
                return item.subject === subject;
            });

            resolve(result);
        };

        request.onerror = function() {
            reject(request.error);
        };
    });
}

function deleteFile(id, storeName) {
    return new Promise(function(resolve, reject) {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        store.delete(id);

        transaction.oncomplete = function() {
            resolve();
        };

        transaction.onerror = function() {
            reject(transaction.error);
        };
    });
}

function getSyllabusStats(subject) {
    const units = syllabus[subject] || [];
    let total = 0;
    let done = 0;

    units.forEach(function(unit) {
        total += unit.topics.length;
        done += unit.topics.filter(function(topic) { return topic.done; }).length;
    });

    return { total: total, done: done, pending: total - done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

async function countResources(subject) {
    const links = savedLinks[subject] ? savedLinks[subject].length : 0;

    try {
        const materials = await getFiles(subject, "materials");
        const pyqs = await getFiles(subject, "pyqs");
        return materials.length + pyqs.length + links;
    } catch (error) {
        console.error(error);
        return links;
    }
}

async function deleteSubject(subject) {
    const sure = confirm("Delete " + subject + " along with all its files, links and syllabus?");

    if (!sure) {
        return;
    }

    try {
        const materialFiles = await getFiles(subject, "materials");

        for (const file of materialFiles) {
            await deleteFile(file.id, "materials");
        }

        const pyqFiles = await getFiles(subject, "pyqs");

        for (const file of pyqFiles) {
            await deleteFile(file.id, "pyqs");
        }
    } catch (error) {
        alert("Could not delete the files of this subject.");
        console.error(error);
        return;
    }

    const index = subjects.indexOf(subject);

    if (index !== -1) {
        subjects.splice(index, 1);
    }

    delete savedLinks[subject];
    delete syllabus[subject];

    saveData("studyspaceSubjects", subjects);
    saveData("studyspaceLinks", savedLinks);
    saveData("studyspaceSyllabus", syllabus);

    displaySubjects();
}

async function displaySubjects() {
    const fragment = document.createDocumentFragment();

    for (const subject of subjects) {
        const resourceCount = await countResources(subject);
        const stats = getSyllabusStats(subject);

        const card = document.createElement("div");
        card.classList.add("subject-card");

        const top = document.createElement("div");
        top.classList.add("card-top");

        const heading = document.createElement("h3");
        heading.textContent = subject;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "✕";
        deleteBtn.title = "Delete subject";
        deleteBtn.classList.add("card-delete-btn");

        deleteBtn.addEventListener("click", function(event) {
            event.stopPropagation();
            deleteSubject(subject);
        });

        top.appendChild(heading);
        top.appendChild(deleteBtn);

        const statsBox = document.createElement("div");
        statsBox.classList.add("card-stats");

        const resourceText = document.createElement("div");
        resourceText.classList.add("card-meta");
        resourceText.textContent = "📁 " + resourceCount + (resourceCount === 1 ? " resource" : " resources");

        const progressBar = document.createElement("div");
        progressBar.classList.add("progress-bar");

        const progressFill = document.createElement("div");
        progressFill.classList.add("progress-fill");
        progressFill.style.width = stats.percent + "%";
        progressBar.appendChild(progressFill);

        const progressText = document.createElement("div");
        progressText.classList.add("card-meta");
        progressText.textContent = stats.total === 0 ? "No syllabus topics yet" : stats.percent + "% complete · " + stats.pending + " pending";

        statsBox.appendChild(resourceText);
        statsBox.appendChild(progressBar);
        statsBox.appendChild(progressText);

        card.appendChild(top);
        card.appendChild(statsBox);

        card.addEventListener("click", function() {
            currentSubject = subject;
            subjectGrid.style.display = "none";
            subjectWorkspace.style.display = "block";
            workspaceTitle.textContent = subject;
        });

        fragment.appendChild(card);
    }

    subjectGrid.innerHTML = "";

    if (subjects.length === 0) {
        subjectGrid.textContent = "No subjects yet. Click + Add Subject to start.";
        return;
    }

    subjectGrid.appendChild(fragment);
}

addSubjectBtn.addEventListener("click", function() {
    const subjectName = prompt("Enter subject name:");

    if (subjectName === null || subjectName.trim() === "") {
        return;
    }

    const cleanName = subjectName.trim();

    if (subjects.includes(cleanName)) {
        alert("This subject already exists.");
        return;
    }

    subjects.push(cleanName);
    saveData("studyspaceSubjects", subjects);
    displaySubjects();
});

backBtn.addEventListener("click", function() {
    subjectWorkspace.style.display = "none";
    subjectGrid.style.display = "grid";
    displaySubjects();
});

materialsCard.addEventListener("click", function() {
    subjectWorkspace.style.display = "none";
    materialsSection.style.display = "block";
    materialTitle.textContent = currentSubject + " - Materials";
    displayMaterials();
});

async function displayMaterials() {
    materialList.innerHTML = "";

    materialURLs.forEach(function(url) {
        URL.revokeObjectURL(url);
    });
    materialURLs.clear();

    try {
        const files = await getFiles(currentSubject, "materials");

        if (files.length === 0) {
            materialList.textContent = "No materials uploaded yet.";
            return;
        }

        files.forEach(function(file) {
            const item = document.createElement("li");

            const link = document.createElement("a");
            const fileURL = URL.createObjectURL(file.file);

            materialURLs.set(file.id, fileURL);

            link.href = fileURL;
            link.textContent = file.name;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";

            deleteBtn.addEventListener("click", async function() {
                try {
                    await deleteFile(file.id, "materials");
                    URL.revokeObjectURL(fileURL);
                    materialURLs.delete(file.id);
                    displayMaterials();
                } catch (error) {
                    alert("Could not delete this file.");
                    console.error(error);
                }
            });

            item.appendChild(link);
            item.appendChild(deleteBtn);
            materialList.appendChild(item);
        });
    } catch (error) {
        materialList.textContent = "Could not load materials.";
        console.error(error);
    }
}

materialInput.addEventListener("change", async function() {
    const files = Array.from(materialInput.files);

    try {
        for (const file of files) {
            await saveFile(file, currentSubject, "materials");
        }

        await displayMaterials();
    } catch (error) {
        alert("Could not save the uploaded file.");
        console.error(error);
    }

    materialInput.value = "";
});

materialBackBtn.addEventListener("click", function() {
    materialsSection.style.display = "none";
    subjectWorkspace.style.display = "block";
});

linksCard.addEventListener("click", function() {
    subjectWorkspace.style.display = "none";
    linksSection.style.display = "block";
    linksTitle.textContent = currentSubject + " - Useful Links";
    displayLinks();
});

addLinkBtn.addEventListener("click", function() {
    const name = linkName.value.trim();
    const url = linkURL.value.trim();

    if (name === "" || url === "") {
        alert("Please enter both link name and URL.");
        return;
    }

    try {
        const validURL = new URL(url);

        if (validURL.protocol !== "https:" && validURL.protocol !== "http:") {
            alert("Please enter a valid HTTP or HTTPS link.");
            return;
        }
    } catch (error) {
        alert("Please enter a valid URL.");
        return;
    }

    if (!savedLinks[currentSubject]) {
        savedLinks[currentSubject] = [];
    }

    savedLinks[currentSubject].push({ name: name, url: url });

    saveData("studyspaceLinks", savedLinks);

    linkName.value = "";
    linkURL.value = "";
    displayLinks();
});

function displayLinks() {
    linksList.innerHTML = "";

    if (!savedLinks[currentSubject] || savedLinks[currentSubject].length === 0) {
        linksList.textContent = "No links added yet.";
        return;
    }

    savedLinks[currentSubject].forEach(function(link, index) {
        const item = document.createElement("li");

        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.textContent = link.name;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";

        deleteBtn.addEventListener("click", function() {
            savedLinks[currentSubject].splice(index, 1);
            saveData("studyspaceLinks", savedLinks);
            displayLinks();
        });

        item.appendChild(anchor);
        item.appendChild(deleteBtn);
        linksList.appendChild(item);
    });
}

linksBackBtn.addEventListener("click", function() {
    linksSection.style.display = "none";
    subjectWorkspace.style.display = "block";
});

pyqsCard.addEventListener("click", function() {
    subjectWorkspace.style.display = "none";
    pyqsSection.style.display = "block";
    pyqsTitle.textContent = currentSubject + " - PYQs";
    displayPYQs();
});

async function displayPYQs() {
    pyqsList.innerHTML = "";

    pyqURLs.forEach(function(url) {
        URL.revokeObjectURL(url);
    });
    pyqURLs.clear();

    try {
        const files = await getFiles(currentSubject, "pyqs");

        if (files.length === 0) {
            pyqsList.textContent = "No question papers uploaded yet.";
            return;
        }

        files.forEach(function(file) {
            const item = document.createElement("li");

            const link = document.createElement("a");
            const fileURL = URL.createObjectURL(file.file);

            pyqURLs.set(file.id, fileURL);

            link.href = fileURL;
            link.textContent = file.name;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";

            deleteBtn.addEventListener("click", async function() {
                try {
                    await deleteFile(file.id, "pyqs");
                    URL.revokeObjectURL(fileURL);
                    pyqURLs.delete(file.id);
                    displayPYQs();
                } catch (error) {
                    alert("Could not delete this question paper.");
                    console.error(error);
                }
            });

            item.appendChild(link);
            item.appendChild(deleteBtn);
            pyqsList.appendChild(item);
        });
    } catch (error) {
        pyqsList.textContent = "Could not load question papers.";
        console.error(error);
    }
}

pyqsInput.addEventListener("change", async function() {
    const files = Array.from(pyqsInput.files);

    try {
        for (const file of files) {
            await saveFile(file, currentSubject, "pyqs");
        }

        await displayPYQs();
    } catch (error) {
        alert("Could not save the question paper.");
        console.error(error);
    }

    pyqsInput.value = "";
});

pyqsBackBtn.addEventListener("click", function() {
    pyqsSection.style.display = "none";
    subjectWorkspace.style.display = "block";
});

syllabusCard.addEventListener("click", function() {
    subjectWorkspace.style.display = "none";
    syllabusSection.style.display = "block";
    syllabusTitle.textContent = currentSubject + " - Syllabus";
    displaySyllabus();
});

syllabusBackBtn.addEventListener("click", function() {
    syllabusSection.style.display = "none";
    subjectWorkspace.style.display = "block";
});

addUnitBtn.addEventListener("click", function() {
    const name = unitName.value.trim();

    if (name === "") {
        alert("Please enter a unit name.");
        return;
    }

    if (!syllabus[currentSubject]) {
        syllabus[currentSubject] = [];
    }

    syllabus[currentSubject].push({ name: name, topics: [] });

    saveData("studyspaceSyllabus", syllabus);

    unitName.value = "";
    displaySyllabus();
});

function renderOverallProgress() {
    const stats = getSyllabusStats(currentSubject);

    overallProgress.innerHTML = "";

    const text = document.createElement("div");
    text.classList.add("progress-info");
    text.textContent = "Overall: " + stats.done + " of " + stats.total + " topics completed (" + stats.percent + "%)";

    const bar = document.createElement("div");
    bar.classList.add("progress-bar");

    const fill = document.createElement("div");
    fill.classList.add("progress-fill");
    fill.style.width = stats.percent + "%";

    bar.appendChild(fill);
    overallProgress.appendChild(text);
    overallProgress.appendChild(bar);
}

function displaySyllabus() {
    syllabusList.innerHTML = "";

    renderOverallProgress();

    if (!syllabus[currentSubject] || syllabus[currentSubject].length === 0) {
        syllabusList.textContent = "No units added yet.";
        return;
    }

    syllabus[currentSubject].forEach(function(unit, unitIndex) {
        const unitCard = document.createElement("div");
        unitCard.classList.add("unit-card");

        const unitHeader = document.createElement("div");
        unitHeader.classList.add("unit-header");

        const heading = document.createElement("h3");
        heading.textContent = unit.name;

        const unitActions = document.createElement("div");
        unitActions.classList.add("unit-actions");

        const addTopicBtn = document.createElement("button");
        addTopicBtn.textContent = "+ Add Subtopic";
        addTopicBtn.classList.add("add-topic-btn");

        addTopicBtn.addEventListener("click", function() {
            const topicName = prompt("Enter subtopic name:");

            if (topicName === null || topicName.trim() === "") {
                return;
            }

            unit.topics.push({ name: topicName.trim(), done: false });

            saveData("studyspaceSyllabus", syllabus);
            displaySyllabus();
        });

        const deleteUnitBtn = document.createElement("button");
        deleteUnitBtn.textContent = "Delete Unit";
        deleteUnitBtn.classList.add("unit-delete-btn");

        deleteUnitBtn.addEventListener("click", function() {
            const sure = confirm("Delete " + unit.name + " and all its subtopics?");

            if (!sure) {
                return;
            }

            syllabus[currentSubject].splice(unitIndex, 1);
            saveData("studyspaceSyllabus", syllabus);
            displaySyllabus();
        });

        unitActions.appendChild(addTopicBtn);
        unitActions.appendChild(deleteUnitBtn);
        unitHeader.appendChild(heading);
        unitHeader.appendChild(unitActions);
        unitCard.appendChild(unitHeader);

        const totalTopics = unit.topics.length;
        const completedTopics = unit.topics.filter(function(topic) { return topic.done; }).length;
        const progress = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

        const progressInfo = document.createElement("div");
        progressInfo.classList.add("progress-info");
        progressInfo.textContent = completedTopics + " of " + totalTopics + " subtopics completed (" + progress + "%)";

        const progressBar = document.createElement("div");
        progressBar.classList.add("progress-bar");

        const progressFill = document.createElement("div");
        progressFill.classList.add("progress-fill");
        progressFill.style.width = progress + "%";

        progressBar.appendChild(progressFill);

        unitCard.appendChild(progressInfo);
        unitCard.appendChild(progressBar);

        const topicList = document.createElement("div");
        topicList.classList.add("topic-list");

        unit.topics.forEach(function(topic, topicIndex) {
            const topicRow = document.createElement("div");
            topicRow.classList.add("topic-row");

            const leftSide = document.createElement("label");
            leftSide.classList.add("topic-left");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = topic.done;
            checkbox.classList.add("topic-checkbox");

            checkbox.addEventListener("change", function() {
                topic.done = checkbox.checked;
                saveData("studyspaceSyllabus", syllabus);
                displaySyllabus();
            });

            const topicText = document.createElement("span");
            topicText.textContent = topic.name;

            leftSide.appendChild(checkbox);
            leftSide.appendChild(topicText);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.classList.add("topic-delete-btn");

            deleteBtn.addEventListener("click", function() {
                unit.topics.splice(topicIndex, 1);
                saveData("studyspaceSyllabus", syllabus);
                displaySyllabus();
            });

            topicRow.appendChild(leftSide);
            topicRow.appendChild(deleteBtn);
            topicList.appendChild(topicRow);
        });

        unitCard.appendChild(topicList);
        syllabusList.appendChild(unitCard);
    });
}

async function startStudySpace() {
    try {
        await openDatabase();
        displaySubjects();
    } catch (error) {
        alert("Storage could not be started. Please check your browser settings.");
        console.error(error);
    }
}

startStudySpace();