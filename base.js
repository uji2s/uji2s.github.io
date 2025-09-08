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
const changelogDisplay = document.getElementById("changelogDisplay");

const todayBalanceInput = document.getElementById("todayBalance");
const addTodayBalanceBtn = document.getElementById("addTodayBalanceBtn");

const detailedView = document.getElementById("detailedView");
const showOnlyExpensesDetailed = document.getElementById("showOnlyExpensesDetailed");
const exportBtn = document.getElementById("exportBtn");

const dateInfo = document.getElementById("dateInfo");

let entries = [];

// --- Load entries ---
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

// --- Force update SW ---
document.addEventListener("DOMContentLoaded", () => {
    const forceBtn = document.getElementById("forceUpdateBtn");
    if (!forceBtn) return;

    forceBtn.addEventListener("click", async () => {
        console.log("DEBUG: Force update knapp trykket");

        if (!('serviceWorker' in navigator)) {
            console.warn("DEBUG: Service workers ikke støttet i denne nettleseren");
            return;
        }

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            console.log("DEBUG: Fikk service worker registration:", registration);

            if (!registration) return;

            // Hent sw.js med timestamp for å bypass cache
            const swCheck = await fetch(`/sw.js?ts=${Date.now()}`, { cache: "no-store" });
            console.log("DEBUG: sw.js fetch status:", swCheck.status);

            if (!swCheck.ok) return;

            // Oppdater SW
            await registration.update();

            // Hvis det er en ny SW som venter
            if (registration.waiting) {
                console.log("DEBUG: Ny SW venter, sender SKIP_WAITING");
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
                return;
            }

            // Hvis en ny SW blir funnet under oppdatering
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log("DEBUG: Ny SW installert, sender SKIP_WAITING");
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                    }
                });
            });
        } catch (err) {
            console.error("DEBUG: Feil ved force update:", err);
        }
    });
});

// --- Save storage ---
function saveStorage() {
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
    sluttsumEl.textContent = "til overs: ";
    const span = document.createElement("span");
    span.style.color = sum > 0 ? 'green' : sum < 0 ? 'red' : 'yellow';
    span.textContent = `${formatMoney(sum)} kr`;
    sluttsumEl.appendChild(span);
}

// --- Render entries ---
function renderEntries() {
    if (!tableEl || !entryTableBody) return;

    tableEl.style.display = entries.length === 0 ? "none" : "table";
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

        const btnDuplicate = document.createElement("button");
        btnDuplicate.className = "duplicate";
        btnDuplicate.dataset.index = String(index);
        btnDuplicate.textContent = "+";

        const btnRemove = document.createElement("button");
        btnRemove.className = "remove";
        btnRemove.dataset.index = String(index);
        btnRemove.textContent = "fjern";

        tdActions.appendChild(btnPlus);
        tdActions.appendChild(btnDuplicate);
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

// --- Inline editing ---
function enableInlineEditing() {
    entryTableBody.querySelectorAll("tr").forEach((tr,index)=>{
        const tdDate = tr.children[0];
        const tdAmount = tr.children[2];

        const createInput = (val,type="text")=>{
            const input = document.createElement("input");
            input.type = type;
            input.value = "";
            input.placeholder = val;
            input.className = "inline-edit-input";
            return input;
        };

        const finishDate = (input)=>{
            let val = input.value.trim();
            let newDate = parseDate(val);
            if(!newDate){
                const today = new Date();
                const day = parseInt(val,10);
                if(!isNaN(day)) newDate = new Date(today.getFullYear(),today.getMonth(),day);
                else newDate = entries[index].date;
            }

            const oldMonth = entries[index].date.getMonth();
            const newMonth = newDate.getMonth();
            if(newMonth!==oldMonth){
                for(let i=index+1;i<entries.length;i++){
                    entries[i].date.setMonth(entries[i].date.getMonth()+(newMonth-oldMonth));
                }
            }
            entries[index].date = newDate;
            saveStorage();
            renderEntries();
        };

        const finishAmount = (input)=>{
            let val = input.value.replace(/[^\d.-]/g,"").trim();
            let num = parseFloat(val);
            if(isNaN(num)) num = entries[index].amount;
            entries[index].amount = num;
            saveStorage();
            renderEntries();
        };

        const setupInline = (td,finishFn)=>{
            td.addEventListener("click",()=>{
                if(td.querySelector("input")) return;
                const initialVal = td.textContent;
                const input = createInput(initialVal);
                td.textContent="";
                td.appendChild(input);
                input.focus();

                const doFinish = ()=>{ finishFn(input); };
                input.addEventListener("blur",doFinish);
                input.addEventListener("keydown",(e)=>{
                    if(e.key==="Enter"||e.keyCode===13){
                        e.preventDefault();
                        input.blur();
                    }
                });
            });
        };

        setupInline(tdDate,finishDate);
        setupInline(tdAmount,finishAmount);
    });
}

const originalRenderEntries = renderEntries;
renderEntries = function(){
    originalRenderEntries();
    enableInlineEditing();
};

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

    if (typeof descVal === "undefined") {
        if (nameInput) nameInput.value = "";
        if (amountInput) amountInput.value = "";
        if (dateInput) dateInput.value = "";
    }
}

