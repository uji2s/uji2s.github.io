console.log("DEBUG: base.js loaded");

// --- utils functions ---
function formatMoney(val){
    return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseDate(str){
    const months = {"jan":0,"feb":1,"mar":2,"apr":3,"mai":4,"jun":5,"jul":6,"aug":7,"sep":8,"okt":9,"nov":10,"des":11};
    str = str.toLowerCase().replace(/\./g,"").trim();
    let day, month, year;
    if(str.match(/^\d{1,2}$/)){
        day = parseInt(str);
        month = new Date().getMonth();
        year = new Date().getFullYear();
    } else {
        let parts = str.split(" ");
        day = parseInt(parts[0]);
        month = months[parts[1].substr(0,3)] ?? new Date().getMonth();
        year = new Date().getFullYear();
    }
    return new Date(year, month, day);
}

function formatDate(date){
    const months = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];
    let d = date.getDate().toString().padStart(2,"0");
    let m = months[date.getMonth()];
    return `${d}. ${m}`;
}

// --- main ---
document.addEventListener("DOMContentLoaded", ()=>{
    const entryTableBody = document.getElementById("entryTableBody");
    const tableEl = entryTableBody.parentElement;
    const sluttsumEl = document.getElementById("sluttsum");
    const addBtn = document.getElementById("addEntryBtn");
    const nameInput = document.getElementById("desc");
    const amountInput = document.getElementById("amount");
    const dateInput = document.getElementById("date");
    const categoryInput = document.getElementById("category");
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
        let sum = entries.reduce((acc,e)=>acc+Number(e.amount),0);
        sluttsumEl.style.display = "block";
        sluttsumEl.innerHTML = `til overs: <span style="color:${sum>0?'green':sum<0?'red':'yellow'}">${formatMoney(sum)} kr</span>`;
    }

    function renderEntries(){
    if(entries.length===0){
        tableEl.style.display = "none";
        return;
    } else {
        tableEl.style.display = "table";
    }

    const showCategory = entries.some(e=>e.category && e.category.trim() !== "");

    entryTableBody.innerHTML="";
    entries.forEach((entry,index)=>{
        const tr = document.createElement("tr");
        tr.classList.add("added");

        let amountColor = entry.amount > 0 ? "green" : entry.amount < 0 ? "red" : "yellow";

        tr.innerHTML=`
            <td>${formatDate(entry.date)}</td>
            <td>${entry.desc || ""}</td>
            <td style="color:${amountColor}">${formatMoney(Number(entry.amount))}</td>
            ${showCategory ? `<td>${entry.category || ""}</td>` : ""}
            <td>
                <button class="plus14" data-index="${index}">+14d</button>
                <button class="remove" data-index="${index}">fjern</button>
            </td>
        `;
        entryTableBody.appendChild(tr);
    });
}


    function addEntry(descVal, amountVal, dateVal, categoryVal){
        const desc = descVal ?? nameInput.value.trim();
        const amount = amountVal ?? parseFloat(amountInput.value);
        const date = dateVal ?? parseDate(dateInput.value.trim());
        const category = categoryVal ?? categoryInput.value.trim();

        if(isNaN(amount) || !date) return;

        const entry = {desc, amount, date, category};
        entries.push(entry);
        entries.sort((a,b)=>a.date-b.date);
        saveStorage();
        renderEntries();
        updateSluttsum();

        if(!descVal){
            nameInput.value = "";
            amountInput.value = "";
            dateInput.value = "";
            categoryInput.value = "";
        }
    }

    addBtn.addEventListener("click", ()=>addEntry());

    entryTableBody.addEventListener("click",(e)=>{
        if(e.target.classList.contains("plus14")){
            const idx = e.target.dataset.index;
            const original = entries[idx];
            const newDate = new Date(original.date);
            newDate.setDate(newDate.getDate()+14);
            addEntry(original.desc, original.amount, newDate, original.category);
        } else if(e.target.classList.contains("remove")){
            const idx = e.target.dataset.index;
            entries.splice(idx,1);
            saveStorage();
            renderEntries();
            updateSluttsum();
        }
    });

    [nameInput, amountInput, dateInput, categoryInput].forEach(input=>{
        input.addEventListener("keydown",(e)=>{
            if(e.key==="Enter") addEntry();
        });
    });

    // --- popup ---
    helpBtn.addEventListener("click", ()=>popup.style.display="flex");
    closePopupBtn.addEventListener("click", ()=>popup.style.display="none");
    clearCacheBtn.addEventListener("click", ()=>{
        entries=[];
        saveStorage();
        renderEntries();
        updateSluttsum();
        popup.style.display="none";
    });

    // initial render
    renderEntries();
    updateSluttsum();
});
