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
const changelogDisplay = document.getElementById("changelogDisplay");
const changelogDropdown = document.getElementById("changelogDropdown");
const mainTitle = document.getElementById("mainTitle");

let entries = [];

// --- Ny div for datoinfo ---
const dateInfo = document.createElement("div");
dateInfo.style.fontSize = "0.9em";
dateInfo.style.color = "#ccc";
dateInfo.style.marginBottom = "10px";
mainTitle.insertAdjacentElement("afterend", dateInfo);

// --- Funksjon for å oppdatere dagens dato + klokke ---
function updateCurrentDateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2,"0");
    const minutes = now.getMinutes().toString().padStart(2,"0");
    const timeStr = `${hours}:${minutes}`;

    const todayStr = formatDateReadable(now); // bruker utils-format: DD-MM-YYYY

    if(dateInfo.dataset.lastUpdated){
        dateInfo.innerHTML = `Sist oppdatert: ${dateInfo.dataset.lastUpdated}<br>Dagens dato: ${timeStr} | ${todayStr}`;
    } else {
        dateInfo.innerHTML = `Dagens dato: ${timeStr} | ${todayStr}`;
    }
}


// --- Hent nyeste dato fra changelog ---
async function setLastUpdatedFromChangelog() {
    try {
        const res = await fetch("changelog.md");
        if (!res.ok) throw new Error("Failed to load changelog");
        const text = await res.text();
        const lines = text.split("\n");

        let latestDate = null;
        const dateRegex = /\[(\d{2}-\d{2}-\d{4})\]/; // matcher [dd-mm-yyyy]

        lines.forEach(line => {
            const match = line.match(dateRegex);
            if(match){
                const d = match[1].split("-").reverse().join("-"); // yyyy-mm-dd
                const dt = new Date(d);
                if(!latestDate || dt > latestDate) latestDate = dt;
            }
        });

        if(latestDate){
            dateInfo.dataset.lastUpdated = formatDateReadable(latestDate);
        }
    } catch(err) {
        console.error("Could not read changelog date:", err);
    } finally {
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000);
    }
}

// --- Start ---
setLastUpdatedFromChangelog();

// --- Load entries ---
const stored = localStorage.getItem("entries");
if(stored) entries = JSON.parse(stored).map(e=>({...e, date: new Date(e.date)}));

function saveStorage(){
    localStorage.setItem("entries", JSON.stringify(entries));
}

function updateSluttsum(){
    if(entries.length===0){
        sluttsumEl.style.display = "none";
        return;
    }
    const sum = entries.reduce((acc,e)=>acc+Number(e.amount),0);
    sluttsumEl.style.display = "block";
    sluttsumEl.innerHTML = `til overs: <span style="color:${sum>0?'green':sum<0?'red':'yellow'}">${formatMoney(sum)} kr</span>`;
}

function renderEntries(){
    if(entries.length === 0){
        tableEl.style.display = "none";
        return;
    }
    tableEl.style.display = "table";
    entryTableBody.innerHTML = "";

    entries.forEach((entry, index) => {
        const tr = document.createElement("tr");
        tr.classList.add("added");
        const amountColor = entry.amount > 0 ? "green" : entry.amount < 0 ? "red" : "yellow";
        tr.innerHTML = `
            <td>${formatDate(entry.date)}</td>
            <td>${entry.desc || ""}</td>
            <td style="color:${amountColor}">${formatMoney(Number(entry.amount))}</td>
            <td>
                <button class="plus14" data-index="${index}">+14d</button>
                <button class="remove" data-index="${index}">fjern</button>
            </td>
        `;
        entryTableBody.appendChild(tr);
    });
}

function addEntry(descVal, amountVal, dateVal){
    const desc = descVal ?? nameInput.value.trim();
    const amount = amountVal ?? parseFloat(amountInput.value);
    const date = dateVal ?? parseDate(dateInput.value.trim());
    if(isNaN(amount) || !date) return;

    entries.push({desc, amount, date});
    entries.sort((a,b)=>a.date - b.date);
    saveStorage();
    renderEntries();
    updateSluttsum();

    if(!descVal){
        nameInput.value = "";
        amountInput.value = "";
        dateInput.value = "";
    }
}

// --- Event listeners ---
addBtn.addEventListener("click", ()=>addEntry());

entryTableBody.addEventListener("click",(e)=>{
    if(e.target.classList.contains("plus14")){
        const idx = e.target.dataset.index;
        const original = entries[idx];
        const newDate = new Date(original.date);
        newDate.setDate(newDate.getDate()+14);
        addEntry(original.desc, original.amount, newDate);
    } else if(e.target.classList.contains("remove")){
        const idx = e.target.dataset.index;
        entries.splice(idx,1);
        saveStorage();
        renderEntries();
        updateSluttsum();
    }
});

[nameInput, amountInput, dateInput].forEach(input=>{
    input.addEventListener("keydown",(e)=>{
        if(e.key==="Enter") addEntry();
    });
});

// --- Popup ---
helpBtn.addEventListener("click", () => popup.style.display = "flex");
closePopupBtn.addEventListener("click", () => popup.style.display = "none");
clearCacheBtn.addEventListener("click", () => {
    entries = [];
    saveStorage();
    renderEntries();
    updateSluttsum();
    popup.style.display = "none";
});

// --- Changelog loader ---
changelogDropdown.addEventListener("toggle", async () => {
    if(changelogDropdown.open && changelogDisplay.textContent.trim() === ""){
        try {
            const res = await fetch("changelog.md");
            if(!res.ok) throw new Error("Failed to load changelog");
            const text = await res.text();

            const lines = text.split("\n");
            let currentCategory = null;
            const categories = [];

            lines.forEach(line=>{
                const match = line.match(/^### (.+)/);
                if(match){
                    currentCategory = { title: match[1], entries: [] };
                    categories.push(currentCategory);
                } else if(currentCategory && line.trim()!==""){
                    currentCategory.entries.push(line);
                }
            });

            changelogDisplay.innerHTML = "";

            categories.forEach(cat=>{
                const details = document.createElement("details");
                const summary = document.createElement("summary");
                summary.textContent = cat.title;
                details.appendChild(summary);

                const pre = document.createElement("pre");
                pre.textContent = cat.entries.join("\n");
                details.appendChild(pre);

                changelogDisplay.appendChild(details);
            });

        } catch(err){
            changelogDisplay.textContent = "Could not load changelog.";
            console.error(err);
        }
    }
});

// --- Initial render ---
renderEntries();
updateSluttsum();