addBtn?.addEventListener("click", () => addEntry());

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

    } else if (btn.classList.contains("duplicate")) {
        const original = entries[idx];
        if (!original) return;

        const newEntry = {
            date: new Date(original.date),
            desc: original.desc,
            amount: original.amount
        };

        entries.splice(idx + 1, 0, newEntry);

        saveStorage();
        renderEntries();
        updateSluttsum();

    } else if (btn.classList.contains("remove")) {
        entries.splice(idx, 1);
        saveStorage();
        renderEntries();
        updateSluttsum();
    }
});

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
    today.setHours(0,0,0,0);

    const exists = entries.some(e =>
        (e.desc||"").toLowerCase()==="dagens saldo" && e.date.toDateString()===today.toDateString()
    );
    if (exists) {
        alert("dagens saldo er allerede lagt til for i dag");
        return;
    }

    addEntry("dagens saldo", val, today);
    if(todayBalanceInput) todayBalanceInput.value="";
});

// --- Detaljert visning ---
function updateDetailedView() {
    if (!detailedView) return;

    const onlyExpenses = showOnlyExpensesDetailed?.checked;
    const dailyTotals = {};
    let runningTotal = 0;

    const sorted = [...entries].sort((a, b) => a.date - b.date);

    sorted.forEach(entry => {
        runningTotal += Number(entry.amount || 0);
        const dayStr = formatDateReadable(entry.date, true);

        if (!dailyTotals[dayStr]) {
            dailyTotals[dayStr] = {
                all: null,
                expensesOnly: null
            };
        }

        dailyTotals[dayStr].all = runningTotal;

        if (entry.amount < 0) {
            dailyTotals[dayStr].expensesOnly = runningTotal;
        }
    });

    detailedView.innerHTML = "";

    for (const day in dailyTotals) {
        const data = dailyTotals[day];
        let val = onlyExpenses ? data.expensesOnly : data.all;

        if (onlyExpenses && val === null) continue;

        const color = val > 0 ? "green" : val < 0 ? "red" : "yellow";
        const div = document.createElement("div");
        div.textContent = `${day}: ${formatMoney(val)} kr`;
        div.style.color = color;
        detailedView.appendChild(div);
    }
}

showOnlyExpensesDetailed?.addEventListener("change",updateDetailedView);

// --- Popup / Help / Changelog ---
let changelogLoaded=false;
helpBtn?.addEventListener("click",()=>{
    popup.style.display="flex";
    renderHelpText();
    if(!changelogLoaded){
        renderChangelog(changelogDisplay);
        changelogLoaded=true;
    }
});

function renderHelpText(){
    const helpContainer=document.getElementById("helpDisplay");
    if(!helpContainer) return;
    helpContainer.innerHTML=`
        <h2>hvordan bruke kalkulatoren?</h2>
        <p><strong>legg til oppføring:</strong> skriv inn navn, beløp, dato og kategori, trykk legg til...</p>
        <p><strong>+14d:</strong> dupliser oppføringer 14 dager frem...</p>
        <p><strong>inline editing:</strong> trykk på dato eller beløp i tabellen...</p>
        <p><strong>detailed view:</strong> denne visningen viser saldoen din...</p>
        <p><strong>filtrering og kategorier:</strong> du kan filtrere oppføringer...</p>
        <p><strong>historikk:</strong> alle oppføringer lagres automatisk...</p>
    `;
}

async function renderChangelog(changelogDisplay) {
    if (!changelogDisplay) return;
    try {
        const res = await fetch("changelog.md");
        if(!res.ok) return;
        const text = await res.text();
        changelogDisplay.innerHTML = "";

        const dateRegex = /\[(\d{2})-(\d{2})-(\d{4})\]/g;
        let latestDate = null;
        let match;
        while ((match = dateRegex.exec(text)) !== null) {
            const [_, d, m, y] = match;
            const dt = new Date(`${y}-${m}-${d}`);
            if (!latestDate || dt > latestDate) latestDate = dt;
        }

        if (latestDate) {
            const lastUpdated = document.createElement("p");
            lastUpdated.textContent = `Sist oppdatert: ${formatDateReadable(latestDate,true)}`;
            changelogDisplay.appendChild(lastUpdated);
        }

        const pre = document.createElement("pre");
        pre.textContent = text;
        changelogDisplay.appendChild(pre);

    } catch(err){
        console.error("feil ved innlasting changelog:",err);
    }
}

closePopupBtn?.addEventListener("click",()=>{popup.style.display="none";});
clearCacheBtn?.addEventListener("click",()=>{
    localStorage.clear();
    window.location.reload();
});

// --- Init ---
renderEntries();
updateDetailedView();
