/* ===== INIT & DICT ===== */
const SIZE = 15;
const STORAGE_KEY = "wf_boards";
let boards = {};
let current = null;
let dictionary = [];

const LETTER_VALUES = {A:1,B:4,C:10,D:1,E:1,F:2,G:2,H:3,I:1,J:4,K:3,L:2,M:2,N:1,O:2,P:4,R:1,S:1,T:1,U:4,V:5,Y:8,Æ:4,Ø:4,Å:4,"?":0};

const DEFAULT_BOARD = [
["tw","","","","tl","","","","tw","","","","tl","","tw"],
["","dw","","","","dl","","dl","","","","dw","","",""],
["","","dw","","","","tl","","tl","","","","dw","",""],
["","dl","","dw","","","","","","dw","","dl","","",""],
["tl","","","","dl","","","","","","dl","","","","tl"],
["","","","","","","","","","","","","","",""],
["","","tl","","","","","","","","","","tl","",""],
["","","","","","","dw","","dw","","","","","",""],
["","","tl","","","","","","","","","","tl","",""],
["","","","","","","","","","","","","","",""],
["tl","","","","dl","","","","","","dl","","","","tl"],
["","dl","","dw","","","","","","dw","","dl","","",""],
["","","dw","","","","tl","","tl","","","","dw","",""],
["","dw","","","","dl","","dl","","","","dw","","",""],
["tw","","","","tl","","","","tw","","","","tl","","tw"],
].map(r=>r.map(b=>({letter:"", bonus:b||"none"})));

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
    await loadDictionary();
    loadBoards();
    bindUI();

    if(!Object.keys(boards).length) createBoard("Standard");
    else switchBoard(Object.keys(boards)[0]);

    renderGuide();
});

async function loadDictionary(){
    const res = await fetch("dict_no.txt");
    const text = await res.text();
    dictionary = text.split("\n").map(w=>w.trim().toUpperCase()).filter(Boolean);
}

/* ===== STATE ===== */
function emptyGrid(){return Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>({letter:"",bonus:"none"})))}

function createBoard(name){
    if(!name) return;
    boards[name] = {grid: emptyGrid(), rack:""};
    save();
    updateSelect();
    switchBoard(name);
}

function switchBoard(name){
    current = name;
    renderBoard();
    document.getElementById("rackInput").value = boards[name].rack;
    updateSuggestions();
}

function scoreWord(word){
    let score=0;
    for(const c of word) score+=LETTER_VALUES[c]||0;
    return score;
}

