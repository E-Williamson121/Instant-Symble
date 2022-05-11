let w = 32;
let n = 624;
let m = 397;
let r = 31;

let a = 0x9908B0DF;

let u = 11;
let d = 0xFFFFFFFF;

let s = 7;
let b = 0x9D2C5680;

let t = 15;
let c = 0xEFC60000;

let l = 18;

let f = 1812433253;

// Create a length n array to store the state of the generator
let MT = [];

for (var i = 0; i < n; i++) {
    MT.push(0);
}

let ind = n+1;
const lower_mask = (1 << r) - 1; // the binary number of r 1's
const upper_mask = (0xFFFFFFFF << w) & (~(lower_mask));                            // lowest w bits of (not lower_mask)

// Initialize the generator from a seed
function seed_mt(seed) {
    ind = n;
    MT[0] = seed % (2**32);
    // loop over each element
    for (var i = 1; i < n; i++) {
        MT[i] = (0xFFFFFFFF << w) & (f * (MT[i-1]^(MT[i-1] >> (w-2))) + i);        // lowest w bits of (f * (MT[i-1] xor (MT[i-1] >> (w-2))) + i)
    }
}

// Extract a tempered value based on MT[index]
// calling twist() every n numbers
function extract_number() {
    if (ind >= n){
        if (ind > n){
        // console.log("Error: Generator was never seeded");
        return;
        // Alternatively, seed with constant value; 5489 is used in reference C code[53]
        }
        twist();
    }

    let y = MT[ind];
    y = y^((y >> u) & d);                     // y xor ((y >> u) and d)
    y = y^((y << s) & b);                     // y xor ((y << s) and b)
    y = y^((y << t) & c);                     // y xor ((y << t) and c)
    y = y^(y >> l);                           // y xor (y >> l)

    ind = ind + 1;
    return (0xFFFFFFFF << w) & (y);           // lowest w bits of (y)
}
// Generate the next n values from the series x_i 
function twist() {
    for (var i = 0; i < n; i++) {
        let x = (MT[i] & upper_mask) + (MT[(i+1) % n] & lower_mask);
        let xA = x >> 1;
        if ((x % 2) != 0){   // lowest bit of x is 1
            xA = xA^a;      // xA xor a
        }
        MT[i] = MT[(i + m) % n]^xA;
    }
    ind = 0;
}

let wordSet = async file => {
    const response = await fetch(file);
    const text = await response.text();

    wordSet = text.split(", ");
    return wordSet;
}

let puzzleSet = async file => {
    const response = await fetch(file);
    const text = await response.text();

    puzzleSet = text.split(";");
    return puzzleSet;
}

function zeropad(num){
    if (num < 10){
        return (`0${num}`)
    } else {
        return (`${num}`)
    }
}

function display_timer(time){
    let mins = Math.floor(time/60)
    let secs = time - mins*60;
    return (`${zeropad(mins)}:${zeropad(secs)}`);
}

function fancy_timer(time){
    let mins = Math.floor(time/60)
    let secs = time - mins*60;
    if (mins == 0) {
        return (`${zeropad(secs)}s`);
    } else {
        return (`${zeropad(mins)}m ${zeropad(secs)}s`);
    }
}

function display_hour_timer(time){
    let hours = Math.floor(time/3600);
    let minstime = time - hours*3600;
    let mins = Math.floor(minstime/60);
    let secs = minstime - mins*60;
    return (`${zeropad(hours)}:${zeropad(mins)}:${zeropad(secs)}`);
}

function parse_puzzle(puzzle){
    // console.log(puzzle);
    let outer = puzzle.split(":");
    let sol = outer[0];
    let words = outer[1].split(",");
    let word1 = words[0];
    let word2 = words[1];

    return( [sol, word1, word2] );
}

function get_wordle_colours(guess, sol){
    let cols = [2, 2, 2, 2, 2];
    let observed = [];

    for (var i = 0; i < 5; i++) {
        if (sol.charAt(i) == guess.charAt(i)) {
            cols[i] = 0;
        } else {
            observed.push(guess.charAt(i));
        }
    }

    for (var j = 0; j < 5; j++) {
        if (observed.includes(sol.charAt(j))) {
            if (!(sol.charAt(j) == guess.charAt(j))) {
                let index = observed.indexOf(sol.charAt(j));
                if (index !== -1) {
                    observed.splice(index, 1);
                }
                cols[j] = 1
            }
        }
    }

    return cols;
}

