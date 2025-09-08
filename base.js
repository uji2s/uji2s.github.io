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

document.addEventListener("DOMContentLoaded", () => {
    const forceBtn = document.getElementById("forceUpdateBtn");
    if (!forceBtn) return;

    forceBtn.addEventListener("click", async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                }
            } catch (err) {
                console.error("Feil ved force update:", err);
                alert("Kunne ikke sjekke oppdatering");
            }
        } else {
            alert("Service Worker ikke støttet i denne nettleseren");
        }
    });
});

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

document.addEventListener("DOMContentLoaded", async () => {
    const changelogDisplay = document.getElementById("changelogDisplay"); // må matche din popup
    if (!changelogDisplay) return; // safety check
    await renderChangelog(changelogDisplay);
});

document.addEventListener("DOMContentLoaded", () => {
    const clearCacheBtn = document.getElementById("clearCacheBtn");
    if (!clearCacheBtn) return;

    clearCacheBtn.addEventListener("click", async () => {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
                // Auto reload etter clearing cache
                window.location.reload();
            } catch (err) {
                console.error("Feil ved clearing cache:", err);
            }
        }
    });
});


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

    // Sorter alle entries etter dato
    const sorted = [...entries].sort((a, b) => a.date - b.date);

    sorted.forEach(entry => {
        runningTotal += Number(entry.amount || 0);
        const dayStr = formatDateReadable(entry.date, true);

        if (!dailyTotals[dayStr]) {
            dailyTotals[dayStr] = {
                all: null,      // total saldo etter alle transaksjoner
                expensesOnly: null // saldo etter bare utgifter
            };
        }

        // total saldo
        dailyTotals[dayStr].all = runningTotal;

        // Hvis denne transaksjonen er en utgift
        if (entry.amount < 0) {
            // saldo etter at utgiften er betalt
            dailyTotals[dayStr].expensesOnly = runningTotal;
        }
    });

    detailedView.innerHTML = "";

    for (const day in dailyTotals) {
        const data = dailyTotals[day];
        let val = onlyExpenses ? data.expensesOnly : data.all;

        // hopp over hvis det ikke finnes utgifter den dagen
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
        renderChangelog();
        changelogLoaded=true;
    }
});

function renderHelpText(){
    const helpContainer=document.getElementById("helpDisplay");
    if(!helpContainer) return;
    helpContainer.innerHTML=`
        <h2>hvordan bruke kalkulatoren?</h2>
        <p><strong>legg til oppføring:</strong> skriv inn navn, beløp, dato og kategori, trykk legg til. Du trenger ikke skrive år; skriver du bare dag (f.eks. “1” eller “01”) brukes inneværende måned. Oppføringer kan være både utgifter og inntekter.</p>
        <p><strong>+14d:</strong> dupliser oppføringer 14 dager frem. Endrer du måneden på en dato, justeres resten av listen automatisk.</p>
        <p><strong>inline editing:</strong> trykk på dato eller beløp i tabellen for å endre direkte uten å åpne et eget vindu.</p>
        <p><strong>detailed view:</strong> denne visningen viser saldoen din etter at utgifter og inntekter på valgt dato er trukket fra/lagt til. Den gir deg en detaljert oversikt over hvordan hver oppføring påvirker saldoen, slik at du kan planlegge økonomien bedre.</p>
        <p><strong>filtrering og kategorier:</strong> du kan filtrere oppføringer etter kategori eller dato for å se spesifikke utgifter/inntekter.</p>
        <p><strong>historikk:</strong> alle oppføringer lagres automatisk, slik at du kan gå tilbake og se tidligere saldo og transaksjoner.</p>
    `;
}

async function renderChangelog(changelogDisplay) {
    if (!changelogDisplay) return;

    try {
        const res = await fetch("changelog.md");
        if(!res.ok) return;

        const text = await res.text();
        changelogDisplay.innerHTML = "";

        // Finn siste oppdateringsdato
        const dateRegex = /\[(\d{2})-(\d{2})-(\d{4})\]/g;
        let latestDate = null;
        let match;
        while ((match = dateRegex.exec(text)) !== null) {
            const [_, d, m, y] = match;
            const dt = new Date(`${y}-${m}-${d}`);
            if (!latestDate || dt > latestDate) latestDate = dt;
        }

        // --- sist oppdatert over dropdown ---
        if (latestDate) {
            const lastUpdated = document.createElement("p");
            lastUpdated.textContent = `Sist oppdatert: ${formatDateReadable(latestDate)} | ${getCurrentTimeString()}`;
            lastUpdated.style.fontWeight = "bold";
            changelogDisplay.insertBefore(lastUpdated, changelogDisplay.firstChild);
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


// --- Date / Time ---
function updateDateTime(){
    const now=new Date();
    //if(dateInfo) dateInfo.textContent=`dagens dato: ${formatDate(now)}`;
    const dateDisplay=document.getElementById("dateDisplay");
    const timeDisplay=document.getElementById("timeDisplay");
    if(dateDisplay) dateDisplay.textContent=formatDateReadable(now);
    if(timeDisplay) timeDisplay.textContent=getCurrentTimeString();
}
setInterval(updateDateTime,1000);
updateDateTime();

// --- Sort ---
const sortSelect=document.getElementById("sortSelect");
sortSelect?.addEventListener("change",()=>{
    const val=sortSelect.value;
    if(val==="date") entries.sort((a,b)=>a.date-b.date);
    if(val==="amount") entries.sort((a,b)=>Number(a.amount)-Number(b.amount));
    renderEntries();
});

// --- Popup funksjoner ---
function openPopup() {
    if (!popup) return;
    popup.style.display = "flex";
}

function closePopup() {
    if (!popup) return;
    popup.style.display = "none";
}

// Åpne popup når ? trykkes
helpBtn?.addEventListener("click", () => {
    openPopup();
});

// Lukk popup når lukk-knapp trykkes
closePopupBtn?.addEventListener("click", () => {
    closePopup();
});

// Lukk popup ved å klikke utenfor innholdet
popup?.addEventListener("click", (e) => {
    if (e.target === popup) {
        closePopup();
    }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      console.log('SW registered', reg);

      // Lytt etter nye SW-versjoner
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Ny oppdatering tilgjengelig
              showUpdateBanner();
            }
          }
        });
      });
    })
    .catch(err => console.error('SW registration failed:', err));
}

// --- Show popup on first visit ---
if (!localStorage.getItem("visitedHelpPopup")) {
    openPopup();
    localStorage.setItem("visitedHelpPopup", "true");
}

document.getElementById('helpBtn').addEventListener('click', () => {
    document.getElementById('popup').classList.add('show');
});

document.getElementById('closePopupBtn').addEventListener('click', () => {
    document.getElementById('popup').classList.remove('show');
});

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

// --- Initial render ---
renderEntries();
updateSluttsum();
updateDetailedView();