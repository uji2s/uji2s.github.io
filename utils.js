console.log("DEBUG: utils.js loaded");

function formatMoney(val){
    return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseDate(str){
    const months = {"jan":0,"feb":1,"mar":2,"apr":3,"mai":4,"jun":5,"jul":6,"aug":7,"sep":8,"okt":9,"nov":10,"des":11};
    str = str.toLowerCase().replace(/\./g,"").trim();
    let day, month, year;
    if(str.match(/\d{1,2}\/\d{1,2}/)){
        [day, month] = str.split("/").map(Number);
        year = new Date().getFullYear();
    } else if(str.match(/^\d{1,2}$/)){
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
    return `${d} ${m}`;
}
