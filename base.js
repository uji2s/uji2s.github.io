import { formatMoney, parseDate, formatDate, formatDateReadable, getCurrentTimeString } from './utils.js';

console.log("DEBUG: base.js loaded");

const entryTableBody = document.getElementById("entryTableBody");
const tableEl = entryTableBody?.parentElement;
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

// --- Load entries (safe) ---
const stored = localStorage.getItem("entries");
if (stored) {
    try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            entries = parsed.map(e => ({
                ...e,
                date: e.date ? new Date(e.date) : new Date()
            }));
        }
    } catch (err) {
        console.error("Failed to parse stored entries:", err);
        entries = [];
    }
}

function saveStorage() {
    // Serialize dates as ISO strings to avoid losing info
    const serializable = entries.map(e => ({ ...e, date: e.date instanceof Date ? e.date.toISOString() : e.date }));
    localStorage.setItem("entries", JSON.stringify(serializable));
}

// --- Update slutt sum ---
function updateSluttsum() {
    if (!sluttsumEl) return;
    if (entries.length === 0) {
        sluttsumEl.style.display = "none";
        return;
    }
    let sum = entries.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    sluttsumEl.style.display = "block";
    // build DOM safely instead of innerHTML
    sluttsumEl.textContent = "til overs: ";
    const span = document.createElement("span");
    span.style.color = sum > 0 ? 'green' : sum < 0 ? 'red' : 'yellow';
    span.textContent = `${formatMoney(sum)} kr`;
    sluttsumEl.appendChild(span);
}

// --- Render entries (safe DOM updates, use fragment) ---
function renderEntries() {
    if (!tableEl || !entryTableBody) return;

    tableEl.style.display = entries.length === 0 ? "none" : "table";

    // Clear body
    entryTableBody.innerHTML = "";

    const frag = document.createDocumentFragment();
    entries.forEach((entry, index) => {
        const tr = document.createElement("tr");
        tr.classList.add("added");

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDate(entry.date);

        const tdDesc = document.createElement("td");
        tdDesc.textContent = entry.desc || "";

        const tdAmount = document.createElement("td");
        const amountVal = Number(entry.amount || 0);
        tdAmount.style.color = amountVal > 0 ? "green" : amountVal < 0 ? "red" : "yellow";
        tdAmount.textContent = `${formatMoney(amountVal)} kr`;

        const tdActions = document.createElement("td");
        const btnPlus = document.createElement("button");
        btnPlus.className = "plus14";
        btnPlus.dataset.index = String(index);
        btnPlus.textContent = "+14d";

        const btnRemove = document.createElement("button");
        btnRemove.className = "remove";
        btnRemove.dataset.index = String(index);
        btnRemove.textContent = "fjern";

        tdActions.appendChild(btnPlus);
        tdActions.appendChild(btnRemove);

        tr.appendChild(tdDate);
        tr.appendChild(tdDesc);
        tr.appendChild(tdAmount);
        tr.appendChild(tdActions);

        frag.appendChild(tr);
    });

    entryTableBody.appendChild(frag);
    updateSluttsum();
    updateDetailedView();
}

// --- Add entry ---
function addEntry(descVal, amountVal, dateVal) {
    const desc = typeof descVal === "string" ? descVal : (nameInput?.value || "").trim();
    const amountRaw = typeof amountVal !== "undefined" ? amountVal : parseFloat(amountInput?.value || "");
    const amount = Number(amountRaw);
    const date = dateVal instanceof Date ? dateVal : parseDate((dateInput?.value || "").trim());
    if (isNaN(amount) || !(date instanceof Date) || isNaN(date.getTime())) return;

    entries.push({ desc, amount, date });
    entries.sort((a, b) => a.date - b.date);
    saveStorage();
    renderEntries();

    // clear inputs only when user used the inputs (not programmatic call)
    if (typeof descVal === "undefined") {
        if (nameInput) nameInput.value = "";
        if (amountInput) amountInput.value = "";
        if (dateInput) dateInput.value = "";
    }
}

// --- Add normal entry ---
addBtn?.addEventListener("click", () => addEntry());

