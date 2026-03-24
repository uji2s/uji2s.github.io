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

// --- Restore entries if temp exists ---
const tempEntries = localStorage.getItem("entries_temp");
if(tempEntries) {
    localStorage.setItem("entries", tempEntries);
    localStorage.removeItem("entries_temp");
}


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

navigator.serviceWorker?.addEventListener('message', event => {
    if(event.data?.type === 'REQUEST_ENTRIES') {
        navigator.serviceWorker.controller.postMessage({
            type: 'ENTRIES_DATA',
            entries: localStorage.getItem("entries")
        });
    }
});


// --- Force update SW ---
document.addEventListener("DOMContentLoaded", () => {
    const forceBtn = document.getElementById("forceUpdateBtn");
    if (!forceBtn) return;

    forceBtn.addEventListener("click", async () => {
        console.log("DEBUG: Force update knapp trykket");

        if (!('serviceWorker' in navigator)) return;

        try {
            // Lagre entries midlertidig
            const entriesData = localStorage.getItem("entries");
            if (!entriesData) console.warn("Ingen entries funnet til midlertidig lagring");

            // Hent SW-registrering
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration || !registration.active) {
                console.warn("Ingen aktiv SW registrert");
                return;
            }

            // Send FORCE_UPDATE melding til SW
            registration.active.postMessage({ type: 'FORCE_UPDATE' });

            // Oppdater SW (prøver å hente ny versjon)
            await registration.update();

            // Behold entries etter reload
            localStorage.setItem("entries_temp", entriesData);

            // Reload siden for å bruke ny SW
            window.location.reload();
        } catch (err) {
            console.error("Feil under force update:", err);
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
        tr.dataset.index = String(index); // <--- viktig!

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDate(entry.date);
        tdDate.classList.add("editable", "date-cell");

        const tdDesc = document.createElement("td");
        tdDesc.textContent = entry.desc || "";
        tdDesc.classList.add("editable", "desc-cell");

        const tdAmount = document.createElement("td");
        const amountVal = Number(entry.amount || 0);
        tdAmount.style.color = amountVal > 0 ? "green" : amountVal < 0 ? "red" : "yellow";
        tdAmount.textContent = `${formatMoney(amountVal)} kr`;
        tdAmount.classList.add("editable", "amount-cell");

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

// --- Sorteringsvalg for entries ---
const sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    const sortBy = sortSelect.value;

    // Sjekk at entries eksisterer
    console.log('Sorter etter:', sortBy, entries);

    if (sortBy === 'date') {
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === 'amount') {
      entries.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    } else if (sortBy === 'best') {
      // smart sortering: holder mest mulig penger på konto
      const today = new Date();
      entries.sort((a, b) => {
        const daysA = (new Date(a.date) - today) / (1000 * 60 * 60 * 24);
        const daysB = (new Date(b.date) - today) / (1000 * 60 * 60 * 24);

        const scoreA = (daysA * 10) - parseFloat(a.amount);
        const scoreB = (daysB * 10) - parseFloat(b.amount);

        return scoreB - scoreA; // høyest score sist = mest “gunstig”
      });
    }

    renderEntries(); // Oppdater visningen
    saveStorage && saveStorage(); // lagre om funksjon finnes
  });
}

// --- Inline editing ---
function enableInlineEditing() {
    entryTableBody.querySelectorAll("tr").forEach((tr, index) => {
        const tdDate = tr.children[0];
        const tdAmount = tr.children[2];

        const createInput = (placeholder) => {
            const input = document.createElement("input");
            input.type = "text"; // Safari-safe
            input.value = "";
            input.placeholder = placeholder;
            input.className = "inline-edit-input";
            return input;
        };

        const finishDate = (input) => {
            let val = input.value.trim();
            let original = entries[index].date;
            let newDate = parseDate(val);

            if (!newDate || isNaN(newDate.getTime())) {
                newDate = original instanceof Date ? new Date(original) : new Date();
            }

            entries[index].date = newDate;
        };

        const finishAmount = (input) => {
            let val = input.value.trim().replace(/—/g,'--');
            let num;

            // kalkulasjon
            if (val.startsWith('++')) {
                const delta = parseFloat(val.slice(2).replace(/[^0-9.]/g,""));
                num = isNaN(delta) ? entries[index].amount : entries[index].amount + delta;
            } else if (val.startsWith('--')) {
                const delta = parseFloat(val.slice(2).replace(/[^0-9.]/g,""));
                num = isNaN(delta) ? entries[index].amount : entries[index].amount - delta;
            } else if (val.startsWith('-')) {
                num = parseFloat(val.replace(/[^0-9.-]/g,""));
                if (isNaN(num)) num = entries[index].amount;
            } else {
                // inline kalkulasjon: eval trygg-ish med bare tall og +-*/.
                try {
                    const safeVal = val.replace(/[^0-9+\-*/().]/g,"");
                    num = eval(safeVal);
                    if (isNaN(num)) num = entries[index].amount;
                } catch {
                    num = entries[index].amount;
                }
            }

            entries[index].amount = num;

            // spesialregel for dagens saldo
            if ((entries[index].desc || "").toLowerCase() === "dagens saldo") {
                const today = new Date();
                today.setFullYear(2000, 0, 1); // alltid 1. januar 2000
                today.setHours(0,0,0,0);
                entries[index].date = today;
            }
        };

        const setupInline = (td, finishFn, isDate = false) => {
            td.addEventListener("click", () => {
                if (td.querySelector("input")) return;

                const placeholder = td.textContent;
                const input = createInput(placeholder);

                td.textContent = "";
                td.appendChild(input);

                input.focus({ preventScroll: true });
                input.select();

                const finish = () => {
                    if (input.value.trim() === "") {
                        if (isDate) {
                            const original = entries[index].date;
                            entries[index].date = original instanceof Date ? new Date(original) : new Date();
                        }
                    } else {
                        finishFn(input);
                    }

                    // --- 🔥 SORTERING ---
                    entries.sort((a, b) => {
                        // dagens saldo alltid først
                        if ((a.desc || "").toLowerCase() === "dagens saldo") return -1;
                        if ((b.desc || "").toLowerCase() === "dagens saldo") return 1;

                        // desember tar år med
                        if (a.date.getMonth() === 11 && b.date.getMonth() === 11) {
                            return a.date - b.date;
                        }

                        const monthDayA = a.date.getMonth()*100 + a.date.getDate();
                        const monthDayB = b.date.getMonth()*100 + b.date.getDate();
                        return monthDayA - monthDayB;
                    });

                    saveStorage();
                    renderEntries();
                };

                const keyListener = (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        finish();
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        renderEntries();
                    }
                };

                input.addEventListener("keydown", keyListener);
                input.addEventListener("focusout", finish);
            });
        };

        setupInline(tdDate, finishDate, true);
        setupInline(tdAmount, finishAmount, false);
    });
}


