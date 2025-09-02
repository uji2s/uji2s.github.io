console.log("DEBUG: base.js loaded");

let entries = [];

const descInput = document.getElementById("desc");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const addEntryBtn = document.getElementById("addEntryBtn");
const entryTableBody = document.getElementById("entryTableBody");
const sluttsum = document.getElementById("sluttsum");
const tilOversAmount = document.getElementById("tilOversAmount");
const sortSelect = document.getElementById("sortSelect");
const helpBtn = document.getElementById("helpBtn");
const popup = document.getElementById("popup");
const closePopupBtn = document.getElementById("closePopupBtn");
const dateDisplay = document.getElementById("dateDisplay");
const timeDisplay = document.getElementById("timeDisplay");

// klokke
function updateClock(){
    const now = new Date();
    const months = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];
    dateDisplay.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
    timeDisplay.textContent = now.toTimeString().slice(0,5);
}
setInterval(updateClock,1000);
updateClock();

// popup
helpBtn.onclick = () => popup.style.display="flex";
closePopupBtn.onclick = () => popup.style.display="none";

// add entry
function addEntry(desc, amount, date){
    const entry = {desc: desc||"", amount: parseFloat(amount), date: parseDate(date)};
    entries.push(entry);
    renderEntries();
}

addEntryBtn.onclick = () => addEntry(descInput.value, amountInput.value, dateInput.value);
[descInput, amountInput, dateInput].forEach(inp => inp.addEventListener("keydown", e=>{
    if(e.key==="Enter") addEntry(descInput.value, amountInput.value, dateInput.value);
}));

// render
function renderEntries(){
    entryTableBody.innerHTML="";
    entries.sort((a,b)=>a.date-b.date);
    entries.forEach(entry=>{
        const tr = document.createElement("tr");
        tr.classList.add("added");
        tr.innerHTML=`
            <td>${formatDate(entry.date)}</td>
            <td>${entry.desc}</td>
            <td style="color:${entry.amount>0?'#0f0':'#f00'}">${formatMoney(entry.amount)}</td>
        `;
        entryTableBody.appendChild(tr);
    });
    updateSluttsum();
}

// update til overs
function updateSluttsum(){
    if(entries.length===0){
        sluttsum.style.display="none";
        return;
    }
    sluttsum.style.display="block";
    const sum = entries.reduce((a,b)=>a+b.amount,0);
    tilOversAmount.textContent = formatMoney(sum);
    tilOversAmount.style.color = sum>0?"#0f0":"#f00";
}
