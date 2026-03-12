// gjeld.js
const STORAGE_KEY = "gjeld_entries";

const entryTableBody = document.getElementById("entryTableBody");
const addBtn = document.getElementById("addEntryBtn");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const descInput = document.getElementById("desc");
const detailedView = document.getElementById("detailedView");
const sluttsumEl = document.getElementById("sluttsum");

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// sørg for numbers
entries = entries.map(e => ({
    name: e.name || "",
    desc: e.desc || "",
    amount: Number(e.amount) || 0
}));

// --- helpers ---
function saveStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatMoney(val){
    return Number(val)
        .toFixed(2)
        .replace(".", ",")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getAmountColor(amount){
    return amount > 0 ? "red" : amount < 0 ? "green" : "yellow";
}

// --- total ---
function updateSluttsum() {
    const total = entries.reduce((acc, e) => acc + Number(e.amount || 0), 0);

    sluttsumEl.textContent = "total gjeld: ";

    const span = document.createElement("span");
    span.textContent = `${formatMoney(total)} kr`;
    span.style.color = getAmountColor(total);

    sluttsumEl.appendChild(span);
}

// --- detailed ---
function updateDetailedView() {
    if(!detailedView) return;

    detailedView.innerHTML = "";

    const totals = {};

    entries.forEach(entry => {
        const name = entry.name || "ukjent";
        const amount = Number(entry.amount || 0);

        if(!totals[name]) {
            totals[name] = 0;
        }

        totals[name] += amount;
    });

    Object.entries(totals).forEach(([name, amount]) => {

        const div = document.createElement("div");

        div.textContent = `${name}: ${formatMoney(amount)} kr`;
        div.style.color = getAmountColor(amount);

        detailedView.appendChild(div);
    });
}

// --- render ---
function renderEntries() {
    entryTableBody.innerHTML = "";

    entries.forEach((entry, index) => {

        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = entry.name;
        tdName.classList.add("editable");

        const tdDesc = document.createElement("td");
        tdDesc.textContent = entry.desc;
        tdDesc.classList.add("editable");

        const tdAmount = document.createElement("td");
        const amount = Number(entry.amount || 0);
        tdAmount.textContent = `${formatMoney(amount)} kr`;
        tdAmount.style.color = getAmountColor(amount);
        tdAmount.classList.add("editable");

        const tdActions = document.createElement("td");

        const btnDup = document.createElement("button");
        btnDup.textContent = "+";
        btnDup.dataset.index = index;

        const btnRemove = document.createElement("button");
        btnRemove.textContent = "fjern";
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

// --- add ---
function addEntry() {

    const name = (nameInput.value || "").trim();
    const desc = (descInput.value || "").trim();
    const amount = parseFloat(amountInput.value);

    if(!name || isNaN(amount)) return;

    entries.push({
        name,
        desc,
        amount
    });

    saveStorage();
    renderEntries();

    nameInput.value = "";
    descInput.value = "";
    amountInput.value = "";
}

// --- inline editing ---
function enableInlineEditing() {

    entryTableBody.querySelectorAll("tr").forEach((tr, index) => {

        ["name","desc","amount"].forEach((field,i)=>{

            const td = tr.children[i];

            td.addEventListener("click",()=>{

                if(td.querySelector("input")) return;

                const input = document.createElement("input");
                input.type = "text";

                if(field==="amount"){
                    input.value = entries[index].amount;
                } else {
                    input.value = entries[index][field];
                }

                input.className = "inline-edit-input";

                td.textContent="";
                td.appendChild(input);

                input.focus();
                input.select();

                const finish = ()=>{

                    if(field==="name"){
                        entries[index].name = input.value.trim();
                    }

                    if(field==="desc"){
                        entries[index].desc = input.value.trim();
                    }

                    if(field==="amount"){
                        entries[index].amount = parseFloat(input.value.trim()) || 0;
                    }

                    saveStorage();
                    renderEntries();
                };

                input.addEventListener("keydown", e=>{
                    if(e.key==="Enter") finish();
                });

                input.addEventListener("focusout", finish);
            });

        });

    });

    entryTableBody.querySelectorAll("button").forEach(btn=>{

        btn.onclick = ()=>{

            const i = Number(btn.dataset.index);

            if(btn.textContent==="+"){
                entries.push({...entries[i]});
            }

            if(btn.textContent==="fjern"){
                entries.splice(i,1);
            }

            saveStorage();
            renderEntries();
        };

    });
}

// --- events ---
addBtn?.addEventListener("click", addEntry);

[nameInput, descInput, amountInput].forEach(inp=>{
    inp?.addEventListener("keydown", e=>{
        if(e.key==="Enter") addEntry();
    });
});

// --- init ---
renderEntries();