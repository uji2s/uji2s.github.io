const SIZE = 15;
const STORAGE_KEY = "wf_boards";
let boards = {};
let current = null;
let dictionary = [];

const LETTER_VALUES = {
  A: 1,
  B: 4,
  C: 10,
  D: 1,
  E: 1,
  F: 2,
  G: 2,
  H: 3,
  I: 1,
  J: 4,
  K: 3,
  L: 2,
  M: 2,
  N: 1,
  O: 2,
  P: 4,
  R: 1,
  S: 1,
  T: 1,
  U: 4,
  V: 5,
  Y: 8,
  Æ: 4,
  Ø: 4,
  Å: 4,
  "?": 0
};

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
    await loadDictionary();
    loadBoards();
    bindUI();

    if (!Object.keys(boards).length) {
        createBoard("Standard");
    } else {
        switchBoard(Object.keys(boards)[0]);
    }

    renderGuide();
});

/* ===== DICT ===== */
async function loadDictionary() {
    const res = await fetch("dict_no.txt");
    const text = await res.text();
    dictionary = text.split("\n").map(w => w.trim().toUpperCase()).filter(Boolean);
}

/* ===== STATE ===== */
function emptyGrid() {
    return Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => ({ letter:"", bonus:"none" }))
    );
}

function createBoard(name) {
    if (!name) return;
    boards[name] = { grid: emptyGrid(), rack:"" };
    save();
    updateSelect();
    switchBoard(name);
}

function switchBoard(name) {
    current = name;
    renderBoard();
    document.getElementById("rackInput").value = boards[name].rack;
    updateSuggestions();
}

function scoreWord(word) {
    let score = 0;
    for (const c of word) {
        score += LETTER_VALUES[c] || 0;
    }
    return score;
}

/* ===== RENDER ===== */
function renderBoard() {
    const table = document.getElementById("board");
    table.innerHTML = "";

    boards[current].grid.forEach((row,y) => {
        const tr = document.createElement("tr");
        row.forEach((cell,x) => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.className = `cell bonus-${cell.bonus}`;
            input.maxLength = 3;
            input.value = displayValue(cell);

            input.onblur = () => {
                parseCell(input.value, cell);
                input.className = `cell bonus-${cell.bonus}`;
                input.value = displayValue(cell);
                save();
            };

            td.appendChild(input);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

function displayValue(cell) {
    if (cell.letter) {
        if (cell.bonus && cell.bonus !== "none") return `${cell.letter}${cell.bonus.toUpperCase()}`;
        return cell.letter;
    } 
    if (cell.bonus && cell.bonus !== "none") return cell.bonus.toUpperCase();
    return "";
}

function parseCell(val, cell) {
    const v = val.trim().toUpperCase();
    cell.letter = "";
    cell.bonus = "none";

    if (!v || v === "RST") return;

    // bonus alene i tom rute
    if (["DL","TL","DW","TW"].includes(v)) {
        cell.bonus = v.toLowerCase();
        return;
    }

    // bokstav + bonus
    const m = v.match(/^([A-ZÆØÅ?])\s*(DL|TL|DW|TW|\*)?$/);
    if (m) {
        cell.letter = m[1];
        if (m[2]) cell.bonus = m[2]==="*" ? "dw" : m[2].toLowerCase();
    }
}

/* ===== SUGGESTIONS ===== */
function updateSuggestions() {
    const rack = boards[current].rack.toUpperCase();
    const out = document.getElementById("suggestions");

    if (!rack) {
        out.innerHTML = "";
        return;
    }

    const counts = {};
    for (const c of rack) counts[c] = (counts[c] || 0) + 1;

    const results = [];

    for (const word of dictionary) {
        if (!canBuild(word, counts)) continue;

        const score = scoreWord(word);
        results.push({ word, score });
    }

    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.word.length - a.word.length;
    });

    out.innerHTML = results
        .slice(0, 50)
        .map(r =>
            `• <b>${r.word}</b> <span style="color:#aaa">(${r.score})</span>`
        )
        .join("<br>");
}

function canBuild(word, counts) {
    const temp = {...counts};
    for (const c of word) {
        if (temp[c]) temp[c]--;
        else if (temp["?"]) temp["?"]--;
        else return false;
    }
    return true;
}

/* ===== UI ===== */
function bindUI() {
    document.getElementById("rackInput").oninput = e => {
        boards[current].rack = e.target.value.toUpperCase();
        save();
        updateSuggestions();
    };

    document.getElementById("newBoardBtn").onclick = () => {
        createBoard(document.getElementById("boardNameInput").value.trim());
        document.getElementById("boardNameInput").value = "";
    };

    document.getElementById("boardSelect").onchange = e => switchBoard(e.target.value);
}

function updateSelect() {
    const sel = document.getElementById("boardSelect");
    sel.innerHTML = "";
    Object.keys(boards).forEach(n=>{
        const o = document.createElement("option");
        o.value = o.textContent = n;
        sel.appendChild(o);
    });
}

/* ===== STORAGE ===== */
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}
function loadBoards() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) boards = JSON.parse(raw);
}

/* ===== GUIDE ===== */
function renderGuide() {
    document.getElementById("guide").innerHTML = `
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