// Patch render
const originalRenderEntries = renderEntries;
renderEntries = function() {
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

    // Sorter entries etter dato
    const sorted = [...entries].sort((a, b) => a.date - b.date);

    sorted.forEach(entry => {
        const isExpense = entry.amount < 0;
        const dayStr = formatDateReadable(entry.date, true);

        if (!dailyTotals[dayStr]) {
            dailyTotals[dayStr] = {
                all: null,
                expensesOnly: null
            };
        }

        // Oppdater running total for alle
        runningTotal += Number(entry.amount || 0);
        dailyTotals[dayStr].all = runningTotal;

        // Oppdater expensesOnly kun for negative beløp
        if (isExpense) {
            // Hvis dette er første negative entry i dagen, start med running total før denne expense
            if (dailyTotals[dayStr].expensesOnly === null) {
                // Finn runningTotal før denne expense
                let totalBefore = 0;
                for (const e of sorted) {
                    if (e.date > entry.date) break;
                    if (e.amount < 0) break;
                    totalBefore += e.amount || 0;
                }
                dailyTotals[dayStr].expensesOnly = runningTotal; // eller totalBefore? check
            } else {
                dailyTotals[dayStr].expensesOnly = runningTotal;
            }
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
    helpContainer.innerHTML = `
    <h2>hvordan bruke kalkulatoren?</h2>
    <p><strong>legg til oppføring:</strong> skriv inn navn, beløp, dato og kategori, trykk legg til. Du trenger ikke skrive år; skriver du bare dag (f.eks. “1” eller “01”) brukes inneværende måned. Oppføringer kan være både utgifter og inntekter.</p>
    <p><strong>+14d:</strong> dupliser oppføringer 14 dager frem ved å trykke +14d-knappen. Endrer du måneden på en dato, justeres resten av listen automatisk.</p>
    <p><strong>(+):</strong> dupliser oppføringen én gang på samme dato eller like etter, uten å endre datoen med 14 dager. Praktisk for å lage flere like poster raskt.</p>
    <p><strong>inline editing:</strong> trykk på dato eller beløp i tabellen for å endre direkte uten å åpne et eget vindu. Du kan nå også:</p>
    <ul>
        <li>Redigere beløp direkte.</li>
        <li>Bruke <strong>++500</strong> for å legge til 500 på eksisterende verdi.</li>
        <li>Bruke <strong>--500</strong> for å trekke fra 500 på eksisterende verdi.</li>
        <li>Bruke <strong>-500</strong> for å sette verdien direkte til negativ.</li>
        <li>Bruke <strong>500</strong> for å sette verdien direkte til positiv.</li>
        <li>Fjerne eller legge til verdi inline uten å åpne nytt vindu.</li>
    </ul>
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
closePopupBtn?.addEventListener("click", () => {
    popup.style.display = "none";
});

clearCacheBtn?.addEventListener("click", () => {
    if (confirm("Er du sikker på at du vil slette ALL cache inkludert tabellen?")) {
        // Slett entries i localStorage
        localStorage.removeItem("entries");
        localStorage.removeItem("entries_temp");

        // Oppdater tabellen
        entries = [];
        renderEntries();
        updateSluttsum();
        updateDetailedView();

        // Send CLEAR_CACHE til SW hvis den finnes
        navigator.serviceWorker.controller?.postMessage('CLEAR_CACHE');
    }
});

// --- DEV: Force Refresh uten å slette tabeller ---
forceRefreshBtn?.addEventListener("click", async () => {
        // Avregistrer service workers
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let reg of regs) {
                await reg.unregister();
            }
        }

        // Refresh siden for å hente fersk kode
        location.reload(true);
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

// --- Kompakt binær pakking for eksport/import ---
// Format per entry: [day(1), month(1), year-2000(1), amount*100 int32BE(4), descLen(1), desc(N)]
// ~78% kortere enn JSON+base64

const PACK_EPOCH = 2000;

function packEntries(entries) {
    const parts = [];
    const enc = new TextEncoder();
    for (const e of entries) {
        const d = e.date instanceof Date ? e.date : new Date(e.date);
        const descBytes = enc.encode(e.desc || "");
        const buf = new Uint8Array(8 + descBytes.length);
        buf[0] = d.getDate();
        buf[1] = d.getMonth();        // 0-11
        buf[2] = d.getFullYear() - PACK_EPOCH;
        const af = Math.round(Number(e.amount) * 100); // fixed-point cents
        buf[3] = (af >>> 24) & 0xff;
        buf[4] = (af >>> 16) & 0xff;
        buf[5] = (af >>> 8)  & 0xff;
        buf[6] = af & 0xff;
        buf[7] = descBytes.length;
        buf.set(descBytes, 8);
        parts.push(buf);
    }
    const total = parts.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
}

function unpackEntries(bytes) {
    const result = [];
    const dec = new TextDecoder();
    let i = 0;
    while (i < bytes.length) {
        if (i + 8 > bytes.length) break; // guard against corrupt data
        const day   = bytes[i];
        const month = bytes[i + 1];
        const year  = bytes[i + 2] + PACK_EPOCH;
        // Reinterpret 4 bytes as signed int32
        const af = (bytes[i+3] << 24) | (bytes[i+4] << 16) | (bytes[i+5] << 8) | bytes[i+6];
        const amount = af / 100;
        const descLen = bytes[i + 7];
        if (i + 8 + descLen > bytes.length) break; // guard
        const desc = dec.decode(bytes.slice(i + 8, i + 8 + descLen));
        result.push({ desc, amount, date: new Date(year, month, day) });
        i += 8 + descLen;
    }
    return result;
}

function encodeToString(bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
}

function decodeFromString(str) {
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

// --- Eksport ---
function exportEntriesToBase64() {
    if (entries.length === 0) {
        alert("Ingen oppføringer å eksportere.");
        return;
    }

    const packed = encodeToString(packEntries(entries));

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(packed).then(() => {
            alert(`Kopiert til utklippstavlen (${packed.length} tegn)`);
        }).catch(() => {
            legacy_copy(packed);
            alert(`Kopiert til utklippstavlen (${packed.length} tegn)`);
        });
    } else {
        legacy_copy(packed);
        alert(`Kopiert til utklippstavlen (${packed.length} tegn)`);
    }
}

// fallback for iOS Safari
function legacy_copy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
}

// --- Import ---
function importEntriesFromBase64() {
    if (window.innerWidth <= 768) { // mobil
        const ta = document.createElement("textarea");
        ta.placeholder = "Lim inn eksportstrengen her";
        ta.style.cssText = "width:90%;height:100px;display:block;margin:10px auto";
        document.body.appendChild(ta);
        ta.focus();

        const btn = document.createElement("button");
        btn.textContent = "Importer";
        btn.style.cssText = "display:block;margin:10px auto";
        document.body.appendChild(btn);

        btn.addEventListener("click", () => {
            const val = ta.value.trim();
            ta.remove();
            btn.remove();
            if (val) tryImport(val);
        });
    } else {
        const val = prompt("Lim inn eksportstrengen her:");
        if (val) tryImport(val.trim());
    }

    function tryImport(str) {
        try {
            // støtter både ny kompakt og gammel JSON-base64
            let imported;
            try {
                imported = unpackEntries(decodeFromString(str));
                if (imported.length === 0) throw new Error("tom");
            } catch {
                // prøv gammelt JSON-format som fallback
                const binaryStr = atob(str);
                const uint8 = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
                const jsonStr = new TextDecoder().decode(uint8);
                const parsed = JSON.parse(jsonStr);
                if (!Array.isArray(parsed)) throw new Error("Ugyldig format");
                imported = parsed.map(e => ({ ...e, date: e.date ? new Date(e.date) : new Date() }));
            }

            entries = imported;
            saveStorage();
            renderEntries();
            updateSluttsum();
            updateDetailedView();
            alert(`Import fullført! ${entries.length} oppføringer lastet inn.`);
        } catch (err) {
            console.error(err);
            alert("Kunne ikke importere — sjekk at strengen er komplett og korrekt.");
        }
    }
}


// --- Mass import fra CSV-format (navn,sum,dato) ---
function massImportCSV() {
    let input;
    if(window.innerWidth <= 768){ // mobil
        const ta = document.createElement("textarea");
        ta.placeholder = "Lim inn liste her: navn,sum,dato (f.eks. maximat,-141,0403)";
        ta.style.width="90%";
        ta.style.height="150px";
        ta.style.display="block";
        ta.style.margin="10px auto";
        document.body.appendChild(ta);
        ta.focus();

        const btn = document.createElement("button");
        btn.textContent="Importer";
        btn.style.display="block";
        btn.style.margin="10px auto";
        document.body.appendChild(btn);

        btn.addEventListener("click", ()=>{
            input = ta.value.trim();
            ta.remove();
            btn.remove();
            if(!input) return;
            tryMassImport(input);
        });

    } else { // desktop
        input = prompt("Skriv inn: navn, sum, og dato (f.eks. maximat,-141,0403)\nÉn entry per linje\nHusk 0 i måned! 0101 blir 1. Jan");
        if(!input) return;
        tryMassImport(input);
    }

    function tryMassImport(str){
        try{
            const lines = str.split(/\r?\n/).filter(l=>l.trim()!=="");
            const currentYear = new Date().getFullYear();

            lines.forEach(line=>{
                const parts = line.split(",");
                if(parts.length < 3) return; // hopp over ugyldige linjer

                const name = parts[0].trim();
                let amount = parseFloat(parts[1].trim());
                if(isNaN(amount)) amount = 0;

                const dateStr = parts[2].trim();
                let day = parseInt(dateStr.slice(0,2),10);
                let month = parseInt(dateStr.slice(2,4),10)-1; // JS months 0-11
                if(isNaN(day)||isNaN(month)) {
                    day = new Date().getDate();
                    month = new Date().getMonth();
                }
                const date = new Date(currentYear, month, day);

                addEntry(name, amount, date);
            });

            renderEntries();
            updateSluttsum();
            updateDetailedView();
            //alert("Mass import fullført! " + lines.length + " linjer lagt til.");

        } catch(err){
            console.error(err);
            alert("Noe gikk galt under importen, sjekk formatet (navn,sum,dato).");
        }
    }
}

// --- Alle handlingsknapper i én felles flex-container ---
function setupActionButtons() {
    if (document.getElementById("actionBtnRow")) return;

    const row = document.createElement("div");
    row.id = "actionBtnRow";
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0;";

    const btnExport = document.createElement("button");
    btnExport.id = "exportBase64Btn";
    btnExport.textContent = "eksporter liste";
    btnExport.addEventListener("click", exportEntriesToBase64);

    const btnImport = document.createElement("button");
    btnImport.id = "importBase64Btn";
    btnImport.textContent = "importer liste";
    btnImport.addEventListener("click", importEntriesFromBase64);

    const btnMass = document.createElement("button");
    btnMass.id = "massImportBtn";
    btnMass.textContent = "klarna moment";
    btnMass.addEventListener("click", massImportCSV);

    row.appendChild(btnExport);
    row.appendChild(btnImport);
    row.appendChild(btnMass);

    const existingExportBtn = document.getElementById("exportBtn");
    if (existingExportBtn) {
        existingExportBtn.insertAdjacentElement("afterend", row);
    } else {
        tableEl?.parentElement?.insertBefore(row, tableEl);
    }
}

setupActionButtons();

// --- Init ---
renderEntries();
updateSluttsum();
updateDetailedView();