function sample(arr, x){
    let samp = [];
    while (samp.length < x){
        let index = Math.floor(Math.random()*arr.length)
        if (!(samp.includes(arr[index]))){
            samp.push(arr[index]);
        }
    }
    return samp;
}

function sample_with_gen(arr, x){
    let samp = [];
    while (samp.length < x){
        r = extract_number()
        let index = (r % arr.length);
        if (!(samp.includes(arr[index]))){
            samp.push(arr[index]);
        }
    }
    return samp;
}

function initialize_puzzle(){
    // hide game result message (if visible)
    result.style.setProperty("color", "black");

    // reset a bunch of global game property flags
    availableSpace = 1;
    redword = false;
    gaveup = false;
    wongame = false;
    overlay = false;
    gameover = false;
    statslock = false;
    guessedwordcount = 0;
    guessedWords = [[]];

    // select current game
    let index = 0
    let dailyguess = ""
    if (gamemode == "daily"){
        // daily puzzle selection:
        // get current day, use to seed to puzzle
        let seed = get_day();
        startday = seed;
        let prevday = seed
        // setup local flags for daily puzzle
        if (!(window.localStorage.getItem("PrevDaily") == null)) {
            prevday = Number(window.localStorage.getItem("PrevDaily"))
            if (!(prevday == seed)) {
                window.localStorage.setItem("PrevDaily", seed)
                window.localStorage.setItem("DailyTime", 0)
                window.localStorage.setItem("DailyGuess", "")
                gametime = 0
                dailyguess = ""
            } else {
                dailyguess = window.localStorage.getItem("DailyGuess")
                gametime = Number(window.localStorage.getItem("DailyTime"))
            }
        } else {
            window.localStorage.setItem("PrevDaily", seed)
            window.localStorage.setItem("DailyTime", 0)
            window.localStorage.setItem("DailyGuess", "")
            gametime = 0
            dailyguess = ""
        }
        head.innerHTML = `<h2>Daily puzzle #${seed+1}</h2>`
        // rng setup, used to seed for symbol and colour selection
        let gen = seed_mt(seed*3291+230293);
        symbles = sample_with_gen(all_symbles, 3, gen);
        coloursample = sample_with_gen(all_colours, 3, gen);
        // get index from seed (with shift)
        index = (seed + 2304) % puzzles.length;
    } else {
        if (urlpuzzle != null) {
            // selecting random puzzle based on URL
            remove_random_locals()
            symbles = sample(all_symbles, 3)
            coloursample = sample(all_colours, 3)
            index = Number(urlpuzzle)-1
            window.localStorage.setItem("PrevRandom", index)
            window.localStorage.setItem("PrevRandomColours", JSON.stringify(coloursample))
            window.localStorage.setItem("PrevRandomSymbols", JSON.stringify(symbles))
            gametime = 0
            head.innerHTML = `<h2>Random puzzle #${index+1}</h2>`
        } else {
            // random puzzle selection:
            // simple random selections using in-built random module
            if (window.localStorage.getItem("PrevRandom") == null) {
                symbles = sample(all_symbles, 3)
                coloursample = sample(all_colours, 3)
                index = Math.floor(Math.random()*puzzles.length);
                window.localStorage.setItem("PrevRandom", index)
                window.localStorage.setItem("PrevRandomColours", JSON.stringify(coloursample))
                window.localStorage.setItem("PrevRandomSymbols", JSON.stringify(symbles))
                gametime = 0
            } else {
                index = Number(window.localStorage.getItem("PrevRandom"))
                coloursample = JSON.parse(window.localStorage.getItem("PrevRandomColours"))
                symbles = JSON.parse(window.localStorage.getItem("PrevRandomSymbols"))
                gametime = Number(window.localStorage.getItem("RandomGameTime"))
            }
            head.innerHTML = `<h2>Random puzzle #${index+1}</h2>`
        }
    }

    // setup game timer
    timericon.textContent = "timer";
    timer.textContent = display_timer(gametime);

    interval = setInterval(function() {
        if (!(gameover) && !(overlay)) {
            gametime = gametime + 1;
            if (gamemode == "daily") {
                window.localStorage.setItem("DailyTime", gametime)
            } else {
                window.localStorage.setItem("RandomGameTime", gametime)
            }
            timer.textContent = display_timer(gametime);
        }
    }, 1000);

    // automatically enter the first two words
    let puzzle = parse_puzzle(puzzles[index]);
    let answer = puzzle[0];
    let word1 = puzzle[1];
    let word2 = puzzle[2];
    target = answer;

    for(var i = 0; i < 5; i++){
        let letter = word1.charAt(i)
        updateGuessedWords(letter)
    }
    handleSubmitWord()

    for(var i = 0; i < 5; i++){
        let letter = word2.charAt(i)
        updateGuessedWords(letter)
    }
    handleSubmitWord()

    if (gamemode == "daily") {
        if (dailyguess == "xxxxx") {
            // automatically give up
            statslock = true;
            gaveup = true;
            for(var i = 0; i < 5; i++){
                let letter = target.charAt(i)
                updateGuessedWords(letter)
            }
            handleSubmitWord()
        } else if (!(dailyguess == "")) {
            // automatically enter the daily guess and submit
            statslock = true;
            for(var i = 0; i < 5; i++){
                let letter = dailyguess.charAt(i)
                updateGuessedWords(letter)
            }
            handleSubmitWord()
        }
    }
}