/* ===== RENDER ===== */
function renderBoard(){
    const table = document.getElementById("board");
    table.innerHTML = "";

    boards[current].grid.forEach(row=>{
        const tr=document.createElement("tr");
        row.forEach(cell=>{
            const td=document.createElement("td");
            const input=document.createElement("input");
            input.className=`cell bonus-${cell.bonus}` + (cell.letter?" filled":"");
            input.maxLength=3;
            input.value=displayValue(cell);

            input.onblur=()=>{
                parseCell(input.value,cell);
                input.className=`cell bonus-${cell.bonus}` + (cell.letter?" filled":"");
                input.value=displayValue(cell);
                save();
            };

            td.appendChild(input);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

function displayValue(cell){
    if(cell.letter) return cell.letter;   // bokstav vises alene
    if(cell.bonus && cell.bonus!=="none") return cell.bonus.toUpperCase(); // TW/DW osv vises hvis tom
    return "";
}

/* ===== PARSING ===== */
function parseCell(val, cell){
    const v = val.trim().toUpperCase();

    if(!v || v==="RST"){  // tom eller reset
        cell.letter="";
        cell.bonus="none";
        return;
    }

    // bare bonus skrevet i tom rute
    if(["DL","TL","DW","TW"].includes(v)){
        cell.bonus=v.toLowerCase();
        cell.letter="";
        return;
    }

    // bokstav + evt bonus
    const m = v.match(/^([A-ZÆØÅ?])\s*(DL|TL|DW|TW|\*)?$/);
    if(m){
        cell.letter=m[1];
        // beholder eksisterende bonus hvis ingen bonus spesifisert
        if(m[2]) cell.bonus = m[2]==="*"?"dw":m[2].toLowerCase();
        // ellers beholder cell.bonus slik den var
    }
}

/* ===== SUGGESTIONS ===== */
function updateSuggestions(){
    const rack=boards[current].rack.toUpperCase();
    const out=document.getElementById("suggestions");
    if(!rack){out.innerHTML="";return;}

    const counts={};
    for(const c of rack) counts[c]=(counts[c]||0)+1;

    const results=[];
    for(const word of dictionary){
        if(!canBuild(word,counts)) continue;
        results.push({word,score:scoreWord(word)});
    }

    results.sort((a,b)=>b.score!==a.score?b.score-a.score:b.word.length-a.word.length);

    out.innerHTML=results.slice(0,50).map(r=>`• <b>${r.word}</b> <span style="color:#aaa">(${r.score})</span>`).join("<br>");
}

function canBuild(word,counts){
    const temp={...counts};
    for(const c of word){
        if(temp[c]) temp[c]--;
        else if(temp["?"]) temp["?"]--;
        else return false;
    }
    return true;
}

/* ===== UI ===== */
function bindUI(){
    const rackInput=document.getElementById("rackInput");
    rackInput.oninput=e=>{boards[current].rack=e.target.value.toUpperCase();save();updateSuggestions();};

    document.getElementById("newBoardBtn").onclick=saveCurrentBoard;
    document.getElementById("loadDefaultBtn").onclick=loadDefaultBoard;
    document.getElementById("deleteBoardBtn").onclick=deleteBoard;
    document.getElementById("duplicateBoardBtn").onclick=duplicateBoard;
    document.getElementById("renameBoardBtn").onclick=renameBoard;

    document.getElementById("boardSelect").onchange=e=>switchBoard(e.target.value);
}

/* ===== BOARD MANIPULATION ===== */
function saveCurrentBoard(){
    const name=document.getElementById("boardNameInput").value.trim();
    if(!name) return;

    if(boards[name] && !confirm(`Brett "${name}" finnes allerede. Overwrite?`)) return;

    boards[name]={grid:boards[name]?.grid||emptyGrid(),rack:boards[name]?.rack||""};
    save();
    updateSelect();
    switchBoard(name);
    document.getElementById("boardNameInput").value="";
}

function loadDefaultBoard(){
    const name=prompt("Navn på brett?","Default");
    if(!name) return;
    boards[name]={grid:JSON.parse(JSON.stringify(DEFAULT_BOARD)),rack:""};
    save();
    updateSelect();
    switchBoard(name);
}

function deleteBoard(){
    if(!current) return;
    if(!confirm(`Slette brett "${current}"?`)) return;
    delete boards[current];
    save();
    updateSelect();
    if(Object.keys(boards).length) switchBoard(Object.keys(boards)[0]);
    else current=null;
}

function duplicateBoard(){
    if(!current) return;
    let newName=current+"_1", counter=1;
    while(boards[newName]){counter++;newName=current+"_"+counter;}
    boards[newName]=JSON.parse(JSON.stringify(boards[current]));
    save();
    updateSelect();
    switchBoard(newName);
}

function renameBoard(){
    if(!current) return;
    const newName=prompt("Nytt navn på brett",current);
    if(!newName || boards[newName]) return alert("Navn ugyldig eller eksisterer");
    boards[newName]=boards[current];
    delete boards[current];
    current=newName;
    save();
    updateSelect();
}

/* ===== SELECT ===== */
function updateSelect(){
    const sel=document.getElementById("boardSelect");
    sel.innerHTML="";
    Object.keys(boards).forEach(n=>{
        const o=document.createElement("option");
        o.value=o.textContent=n;
        sel.appendChild(o);
    });
}

/* ===== STORAGE ===== */
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(boards));}
function loadBoards(){const raw=localStorage.getItem(STORAGE_KEY);if(raw) boards=JSON.parse(raw);}

/* ===== GUIDE ===== */
function renderGuide(){
    document.getElementById("guide").innerHTML=`
<b>Slik bruker du brettet:</b><br>
• Skriv <b>A–Å</b> for bokstav<br>
• <b>?</b> = blank<br>
• <b>DW, DL, TL, TW</b> i tom rute for bonus<br>
• <b>A*</b> eller <b>A DW</b> = bokstav + DW<br>
• <b>rst</b> = reset rute<br><br>
<b>Bonus:</b><br>
DL = dobbel bokstav<br>
TL = trippel bokstav<br>
DW = dobbel ord<br>
TW = trippel ord
`;
}