"use strict";

// Призы и основные данные приложения.
const prizes = [
    "Сертификат на 1000 рублей",
    "Наушники",
    "Флешка 64 ГБ",
    "Подарочный набор",
    "Беспроводная мышь",
    "Блокнот и ручка",
    "Скидка 20%",
    "Сладкий приз",
    "Пауэрбанк",
    "Настольная лампа"
];

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const loadButton = document.getElementById("loadButton");
const spinButton = document.getElementById("spinButton");
const historyButton = document.getElementById("historyButton");
const resetButton = document.getElementById("resetButton");
const wheel = document.getElementById("wheel");
const participantsList = document.getElementById("participantsList");
const historyList = document.getElementById("historyList");

let selectedFile = null;

let participants = [];

let history = [];

const storageKey = "fortuneWheelState";

let currentParticipantIndex = 0;

let currentRotation = 0;

let isSpinning = false;

// Функция сохраняет текущее состояние приложения в localStorage
const saveState = () => {
    const data = {
        participants: participants,
        history: history,
        currentParticipantIndex: currentParticipantIndex,
        currentRotation: currentRotation
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
}

const loadState = () => {
    const savedData = localStorage.getItem(storageKey);

    // если сохранения еще нет, приложение просто запускается с пустым состоянием
    if (!savedData) {
        return;
    }

    try {
        const data = JSON.parse(savedData);

        if (Array.isArray(data.participants)) {
            participants = data.participants;
        }

        if (Array.isArray(data.history)) {
            history = data.history;
        }

        if (typeof data.currentParticipantIndex === "number") {
            currentParticipantIndex = data.currentParticipantIndex;
        }

        if (typeof data.currentRotation === "number") {
            currentRotation = data.currentRotation;
            wheel.style.transform = "rotate(" + currentRotation + "deg)";
        }
    } catch (err) {
        localStorage.removeItem(storageKey);
    }
}

const clearState = () => {
    localStorage.removeItem(storageKey);
}

// загрузка файла с участниками
const loadParticipants = () => {
    // без выбранного файла FileReader не сможет получить данные участников
    if (!selectedFile) {
        showAlert("Ошибка", "Сначала выберите файл с участниками.");
        return;
    }

    const r = new FileReader();

    r.onload = () => {
        try {
            const txt = String(r.result || "");

            const type = selectedFile.name.split(".").pop().toLowerCase();

            const newList = parseParticipants(txt, type);

            if (newList.length === 0) {
                showAlert("Ошибка", "В файле не найдено участников.");
                return;
            }

            participants = newList;

            currentParticipantIndex = 0;

            history = [];
            saveState();

            renderParticipants();
            renderHistory();

            showAlert("Успешно", "Загружено участников: " + participants.length);
        } catch (err) {
            showAlert("Ошибка", err.message);
        }
    };

    r.onerror = () => {
        showAlert("Ошибка", "Не удалось прочитать выбранный файл.");
    };

    r.readAsText(selectedFile, "UTF-8");
}

// парсинг и валидация JSON/CSV со списком участников
const parseParticipants = (txt, type) => {
    if (type === "json") {
        return parseJsonParticipants(txt);
    }

    if (type === "csv") {
        return parseCsvParticipants(txt);
    }

    throw new Error("Поддерживаются только файлы JSON и CSV.");
}

const parseJsonParticipants = (txt) => {
    const data = JSON.parse(txt);

    // arr будет хранить список участников независимо от того, как он записан в JSON
    let arr;

    if (Array.isArray(data)) {
        arr = data;

    } else if (Array.isArray(data.participants)) {
        arr = data.participants;

    } else if (data && typeof data === "object") {
        arr = Object.keys(data).map((key) => {
            const val = data[key];

            if (typeof val === "string") {
                return { id: key, name: val };
            }

            return Object.assign({ id: key }, val);
        });

    } else {
        throw new Error("Неверная структура JSON.");
    }

    return normalizeParticipants(arr);
}

const parseCsvParticipants = (txt) => {
    // CSV обрабатывается построчно: пустые строки сразу отбрасываются
    const list = txt
        .split(/\r?\n/)
        .map((str) => {
            return str.trim();
        })
        .filter(Boolean);

    if (list.length === 0) {
        return [];
    }

    const first = list[0].toLowerCase();

    const ok = first.includes("name") || first.includes("имя");

    const rows = ok ? list.slice(1) : list;

    const arr = rows.map((str, i) => {
        const parts = str.split(";").length > 1 ? str.split(";") : str.split(",");

        return {
            id: i + 1,
            name: (parts[0] || "").trim()
        };
    });

    return normalizeParticipants(arr);
}

const normalizeParticipants = (arr) => {
    // нормализация приводит строки и обьекты к одному виду: { id, name }
    return arr
        .map((thing, i) => {
            if (typeof thing === "string") {
                return {
                    id: i + 1,
                    name: thing.trim()
                };
            }

            return {
                id: thing.id || i + 1,
                name: String(thing.name || thing.fullName || thing.fio || thing["ФИО"] || "").trim()
            };
        })
        .filter((thing) => {
            return thing.name.length > 0;
        });
}

// запуск вращения колеса и выбор сектора
const startSpin = () => {
    // пока колесо крутится, повторный запуск игнорируется

    if (isSpinning) {
        return;
    }

    if (participants.length === 0) {
        showAlert("Ошибка", "Перед розыгрышем загрузите участников.");
        return;
    }

    if (currentParticipantIndex >= participants.length) {
        showAlert("Розыгрыш завершен", "Все участники уже получили призы.");
        return;
    }

    const num = Math.floor(Math.random() * prizes.length);

    const size = 360 / prizes.length;

    const center = num * size;

    const extra = 5 + Math.floor(Math.random() * 3);

    const start = currentRotation;

    const need = (360 - center) % 360;

    const diff = (need - start + 360) % 360;

    const end = 360 * extra + diff;

    const final = start + end;

    const allTime = 4500;

    const startTime = performance.now();

    isSpinning = true;

    spinButton.disabled = true;

    const animate = (time) => {
        const part = Math.min((time - startTime) / allTime, 1);

        const nicePart = easeOutCubic(part);

        const deg = start + end * nicePart;

        wheel.style.transform = "rotate(" + deg + "deg)";

        if (part < 1) {
            requestAnimationFrame(animate);
            return;
        }

        currentRotation = final % 360;

        wheel.style.transform = "rotate(" + currentRotation + "deg)";

        finishDraw(num);
    };

    requestAnimationFrame(animate);
}

// завершение розыгрыша и запись результата в историю
const finishDraw = (num) => {
    const person = participants[currentParticipantIndex];

    const gift = prizes[num];

    // дата сохраняется в двух видах: для показа пользователю и для точной записи
    const day = new Date();

    const rec = {
        date: day.toLocaleDateString("ru-RU"),
        time: day.toLocaleTimeString("ru-RU"),
        dateTime: day.toISOString(),

        winner: {
            id: person.id,
            name: person.name
        },

        prize: gift,
        sector: num + 1
    };

    history.push(rec);

    // следующий розыгрыш перейдет к следующему участнику по списку
    currentParticipantIndex++;
    saveState();

    isSpinning = false;

    spinButton.disabled = false;

    renderParticipants();
    renderHistory();

    showAlert("Приз присвоен", "Участник: " + person.name + "\nПриз: " + gift);
}

// отрисовка участников и истории на странице=
const renderParticipants = () => {
    // Перед новой отрисовкой старые карточки удаляются
    participantsList.innerHTML = "";

    participants.forEach((person) => {
        const box = document.createElement("div");

        box.className = "participant";

        box.innerHTML = "<strong>" + escapeHtml(person.name) + "</strong><span>ID: " + escapeHtml(person.id) + "</span>";

        participantsList.appendChild(box);
    });
}

const renderHistory = () => {
    // История перерисовывается полностью, чтобы экран совпадал с массивом history.
    historyList.innerHTML = "";

    history.forEach((rec) => {
        const box = document.createElement("div");

        box.className = "history-item";

        box.innerHTML =
            "<strong>" + escapeHtml(rec.winner.name) + "</strong>" +
            "<span>Приз: " + escapeHtml(rec.prize) + "</span>" +
            "<span>" + escapeHtml(rec.date) + " " + escapeHtml(rec.time) + "</span>";

        historyList.appendChild(box);
    });
}

// скачивание истории розыгрышей
const downloadHistory = () => {
    // пустой файл истории не создается, чтобы пользователь не скачивал бесполезный JSON
    if (history.length === 0) {
        showAlert("История пуста", "Пока нет данных для скачивания.");
        return;
    }

    const txt = JSON.stringify(history, null, 4);

    const file = new Blob([txt], { type: "application/json" });

    const a = document.createElement("a");

    a.href = URL.createObjectURL(file);

    a.download = "history.json";

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(a.href);
}

// полная очистка данных розыгрыша
const resetDraw = () => {
    participants = [];

    history = [];
    clearState();

    currentParticipantIndex = 0;

    currentRotation = 0;

    selectedFile = null;

    fileInput.value = "";

    fileName.textContent = "Файл не выбран";

    wheel.style.transform = "rotate(0deg)";

    renderParticipants();
    renderHistory();

    showAlert("Сброс", "Данные розыгрыша очищены.");
}

// вспомогательные функции интерфейса
const showAlert = (name, txt) => {
    const msg = name + "\n\n" + txt;

    alert(msg);
}

const easeOutCubic = (num) => {
    return 1 - Math.pow(1 - num, 3);
}

const escapeHtml = (val) => {
    return String(val)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// обработчики событий
fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0] || null;

    fileName.textContent = selectedFile ? selectedFile.name : "Файл не выбран";
});

loadState();
renderParticipants();
renderHistory();

loadButton.addEventListener("click", loadParticipants);
spinButton.addEventListener("click", startSpin);
historyButton.addEventListener("click", downloadHistory);
resetButton.addEventListener("click", resetDraw);

