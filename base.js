// base.js
import { formatMoney, parseDate, formatDate, addDays, calculateSum, getAmountColor } from './utils.js';
console.log("DEBUG: base.js loaded");

document.addEventListener("DOMContentLoaded", ()=>{

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

    let entries = [];

    // --- load from localStorage ---
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
        const sum = calculateSum(entries);
        sluttsumEl.style.display = "block";
        sluttsumEl.innerHTML = `til overs: <span style="color:${getAmountColor(sum)}">${formatMoney(sum)} kr</span>`;
    }

    function renderEntries(){
        if(entries.length === 0){
            tableEl.style.display = "none";
            return;
        } else {
            tableEl.style.display = "table";
        }

        entryTableBody.innerHTML = "";
        entries.forEach((entry, index) => {
            const tr = document.createElement("tr");
            tr.classList.add("added");
            tr.innerHTML = `
                <td>${formatDate(entry.date)}</td>
                <td>${entry.desc || ""}</td>
                <td style="color:${getAmountColor(entry.amount)}">${formatMoney(Number(entry.amount))}</td>
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
        updateUI();

        if(!descVal){
            nameInput.value = "";
            amountInput.value = "";
            dateInput.value = "";
        }
    }

    function updateUI(){
        saveStorage();
        renderEntries();
        updateSluttsum();
    }

    function togglePopup(show){
        popup.style.display = show ? "flex" : "none";
    }

    addBtn.addEventListener("click", ()=>addEntry());

    entryTableBody.addEventListener("click",(e)=>{
        if(e.target.classList.contains("plus14")){
            const idx = e.target.dataset.index;
            const original = entries[idx];
            addEntry(original.desc, original.amount, addDays(original.date, 14));
        } else if(e.target.classList.contains("remove")){
            const idx = e.target.dataset.index;
            entries.splice(idx,1);
            updateUI();
        }
    });

    [nameInput, amountInput, dateInput].forEach(input=>{
        input.addEventListener("keydown",(e)=>{
            if(e.key==="Enter") addEntry();
        });
    });

    // --- popup ---
    helpBtn.addEventListener("click", ()=>togglePopup(true));
    closePopupBtn.addEventListener("click", ()=>togglePopup(false));
    clearCacheBtn.addEventListener("click", ()=>{
        entries=[];
        updateUI();
        togglePopup(false);
    });

    // initial render
    renderEntries();
    updateSluttsum();
});
