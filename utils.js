// utils.js
console.log("DEBUG: utils.js loaded");

export function formatMoney(val){
    return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseDate(str){
    const months = {"jan":0,"feb":1,"mar":2,"apr":3,"mai":4,"jun":5,"jul":6,"aug":7,"sep":8,"okt":9,"nov":10,"des":11};
    str = str.toLowerCase().replace(/\./g,"").trim();
    const now = new Date();
    let day, month, year;

    if(str.match(/^\d{1,2}$/)){
        day = parseInt(str);
        month = now.getMonth();
        year = now.getFullYear();
    } else if(str.match(/\d{1,2}\/\d{1,2}/)){
        [day, month] = str.split("/").map(Number);
        month -= 1;
        year = now.getFullYear();
    } else {
        let parts = str.split(" ");
        day = parseInt(parts[0]);
        month = months[parts[1].substr(0,3)] ?? now.getMonth();
        year = now.getFullYear();
    }

    return new Date(year, month, day);
}

export function formatDate(date){
    const months = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];
    return `${date.getDate().toString().padStart(2,"0")}. ${months[date.getMonth()]}`;
}

// --- nye hjelpere ---
export function addDays(date, days){
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function calculateSum(entries){
    return entries.reduce((acc,e)=>acc+Number(e.amount),0);
}

export function getAmountColor(amount){
    return amount > 0 ? "green" : amount < 0 ? "red" : "yellow";
}
