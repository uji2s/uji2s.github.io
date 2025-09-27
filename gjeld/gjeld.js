console.log("DEBUG: gjeld.js loaded");

function formatMoney(val){
    return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,".");
}

const entryTableBody = document.getElementById("entryTableBody");
const addBtn = document.getElementById("addEntryBtn");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const descInput = document.getElementById("desc");
const detailedView = document.getElementById("detailedView");
const sluttsumEl = document.getElementById("sluttsum");

let entries = JSON.parse(localStorage.getItem("entries") || "[]");

function saveStorage(){
    localStorage.setItem("entries", JSON.stringify(entries));
}

function updateSluttsum(){
    const total = entries.reduce((acc,e)=>acc+Number(e.amount||0),0);
    sluttsumEl.textContent = `total gjeld: ${formatMoney(total)} kr`;
}

function updateDetailedView(){
    if(!detailedView) return;
    detailedView.innerHTML="";

    const sumsByName = {};
    entries.forEach(entry=>{
        const name = entry.name||"ukjent";
        sumsByName[name] = (sumsByName[name]||0) + Number(entry.amount||0);
    });

    for(const [name,sum] of Object.entries(sumsByName)){
        const div = document.createElement("div");
        div.textContent = `${name}: ${formatMoney(sum)} kr`;
        div.style.color = sum>0?"green":sum<0?"red":"yellow";
        detailedView.appendChild(div);
    }
}

function renderEntries(){
    entryTableBody.innerHTML="";

    entries.forEach((entry,index)=>{
        const tr=document.createElement("tr");

        const tdName=document.createElement("td");
        tdName.textContent=entry.name||"";
        tdName.classList.add("editable");

        const tdDesc=document.createElement("td");
        tdDesc.textContent=entry.desc||"";
        tdDesc.classList.add("editable");

        const tdAmount=document.createElement("td");
        tdAmount.textContent=`${entry.amount} kr`;
        tdAmount.classList.add("editable");

        const tdActions=document.createElement("td");
        const btnDup=document.createElement("button");
        btnDup.textContent="+";
        btnDup.dataset.index=index;
        const btnRemove=document.createElement("button");
        btnRemove.textContent="x";
        btnRemove.dataset.index=index;
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

function addEntry(){
    const name=(nameInput.value||"").trim();
    const desc=(descInput.value||"").trim();
    const amount=Number(amountInput.value||0);
    if(!name || isNaN(amount)) return;

    entries.push({name,desc,amount});
    saveStorage();
    renderEntries();

    nameInput.value="";
    descInput.value="";
    amountInput.value="";
}

// legg til knapp og enter
addBtn.addEventListener("click",addEntry);
[nameInput,descInput,amountInput].forEach(input=>{
    input.addEventListener("keydown",e=>{
        if(e.key==="Enter") addEntry();
    });
});

function enableInlineEditing(){
    entryTableBody.querySelectorAll("tr").forEach((tr,index)=>{
        ["name","desc","amount"].forEach((field,i)=>{
            const td=tr.children[i];
            td.addEventListener("click",()=>{
                if(td.querySelector("input")) return;
                const input=document.createElement("input");
                input.type="text";
                input.value = field==="amount"?td.textContent.replace(" kr",""):td.textContent;
                input.className="inline-edit-input";
                td.textContent="";
                td.appendChild(input);
                input.focus();
                input.select();

                const finish=()=>{
                    if(field==="name") entries[index].name=input.value.trim();
                    else if(field==="desc") entries[index].desc=input.value.trim();
                    else if(field==="amount") entries[index].amount=Number(input.value.trim()||0);
                    saveStorage();
                    renderEntries();
                };
                input.addEventListener("keydown",e=>{if(e.key==="Enter") finish();});
                input.addEventListener("focusout",finish);
            });
        });
    });

    entryTableBody.querySelectorAll("button").forEach(btn=>{
        btn.onclick=()=>{
            const i=Number(btn.dataset.index);
            if(btn.textContent==="+") entries.push({...entries[i]});
            else if(btn.textContent==="x") entries.splice(i,1);
            saveStorage();
            renderEntries();
        };
    });
}

renderEntries();
