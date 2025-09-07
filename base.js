import { formatMoney, parseDate, formatDate, formatDateReadable, getCurrentTimeString } from './utils.js';

console.log("DEBUG: base.js loaded");

const entryTableBody = document.getElementById("entryTableBody");
const tableEl = entryTableBody.parentElement;
const sluttsumEl = document.getElementById("sluttsum");
const addBtn = document.getElementById("addEntryBtn");
const nameInput = document.getElementById("desc");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const helpBtn = document.getElementById("helpBtn");
const popup = document.getElementById("popup");
const closePopupBtn = document.getElementById("closePopupBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");
const changelogDisplay = document.querySelector("#popup #changelogDisplay");

const todayBalanceInput = document.getElementById("todayBalance");
const addTodayBalanceBtn = document.getElementById("addTodayBalanceBtn");

const detailedView = document.getElementById("detailedView");
const showOnlyExpensesDetailed = document.getElementById("showOnlyExpensesDetailed");

const dateInfo = document.getElementById("dateInfo");

let entries = [];

// --- Load entries ---
const stored = localStorage.getItem("entries");
if (stored) entries = JSON.parse(stored).map(e => ({ ...e, date: new Date(e.date) }));

function saveStorage() {
    localStorage.setItem("entries", JSON.stringify(entries));
}

// --- Update slutt sum ---
function updateSluttsum() {
    if (entries.length === 0) {
        sluttsumEl.style.display = "none";
        return;
    }
    let sum = entries.reduce((acc, e) => acc + Number(e.amount), 0);
    sluttsumEl.style.display = "block";
    sluttsumEl.innerHTML = `til overs: <span style="color:${sum > 0 ? 'green' : sum < 0 ? 'red' : 'yellow'}">${formatMoney(sum)} kr</span>`;
}

// --- Render entries ---
function renderEntries() {
    if (entries.length === 0) {
        tableEl.style.display = "none";
    } else {
        tableEl.style.display = "table";
    }

    entryTableBody.innerHTML = "";
    entries.forEach((entry, index) => {
        const tr = document.createElement("tr");
        tr.classList.add("added");
        const amountColor = entry.amount > 0 ? "green" : entry.amount < 0 ? "red" : "yellow";
        tr.innerHTML = `
            <td>${formatDate(entry.date)}</td>
            <td>${entry.desc || ""}</td>
            <td style="color:${amountColor}">${formatMoney(Number(entry.amount))} kr</td>
            <td>
                <button class="plus14" data-index="${index}">+14d</button>
                <button class="remove" data-index="${index}">fjern</button>
            </td>
        `;
        entryTableBody.appendChild(tr);
    });
    updateDetailedView();
}

// --- Add entry ---
function addEntry(descVal, amountVal, dateVal) {
    const desc = descVal ?? nameInput.value.trim();
    const amount = amountVal ?? parseFloat(amountInput.value);
    const date = dateVal ?? parseDate(dateInput.value.trim());
    if (isNaN(amount) || !date) return;

    entries.push({ desc, amount, date });
    entries.sort((a, b) => a.date - b.date);
    saveStorage();
    renderEntries();

    if (!descVal) {
        nameInput.value = "";
        amountInput.value = "";
        dateInput.value = "";
    }
}

// --- Add normal entry ---
addBtn.addEventListener("click", () => addEntry());

// --- Plus14 / remove ---
entryTableBody.addEventListener("click", (e) => {
    const idx = e.target.dataset.index;
    if (e.target.classList.contains("plus14")) {
        const original = entries[idx];
        const newDate = new Date(original.date);
        newDate.setDate(newDate.getDate() + 14);
        addEntry(original.desc, original.amount, newDate);
    } else if (e.target.classList.contains("remove")) {
        entries.splice(idx, 1);
        saveStorage();
        renderEntries();
        updateSluttsum();
    }
});

// --- Enter key ---
[nameInput, amountInput, dateInput].forEach(input => {
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") addEntry(); });
});