function clear_puzzle(){
    clearInterval(interval);
    const gameBoard = document.getElementById("board")
    const symbleBoard = document.getElementById("symble-board")

    for (let j = 0; j < keys.length; j++) {
        keys[j].style.setProperty("background-color", "rgb(130,130,130)");
    }

    gameBoard.innerHTML = ''
    symbleBoard.innerHTML = ''
    createSquares();
}

function restart(){
    clear_puzzle()

    for (var j = 0; j < timeouts.length; j++) {
        clearTimeout(timeouts[j])
    }
    timeouts = []

    initialize_puzzle()
}

function get_day(){
    const init = new Date("05/08/2022"); // date the game first started (MM/DD/YYYY)

    let start = Date.now() - init.getTime();
    let day = start/(1000*60*60*24)

    return (Math.floor(day));
}

function calculate_remaining_time(){
    let dt = new Date();
    let current_sec = dt.getSeconds() + (60 * dt.getMinutes()) + (3600 * dt.getHours());
    let remaining = (60*60*24) - current_sec;
    // console.log(get_day())
    // console.log(startday)
    if((remaining > 0) && (get_day() == startday)){
        return display_hour_timer(remaining);
    } else {
        return display_hour_timer(0);
    }
}

function generate_summary() {
    let colour_symbols = ["🟥", "🟩", "🟦", "🟨", "🟧", "🟪"]
    let colours = ["rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)", "rgb(255, 255, 0)", "rgb(255, 119, 0)", "rgb(119, 0, 255)"]
    let text = "";
    let col = "";

    let read = head.innerHTML
    // `<h2>[header text]</h2>`
    text = text + read.slice(4, read.length - 5)

    text = text.replace("puzzle", "Instant Symble")

    if (!(wongame)) {
        text = text + ": X/3"
    } else {
        text = text + ": 3/3"
    }
    text = text + `, ${fancy_timer(gametime)}\nFirst two rows of symbols:\n`

    for (var i = 0; i < 10; i++) {
        const tile = document.getElementById(String(18 + i + 1));
        col = tile.children[0].style.getPropertyValue("color")
        // console.log(col);
        text = text + colour_symbols[colours.indexOf(col)]
        if (((i+1) % 5 == 0)){
            text = text + "\n"
        }
    }

    text = text + "play at https://www.InstantSymble.xyz"
    if (gamemode == "random") {
        text = text + `?n=${findnumber(read)}`
    }

    copyToClipboard(text);

}

function findnumber(text) {
    let n = ""
    for (var i = 0; i < text.length; i++) {
        let chr = text[text.length - 1 - i]
        if (chr == "#") {
            return(n.slice(0, n.length - 5))
        } else {
            n = chr + n
        }
    }

}

function copyToClipboard(text) {
    navigator.permissions.query({name: "clipboard-write"}).then(result => {
        if (result.state == "granted" || result.state == "prompt") {
            navigator.clipboard.writeText(text)
        }
    });
}

let valid_words = await wordSet("./extendedwordles.txt");
let puzzles = await puzzleSet("./puzzlesv5.txt");

createSquares()
initHelpModal()
initStatsModal()

