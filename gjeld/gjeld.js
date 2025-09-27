// gjeld.js
const STORAGE_KEY = "gjeld_entries";

const entryTableBody = document.getElementById("entryTableBody");
const addBtn = document.getElementById("addEntryBtn");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const descInput = document.getElementById("desc");
const detailedView = document.getElementById("detailedView");

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// --- Hjelpefunksjoner ---
function saveStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatMoney(val){
    return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getAmountColor(amount){
    return amount > 0 ? "green" : amount < 0 ? "red" : "yellow";
}

// --- Oppdater total gjeld ---
function updateSluttsum() {
    const total = entries.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    document.getElementById("sluttsum").textContent = `total gjeld: ${formatMoney(total)} kr`;
}

// --- Detailed view ---
function updateDetailedView() {
    if(!detailedView) return;
    detailedView.innerHTML = "";

    entries.forEach(entry => {
        const div = document.createElement("div");
        div.textContent = `${entry.name}: ${formatMoney(entry.amount)} kr`;
        div.style.color = getAmountColor(entry.amount);
        detailedView.appendChild(div);
    });
}

// --- Render tabell ---
function renderEntries() {
    entryTableBody.innerHTML = "";

    entries.forEach((entry, index) => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = entry.name;
        tdName.classList.add("editable", "name-cell");

        const tdDesc = document.createElement("td");
        tdDesc.textContent = entry.desc;
        tdDesc.classList.add("editable", "desc-cell");

        const tdAmount = document.createElement("td");
        tdAmount.textContent = `${entry.amount} kr`;
        tdAmount.classList.add("editable", "amount-cell");

        const tdActions = document.createElement("td");
        const btnDup = document.createElement("button");
        btnDup.textContent = "+";
        btnDup.dataset.index = index;
        const btnRemove = document.createElement("button");
        btnRemove.textContent = "x";
        btnRemove.dataset.index = index;
        tdActions.appendChild(btnDup);
        tdActions.appendChild(btnRemove);

        tr.appendChild(tdName);
        tr.appendChild(tdDesc);
        tr.appendChild(tdAmount);
        tr.appendChild(tdActions);

        entryTableBody.appendChild(tr);
    });

    updateSluttsum();
    updateDetailedView();
    enableInlineEditing();
}

// --- Legg til ny rad ---
function addEntry() {
    const name = (nameInput.value || "").trim();
    const desc = (descInput.value || "").trim();
    const amount = Number(amountInput.value || 0);

    if(!name || isNaN(amount)) return;

    entries.push({ name, desc, amount });
    saveStorage();
    renderEntries();

    nameInput.value = "";
    descInput.value = "";
    amountInput.value = "";
}

// --- Inline editing og knapper ---
function enableInlineEditing() {
    entryTableBody.querySelectorAll("tr").forEach((tr, index) => {
        ["name","desc","amount"].forEach((field,i)=>{
            const td = tr.children[i];
            td.addEventListener("click",()=>{
                if(td.querySelector("input")) return;
                const input = document.createElement("input");
                input.type = "text";
                if(field==="amount") input.value = td.textContent.replace(" kr","");
                else input.value = td.textContent;
                input.className = "inline-edit-input";
                td.textContent="";
                td.appendChild(input);
                input.focus();
                input.select();

                const finish = ()=>{
                    if(field==="name") entries[index].name=input.value.trim();
                    else if(field==="desc") entries[index].desc=input.value.trim();
                    else if(field==="amount") entries[index].amount=Number(input.value.trim()||0);
                    saveStorage();
                    renderEntries();
                };
                input.addEventListener("keydown", e=>{if(e.key==="Enter") finish();});
                input.addEventListener("focusout", finish);
            });
        });
    });

    entryTableBody.querySelectorAll("button").forEach(btn=>{
        btn.onclick=()=>{
            const i = Number(btn.dataset.index);
            if(btn.textContent==="+") entries.push({...entries[i]});
            else if(btn.textContent==="x") entries.splice(i,1);
            saveStorage();
            renderEntries();
        };
    });
}

// --- Event listeners ---
addBtn?.addEventListener("click", addEntry);
["Enter"].forEach(key=>{
    [nameInput, descInput, amountInput].forEach(inp=>{
        inp.addEventListener("keydown", e=>{
            if(e.key===key) addEntry();
        });
    });
});

renderEntries();