// --- Dagens saldo ---
addTodayBalanceBtn.addEventListener("click", () => {
    const val = parseFloat(todayBalanceInput.value);
    if (isNaN(val)) {
        alert("dagens saldo må være et tall");
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exists = entries.some(e =>
        e.desc.toLowerCase() === "dagens saldo" &&
        e.date.toDateString() === today.toDateString()
    );
    if (exists) {
        alert("dagens saldo er allerede lagt til for i dag");
        return;
    }

    addEntry("dagens saldo", val, today);
    todayBalanceInput.value = "";
});

// --- Detaljert visning ---
function updateDetailedView(){
    const onlyExpenses = showOnlyExpensesDetailed.checked;
    let runningTotal = 0;
    const dailyTotals = {};
    
    const sorted = [...entries].sort((a,b)=>a.date-b.date);

    sorted.forEach(e=>{
        runningTotal += e.amount;
        const dayStr = formatDateReadable(e.date,true);
        if(!dailyTotals[dayStr]) dailyTotals[dayStr] = [];

        if(onlyExpenses){
            if(e.amount < 0) dailyTotals[dayStr].push(runningTotal);
        } else {
            dailyTotals[dayStr].push(runningTotal);
        }
    });

    detailedView.innerHTML = "";
    for(const day in dailyTotals){
        if(dailyTotals[day].length === 0) continue;
        const val = dailyTotals[day][dailyTotals[day].length - 1];
        const color = val>0?"green":val<0?"red":"yellow";
        const div = document.createElement("div");
        div.textContent=`${day}: ${formatMoney(val)} kr`;
        div.style.color=color;
        detailedView.appendChild(div);
    }
}

// --- Toggle show only expenses ---
showOnlyExpensesDetailed.addEventListener("change", updateDetailedView);

// --- popup ---
// --- vis popup på load og fyll changelog ---
popup.style.display = "flex";
renderChangelog();


helpBtn.addEventListener("click", ()=> {
    popup.style.display = "flex";
    renderChangelog();
});

closePopupBtn.addEventListener("click", () => { popup.style.display = "none"; });
// --- Lukk popup ved å klikke utenfor ---
popup.addEventListener("click", (e) => {
    if (e.target === popup) {
        popup.style.display = "none";
    }
});

clearCacheBtn.addEventListener("click", () => {
    entries = [];
    saveStorage();
    renderEntries();
    updateSluttsum();
    popup.style.display = "none";
});

// --- Update date/time display ---
function updateDateTime(){
    const now = new Date();
    const hours = now.getHours().toString().padStart(2,"0");
    const minutes = now.getMinutes().toString().padStart(2,"0");
    const todayStr = formatDateReadable(now, true);

    dateInfo.innerHTML = `${todayStr} | ${hours}:${minutes}`;
}
updateDateTime();
setInterval(updateDateTime, 60000);

// --- Changelog --- (kun endring: små bokstaver på "sist oppdatert")
async function renderChangelog() {
    try {
        const res = await fetch("changelog.md");
        if(!res.ok) return;

        const text = await res.text();
        changelogDisplay.innerHTML = "";

        // Finn siste oppdateringsdato
        const dateRegex = /\[(\d{2})-(\d{2})-(\d{4})\]/;
        let latestDate = null;
        text.split("\n").forEach(line=>{
            const match = line.match(dateRegex);
            if(match){
                const [_, d, m, y] = match;
                const dt = new Date(`${y}-${m}-${d}`);
                if(!latestDate || dt > latestDate) latestDate = dt;
            }
        });

        // --- sist oppdatert over dropdown ---
        if(latestDate){
            const d = latestDate.getDate().toString().padStart(2,"0");
            const m = latestDate.toLocaleString("default",{month:"short"});
            const y = latestDate.getFullYear();
            const lastUpdated = document.createElement("p");
            lastUpdated.textContent = `sist oppdatert: ${d} ${m} ${y}`; // små bokstaver
            lastUpdated.style.fontWeight = "bold";
            changelogDisplay.appendChild(lastUpdated);
        }

        // Legg til selve changelog-innholdet (detaljer)
        text.split(/^###\s+/m).slice(1).forEach(section=>{
            const [title, ...lines] = section.split("\n");
            const details = document.createElement("details");
            const summary = document.createElement("summary");
            summary.textContent = title;
            details.appendChild(summary);
            lines.forEach(line=>{
                if(line.trim()==="") return;
                const pre = document.createElement("pre");
                pre.textContent = line;
                details.appendChild(pre);
            });
            changelogDisplay.appendChild(details);
        });

    } catch(err){
        console.error("Kunne ikke lese changelog:", err);
    }
}


// --- Sort entries ---
const sortSelect = document.getElementById("sortSelect");
sortSelect.addEventListener("change", () => {
    const val = sortSelect.value;
    if (val === "date") entries.sort((a, b) => a.date - b.date);
    else if (val === "amount") entries.sort((a, b) => a.amount - b.amount);
    renderEntries();
});

// --- Initial ---
renderEntries();
updateSluttsum();
updateDetailedView();