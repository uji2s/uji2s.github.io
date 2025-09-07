import { formatMoney, parseDate, formatDate, formatDateReadable, getCurrentTimeString } from './utils.js';

console.log("DEBUG: base.js loaded");

// DOM refs
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

const todayBalanceInput = document.getElementById("todayBalance");
const addTodayBalanceBtn = document.getElementById("addTodayBalanceBtn");

const detailedView = document.getElementById("detailedView");
const showOnlyExpensesDetailed = document.getElementById("showOnlyExpensesDetailed");

const dateInfo = document.getElementById("dateInfo");

let entries = [];

// --- Load entries from localStorage ---
const stored = localStorage.getItem("entries");
if(stored) entries = JSON.parse(stored).map(e=>({...e, date: new Date(e.date)}));

// --- Save to localStorage ---
function saveStorage(){
    localStorage.setItem("entries", JSON.stringify(entries));
}

// --- Update slutt sum ---
function updateSluttsum(){
    if(entries.length===0){
        sluttsumEl.style.display="none";
        return;
    }
    let sum = entries.reduce((acc,e)=>acc+Number(e.amount),0);
    sluttsumEl.style.display="block";
    sluttsumEl.innerHTML = `til overs: <span style="color:${sum>0?'green':sum<0?'red':'yellow'}">${formatMoney(sum)} kr</span>`;
}

// --- Render entries ---
function renderEntries(){
    if(entries.length===0){
        tableEl.style.display="none";
        return;
    } else {
        tableEl.style.display="table";
    }

    entryTableBody.innerHTML="";
    entries.forEach((entry,index)=>{
        const tr = document.createElement("tr");
        tr.classList.add("added");
        const amountColor = entry.amount>0?"green":entry.amount<0?"red":"yellow";
        tr.innerHTML=`
            <td>${formatDate(entry.date)}</td>
            <td>${entry.desc||""}</td>
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
function addEntry(descVal, amountVal, dateVal){
    const desc = descVal ?? nameInput.value.trim();
    const amount = amountVal ?? parseFloat(amountInput.value);
    const date = dateVal ?? parseDate(dateInput.value.trim());
    if(isNaN(amount) || !date) return;

    entries.push({desc, amount, date});
    entries.sort((a,b)=>a.date-b.date);
    saveStorage();
    renderEntries();

    if(!descVal){
        nameInput.value="";
        amountInput.value="";
        dateInput.value="";
    }
}

// --- Add normal entry ---
addBtn.addEventListener("click", ()=>addEntry());

// --- Plus14 / Remove ---
entryTableBody.addEventListener("click",(e)=>{
    const idx = e.target.dataset.index;
    if(e.target.classList.contains("plus14")){
        const original = entries[idx];
        const newDate = new Date(original.date);
        newDate.setDate(newDate.getDate()+14);
        addEntry(original.desc, original.amount, newDate);
    } else if(e.target.classList.contains("remove")){
        entries.splice(idx,1);
        saveStorage();
        renderEntries();
        updateSluttsum();
    }
});

// --- Enter key ---
[nameInput, amountInput, dateInput].forEach(input=>{
    input.addEventListener("keydown",(e)=>{
        if(e.key==="Enter") addEntry();
    });
});

// --- Add today's saldo ---
addTodayBalanceBtn.addEventListener("click", ()=>{
    const val = parseFloat(todayBalanceInput.value);
    if(isNaN(val)){
        alert("dagens saldo må være et tall");
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    const exists = entries.some(e =>
        e.desc.toLowerCase() === "dagens saldo" &&
        e.date.toDateString() === today.toDateString()
    );
    if(exists){
        alert("dagens saldo er allerede lagt til for i dag");
        return;
    }

    addEntry("dagens saldo", val, today);
    todayBalanceInput.value="";
});

// --- Detailed view ---
function updateDetailedView(){
    const onlyExpenses = showOnlyExpensesDetailed.checked;
    let runningTotal = 0;
    const dailyTotals = {};
    
    // sortér entries etter dato
    const sorted = [...entries].sort((a,b)=>a.date-b.date);

    sorted.forEach(e=>{
        runningTotal += e.amount; // alltid oppdater saldo
        const dayStr = formatDateReadable(e.date,true); // dd mmm yyyy
        if(!dailyTotals[dayStr]) dailyTotals[dayStr] = [];

        // bestem om linjen skal vises
        if(onlyExpenses){
            if(e.amount < 0) dailyTotals[dayStr].push(runningTotal);
        } else {
            dailyTotals[dayStr].push(runningTotal);
        }
    });

    detailedView.innerHTML = "";
    for(const day in dailyTotals){
        if(dailyTotals[day].length === 0) continue; // skip hvis ingenting skal vises
        const val = dailyTotals[day][dailyTotals[day].length - 1]; // siste saldo på dagen
        const color = val>0?"green":val<0?"red":"yellow";
        const div = document.createElement("div");
        div.textContent=`${day}: ${formatMoney(val)} kr`;
        div.style.color=color;
        detailedView.appendChild(div);
    }
}


showOnlyExpensesDetailed.addEventListener("change", updateDetailedView);

// --- Update date info using changelog.md ---
async function updateDateInfo(){
    let lastUpdated = "";
    try{
        const res = await fetch("changelog.md");
        if(res.ok){
            const text = await res.text();
            const lines = text.split("\n");
            let latestDate = null;
            const dateRegex = /\[(\d{2})-(\d{2})-(\d{4})\]/;
            lines.forEach(line=>{
                const match = line.match(dateRegex);
                if(match){
                    const [_,d,m,y] = match;
                    const dt = new Date(`${y}-${m}-${d}`);
                    if(!latestDate || dt>latestDate) latestDate = dt;
                }
            });
            if(latestDate){
                const d = latestDate.getDate().toString().padStart(2,"0");
                const m = latestDate.toLocaleString("default",{month:"short"});
                const y = latestDate.getFullYear();
                lastUpdated = `sist oppdatert: ${d} ${m} ${y}`;
            }
        }
    }catch(err){console.error("Kunne ikke lese changelog:",err);}
    
    const today = new Date();
    const day = today.getDate().toString().padStart(2,"0");
    const month = today.toLocaleString("default",{month:"short"});
    const year = today.getFullYear();
    const time = getCurrentTimeString().slice(0,5);

    dateInfo.innerHTML = `${lastUpdated}<br>${time} | ${day} ${month} ${year}`;
}

updateDateInfo();
setInterval(updateDateInfo,60000);

// --- Popup ---
// Sjekk om bruker har besøkt siden før
if(!localStorage.getItem("visitedHelpPopup")){
    popup.style.display = "flex"; // vis popup første gang
    localStorage.setItem("visitedHelpPopup", "true"); // marker at den er vist
}

// Event listener på help-knapp (optional, kan fortsatt åpne popup manuelt senere)
helpBtn.addEventListener("click", () => {
    popup.style.display = "flex";
});

closePopupBtn.addEventListener("click", () => {
    popup.style.display = "none";
});


// --- initial render ---
renderEntries();
updateSluttsum();