const all_symbles = ["light_mode", "dark_mode", "all_inclusive", "gamepad", "pentagon", "star", "trip_origin", "water_drop", "token", "favorite", "whatshot"]
const all_colours = ["#f00", "#0f0", "#00f", "#ff0", "#f70", "#70f"];
const keys = document.querySelectorAll(".keyboard-row button", ".keyboard-row .wider-button");
const giveup = document.querySelectorAll(".giveup")[0];
const result = document.querySelectorAll(".result")[0];
const head = document.querySelectorAll(".gameheader")[0];
const timer = document.querySelectorAll(".timer")[0];
const timericon = document.querySelectorAll(".timericon")[0];

// Get the button that opens the modal
const switchmode = document.getElementById("switch");
switchmode.addEventListener("click", function () {
    if (gamemode == "daily"){
        switchmode.textContent = "today";
        gamemode = "random"
    } else {
        switchmode.textContent = "bolt";
        gamemode = "daily"
    }
    restart();
});

const params = new URLSearchParams(window.location.search)
let urlpuzzle = params.get("n")

let symbles = []
let coloursample = []
let timeouts = []
let startday = -100;
let statslock = false
let gametime = 0;
let wongame = false;
let availableSpace = 1;
let redword = false;
let gaveup = false;
let gameover = false;
let overlay = false;
let interval = null;
let countdowninterval = null;
let guessedwordcount = 0;
let gamemode = ""
if (urlpuzzle == null) {
    gamemode = "daily";
} else {
    gamemode = "random";
}

let target = "";
let guessedWords = [[]];

if (gamemode == "daily"){
    switchmode.textContent = "bolt";
} else {
    switchmode.textContent = "today";
}

// console.log(display_timer(5));

initialize_puzzle();

function set_symble(ns, cols, guessno){
    let n = ns[0]
    ns.splice(0, 1)
    const newspan = document.createElement('span')
    const symbleBlock = document.getElementById(String(18 + (guessno-1)*5 + n + 1));
    newspan.textContent = symbles[cols[n]];
    newspan.classList.add("material-icons");
    newspan.style.setProperty("color", coloursample[cols[n]]);
    newspan.style.setProperty("position", "relative"); 
    newspan.style.setProperty("top", "3px");
    symbleBlock.appendChild(newspan);

    symbleBlock.classList.add("animate__flipInX");
    symbleBlock.style.setProperty("--animate-duration", "0.5s");
    symbleBlock.addEventListener("animationend", () => {
        symbleBlock.classList.remove("animate__flip");
    })
}

function show_symbles(guess, guessno){
    let cols = get_wordle_colours(guess, target);
    const interval = 250;
    let is = [0,1,2,3,4];
    for (var i = 0; i < 5; i++){
        timeouts.push(setTimeout(() => {set_symble(is, cols, guessno)}, i*interval));
    }
}

function colour_keys(guess){
    for (var i = 0; i < 5; i++){
        let letter = guess.charAt(i)
        for (let j = 0; j < keys.length; j++) {
            if (keys[j].getAttribute("data-key") == letter) {
                keys[j].style.setProperty("background-color", "#444");
            }
        }
    }
}

function gray_tiles(guessno){
    for (var i = 0; i < 5; i++){
        const tile = document.getElementById(String((guessno-1)*5 + i + 1));
        tile.style.setProperty("background-color", "#888");
        tile.style.setProperty("border-color", "#666");
    }
}

function reveal_answers(numguesses){
    for (var guess=0; guess < numguesses; guess++){
        let guessword = guessedWords[guess].join('');
        let cols = get_wordle_colours(target, guessword);
        for (var i = 0; i < 5; i++){
            const tile = document.getElementById(String((guess)*5 + i + 1));
            tile.setAttribute("mycol", cols[i])
            tile.classList.add("animate__flipOutX");
            tile.style.setProperty("--animate-duration", "1s");
            tile.addEventListener("animationend", () => {
                // console.log("listenertriggered");
                tile.classList.remove("animate__flipOutX");
                tile.style.setProperty("background-color", "#000");
                let c = tile.getAttribute("mycol")
                if (c == 2){
                    tile.style.setProperty("border-color", "#666");
                } else {
                    tile.style.setProperty("border-color", coloursample[c]);
                }
                tile.classList.add("animate__flipInX");
                tile.style.setProperty("--animate-duration", "1s");
                tile.addEventListener("animationend", () => {
                    tile.classList.remove("animate__flipInX");
                })
            })
        }
    }
}