// --- Plus14 / remove (robust event delegation) ---
entryTableBody?.addEventListener("click", (e) => {
    const btn = e.target.closest?.('button');
    if (!btn) return;
    const idx = Number.parseInt(btn.dataset.index, 10);
    if (!Number.isFinite(idx)) return;

    if (btn.classList.contains("plus14")) {
        const original = entries[idx];
        if (!original) return;
        const newDate = new Date(original.date);
        newDate.setDate(newDate.getDate() + 14);
        addEntry(original.desc, original.amount, newDate);
    } else if (btn.classList.contains("remove")) {
        entries.splice(idx, 1);
        saveStorage();
        renderEntries();
        updateSluttsum();
    }
});

// --- Enter key ---
[nameInput, amountInput, dateInput].forEach(input => {
    input?.addEventListener("keydown", (e) => { if (e.key === "Enter") addEntry(); });
});

// --- Dagens saldo ---
addTodayBalanceBtn?.addEventListener("click", () => {
    const val = parseFloat(todayBalanceInput?.value || "");
    if (isNaN(val)) {
        alert("dagens saldo må være et tall");
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exists = entries.some(e =>
        (e.desc || "").toLowerCase() === "dagens saldo" &&
        e.date.toDateString() === today.toDateString()
    );
    if (exists) {
        alert("dagens saldo er allerede lagt til for i dag");
        return;
    }

    addEntry("dagens saldo", val, today);
    if (todayBalanceInput) todayBalanceInput.value = "";
});

// --- Detaljert visning ---
function updateDetailedView(){
    if (!detailedView) return;
    const onlyExpenses = showOnlyExpensesDetailed?.checked;
    let runningTotal = 0;
    const dailyTotals = {};

    const sorted = [...entries].sort((a,b)=>a.date-b.date);

    sorted.forEach(e=>{
        runningTotal += Number(e.amount || 0);
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
        div.textContent = `${day}: ${formatMoney(val)} kr`;
        div.style.color = color;
        detailedView.appendChild(div);
    }
}

// --- Toggle show only expenses ---
showOnlyExpensesDetailed?.addEventListener("change", updateDetailedView);

// --- popup ---
popup && (popup.style.display = "flex");
renderChangelog();


helpBtn?.addEventListener("click", ()=> {
    popup && (popup.style.display = "flex");
    renderChangelog();
});

closePopupBtn?.addEventListener("click", () => { if(popup) popup.style.display = "none"; });
// --- Lukk popup ved å klikke utenfor ---
popup?.addEventListener("click", (e) => {
    if (e.target === popup) {
        popup.style.display = "none";
    }
});

clearCacheBtn?.addEventListener("click", () => {
    entries = [];
    saveStorage();
    renderEntries();
    updateSluttsum();
    if(popup) popup.style.display = "none";
});

// --- Update date/time display ---
function updateDateTime(){
    const now = new Date();
    const hours = now.getHours().toString().padStart(2,"0");
    const minutes = now.getMinutes().toString().padStart(2,"0");
    const todayStr = formatDateReadable(now, true);

    if(dateInfo) dateInfo.innerHTML = `${todayStr} | ${hours}:${minutes}`;
}
updateDateTime();
setInterval(updateDateTime, 60000);

// --- Changelog --- (kun endring: små bokstaver på "sist oppdatert")
async function renderChangelog() {
    try {
        const res = await fetch("changelog.md");
        if(!res.ok) return;

        const text = await res.text();
        if(!changelogDisplay) return;
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
sortSelect?.addEventListener("change", () => {
    const val = sortSelect.value;
    if (val === "date") entries.sort((a, b) => a.date - b.date);
    else if (val === "amount") entries.sort((a, b) => a.amount - b.amount);
    renderEntries();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      console.log('SW registered', reg);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available
              showUpdateBanner();
            }
          }
        });
      });
    })
    .catch(err => console.error('SW registration failed:', err));
}

// Show update banner
function showUpdateBanner() {
  if(document.getElementById('updateBanner')) return; // already showing

  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.textContent = 'Ny oppdatering tilgjengelig – klikk for å laste på nytt';
  banner.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #00aaff;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
    font-weight: bold;
  `;
  banner.addEventListener('click', () => location.reload());
  document.body.appendChild(banner);
}


// --- Initial ---
renderEntries();
updateSluttsum();
updateDetailedView();