function getCurrentWordArr(){
    const totalGuessed = guessedWords.length;
    return guessedWords[totalGuessed - 1]
}

function colour_red(guessno){
    for (var i = 0; i < 5; i++){
        const tile = document.getElementById(String((guessno-1)*5 + i + 1));
        tile.style.setProperty("color", "#d55");
        //tile.style.setProperty("border-color", "#f00");
    }
}

function colour_white(guessno){
    for (var i = 0; i < 5; i++){
        const tile = document.getElementById(String((guessno-1)*5 + i + 1));
        tile.style.setProperty("color", "#fff");
        //tile.style.setProperty("border-color", "#fff");
    }
}

function updateGuessedWords(letter) {
    const currentArr = getCurrentWordArr();
    if (currentArr.length < 5) {
        currentArr.push(letter);

        const availableSpaceEl = document.getElementById(String(availableSpace));
        availableSpace = availableSpace + 1

        availableSpaceEl.classList.add("animate__pulse");
        availableSpaceEl.style.setProperty("--animate-duration", "0.5s");
        availableSpaceEl.addEventListener("animationend", () => {
            availableSpaceEl.classList.remove("animate__pulse");
        })
        availableSpaceEl.textContent = letter;

        if (currentArr.length == 5){
            const guess = currentArr.join('');

            if (!(valid_words.includes(guess))) {
                redword = true
                colour_red(guessedWords.length)
                return;
            }
        }
    }
}

function deleteGuessedWords() {
    if (redword){
        colour_white(guessedWords.length)
    }

    const currentArr = getCurrentWordArr();
    if (currentArr.length > 0) {
        currentArr.pop();

        availableSpace = availableSpace - 1
        const availableSpaceEl = document.getElementById(String(availableSpace));

        availableSpaceEl.textContent = "";
    }
}

function remove_random_locals() {
    window.localStorage.removeItem("PrevRandom")
    window.localStorage.removeItem("PrevRandomColours")
    window.localStorage.removeItem("PrevRandomSymbols")
    window.localStorage.removeItem("RandomGameTime")
}

function updateGlobalStats(gamewon) {
    if (!(statslock)) {
        let statwins = 0
        let statgames = 0
        let statstreak = 0
        let statbeststreak = 0

        if (!(window.localStorage.getItem("TotalWins") == null)) {
            statwins = Number(window.localStorage.getItem("TotalWins"))
            statgames = Number(window.localStorage.getItem("TotalGames"))
            statstreak = Number(window.localStorage.getItem("CurrentStreak"))
            statbeststreak = Number(window.localStorage.getItem("BestStreak"))
        } 

        if (gamewon){
            // game was won, increase wins by 1, games by 1, streak by 1
            window.localStorage.setItem("TotalWins", statwins + 1)
            window.localStorage.setItem("TotalGames", statgames + 1)
            window.localStorage.setItem("CurrentStreak", statstreak + 1)
            if ((statstreak + 1) > statbeststreak) {
                window.localStorage.setItem("BestStreak", statstreak + 1)
            } else {
                window.localStorage.setItem("BestStreak", statbeststreak)
            }
        } else {
            // game was lost, increase games by 1, set streak to 0
            window.localStorage.setItem("TotalWins", statwins)
            window.localStorage.setItem("TotalGames", statgames + 1)
            window.localStorage.setItem("CurrentStreak", 0)
            window.localStorage.setItem("BestStreak", statbeststreak)
        }
    }
}

function updateStatsDisplay() {
    const totalplayed = document.getElementById("total-played")
    const winpct = document.getElementById("win-pct")
    const currentstreak = document.getElementById("current-streak")
    const beststreak = document.getElementById("best-streak")

    let statwins = 0
    let statgames = 0
    let statstreak = 0
    let statbeststreak = 0

    if (!(window.localStorage.getItem("TotalWins") == null)) {
        statwins = Number(window.localStorage.getItem("TotalWins"))
        statgames = Number(window.localStorage.getItem("TotalGames"))
        statstreak = Number(window.localStorage.getItem("CurrentStreak"))
        statbeststreak = Number(window.localStorage.getItem("BestStreak"))
    }

    totalplayed.textContent = statgames
    if (statwins == 0){
        winpct.textContent = 0
    } else {
        winpct.textContent = Math.round(100*statwins/statgames)
    }
    currentstreak.textContent = statstreak
    beststreak.textContent = statbeststreak
}

function handleSubmitWord() {
    const currentWordArr = getCurrentWordArr();
    if (currentWordArr.length != 5) {
        const size = currentWordArr.length
        for(var i = 0; i < size; i++) {
            deleteGuessedWords()
        }
        return;
    }

    const guess = currentWordArr.join('');

    if (!(valid_words.includes(guess))) {
        return;
    }

    // place to include colouring/animations
    show_symbles(guess, guessedWords.length);
    gray_tiles(guessedWords.length);
    colour_keys(guess);

    if (guess == target){
        // game won
        updateGlobalStats(!gaveup)
        if (gamemode == "daily") {
            if (gaveup) {
                window.localStorage.setItem("DailyGuess", "xxxxx")
            } else {
                window.localStorage.setItem("DailyGuess", target)
            }
        } else {
            remove_random_locals()
        }

        gameover = true
        const endturn = guessedWords.length;
        clearInterval(interval);
        timericon.textContent = "check_circle";
        timeouts.push(setTimeout(() => reveal_answers(endturn), 1500))
        timeouts.push(setTimeout(() => {
            result.style.setProperty("color", "gainsboro");
            if (gaveup){
                result.innerHTML = `<h2>You gave up. Better luck next time!</h2>`
            } else {
                wongame = true;
                result.innerHTML = `<h2>You won!</h2>`
            }
        }, 2000));
        timeouts.push(setTimeout(() => {
            const modal = document.getElementById("stats-modal");
            const replay = document.getElementById("replay");
            const countdown = document.getElementById("countdown");
        
            postgamestats.style.display = "flex";
            if (gamemode == "daily"){
                countdown.style.display = "inline-block";
                replay.style.display = "none";
                countdowntimer.textContent = calculate_remaining_time()
                countdowninterval = setInterval(function() {
                    countdowntimer.textContent = calculate_remaining_time()
                }, 1000);
            } else {
                replay.style.display = "inline-block";
                countdown.style.display = "none";
            }

            const helpmodal = document.getElementById("help-modal");
            helpmodal.style.display = "none";

            updateStatsDisplay()

            modal.style.display = "block";
            overlay = true;
        }, 3000));
        return;
    }

    if (guessedWords.length == 3) {
        // game lost
        updateGlobalStats(false)

        if (gamemode == "daily") {
            window.localStorage.setItem("DailyGuess", guess)
        } else {
            remove_random_locals()
        }

        gameover = true;
        const endturn = guessedWords.length;
        clearInterval(interval);
        timericon.textContent = "check_circle";
        timeouts.push(setTimeout(() => reveal_answers(endturn), 1500))
        timeouts.push(setTimeout(() => {
            result.style.setProperty("color", "gainsboro");
            result.innerHTML = `<h2>You lost. The word was ${target}</h2>`
        }, 2000));
        timeouts.push(setTimeout(() => {
            const modal = document.getElementById("stats-modal");
            const replay = document.getElementById("replay");
            const countdown = document.getElementById("countdown");
        
            postgamestats.style.display = "flex";
            if (gamemode == "daily"){
                countdown.style.display = "inline-block";
                replay.style.display = "none";
                countdowntimer.textContent = calculate_remaining_time()
                countdowninterval = setInterval(function() {
                    countdowntimer.textContent = calculate_remaining_time()
                }, 1000);
            } else {
                replay.style.display = "inline-block";
                countdown.style.display = "none";
            }

            const helpmodal = document.getElementById("help-modal");
            helpmodal.style.display = "none";

            updateStatsDisplay()

            modal.style.display = "block";
            overlay = true;
        }, 3000));
        return;
    } else {
        for (var i = 0; i < 5; i++){
            const tile = document.getElementById(String((guessedWords.length)*5 + i + 1));
            tile.style.setProperty("border-color", "#fff");
        }
    }
    guessedWords.push([]);
}

function createSquares() {
    const gameBoard = document.getElementById("board")
    const symbleBoard = document.getElementById("symble-board")

    let index = 0;

    for (let j = 0; j < 3; j ++) {
        let row = document.createElement("div");
        if(j == 2) {
            row.classList.add("row2");
        } else {
            row.classList.add("row");
        }

        let symblerow = document.createElement("div");
        if(j == 2) {
            symblerow.classList.add("row2");
        } else {
            symblerow.classList.add("row");
        }

        let spacer = document.createElement("div");
        spacer.classList.add("spacer");
        row.appendChild(spacer);
        
        let symblespacer = document.createElement("div");
        symblespacer.classList.add("spacer2");
        symblerow.appendChild(symblespacer);
        
        for (let k = 0; k < 5; k ++) {
            let square = document.createElement("div");
            square.classList.add("square");
            square.classList.add("animate__animated");
            if (j == 0){
                square.style.setProperty("border-color", "#fff");
            }
            square.setAttribute("id", index+1);
            row.appendChild(square);

            let symble = document.createElement("div");
            symble.classList.add("symble");
            symble.classList.add("animate__animated");
            symble.setAttribute("id", 18+index+1);
            symblerow.appendChild(symble);

            index ++
        }
        gameBoard.appendChild(row);
        symbleBoard.appendChild(symblerow);
    }
} 

for (let i = 0; i < keys.length; i++) {
    keys[i].onclick = ({target}) => {
        if (!(gameover) && !(overlay)) {
            const letter = target.getAttribute("data-key");

            if (letter == "enter") {
                handleSubmitWord()
            } else if (letter == "del") {
                deleteGuessedWords();
            } else {
                updateGuessedWords(letter);
            }
        }
    }
}

giveup.onclick = ({thisbutton}) => {
    if (!(gameover) && !(overlay)) {
        // give up button clicked during game
        gaveup = true;
        const currentWordArr = getCurrentWordArr();

        const size = currentWordArr.length
        for(var i = 0; i < size; i++) {
            deleteGuessedWords()
        }

        for(var i = 0; i < 5; i++){
            let letter = target.charAt(i)
            updateGuessedWords(letter)
        }
        handleSubmitWord()

    }
}

document.addEventListener("keyup", function(event) {
    if (!(gameover) && !(overlay)) {
        if (event.code.slice(0, 3) == "Key") {
            let letter = event.code.slice(3, 4).toLowerCase();
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].getAttribute("data-key") == letter) {
                    updateGuessedWords(letter);
                }
            }
        } else if (event.code == "Enter") {
            handleSubmitWord();
        } else if (event.code == "Backspace") {
            deleteGuessedWords();
        }
    }
})

function initHelpModal() {
    const modal = document.getElementById("help-modal");

    // Get the button that opens the modal
    const btn = document.getElementById("help");

    // Get the <span> element that closes the modal
    // const span = document.getElementById("close-help");

    // When the user clicks on the button, open the modal
    btn.addEventListener("click", function () {
        modal.style.display = "block";
        overlay = true;
    });

    // When the user clicks on <span> (x), close the modal
    //span.addEventListener("click", function () {
    //    modal.style.display = "none";
    //    overlay = false;
    //});

    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
            overlay = false;
        }
    });
}

function initStatsModal() {
    const modal = document.getElementById("stats-modal");

    // Get the button that opens the modal
    const btn = document.getElementById("stats");

    const replay = document.getElementById("replay");
    const countdowntimer = document.getElementById("countdowntimer")
    const countdown = document.getElementById("countdown");
    const replaybutton = document.getElementById("replaybutton");
    const postgamestats = document.getElementById("postgamestats")
    const sharebutton = document.getElementById("sharebutton");

    // Get the <span> element that closes the modal
    // const span = document.getElementById("close-stats");

    // When the user clicks on the button, open the modal
    btn.addEventListener("click", function () {
        // update stats here 
        updateStatsDisplay()
        modal.style.display = "block";
        if (gameover) {
            postgamestats.style.display = "flex";
            if (gamemode == "daily"){
                countdown.style.display = "inline-block";
                replay.style.display = "none";
                countdowntimer.textContent = calculate_remaining_time()
                countdowninterval = setInterval(function() {
                    countdowntimer.textContent = calculate_remaining_time()
                }, 1000);
            } else {
                replay.style.display = "inline-block";
                countdown.style.display = "none";
            }
        } else {
            postgamestats.style.display = "none";
        }
        overlay = true;
    });

    sharebutton.addEventListener("click", function () {
        generate_summary();
    });

    replaybutton.addEventListener("click", function () {
        modal.style.display = "none";
        overlay = false;
        restart();
    });

    // When the user clicks on <span> (x), close the modal
    // span.addEventListener("click", function () {
    //    modal.style.display = "none";
    //    overlay = false;
    //});

    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
            clearInterval(countdowninterval)
            overlay = false;
        }
    });
}