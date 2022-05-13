// Implementing MT19937 for seeded generation of a few random colours and symbols is *probably* overkill, but it's what I'm doing here.
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

// --------------------------------------------------------------------------------------------
// MT19937 implementation over, now for the rest of the code.

// get valid word set from file
let wordSet = async file => {
    const response = await fetch(file);
    const text = await response.text();

    wordSet = text.split(", ");
    return wordSet;
}

// get set of valid puzzles from file, puzzles are of the form SOL:WORD1,WORD2 and are separated by ;.
let puzzleSet = async file => {
    const response = await fetch(file);
    const text = await response.text();

    puzzleSet = text.split(";");
    return puzzleSet;
}

// pad a number to length 2 by prepending a 0 if less than 10.
function zeropad(num){
    if (num < 10){
        return (`0${num}`)
    } else {
        return (`${num}`)
    }
}

// display a standard timer of minutes and seconds
function display_timer(time){
    let mins = Math.floor(time/60)
    let secs = time - mins*60;
    return (`${zeropad(mins)}:${zeropad(secs)}`);
}

// fancier timer (puts AA:BB into the format AAm BBs)
function fancy_timer(time){
    let mins = Math.floor(time/60)
    let secs = time - mins*60;
    if (mins == 0) {
        return (`${zeropad(secs)}s`);
    } else {
        return (`${zeropad(mins)}m ${zeropad(secs)}s`);
    }
}

// timer with hours
function display_hour_timer(time){
    let hours = Math.floor(time/3600);
    let minstime = time - hours*3600;
    let mins = Math.floor(minstime/60);
    let secs = minstime - mins*60;
    return (`${zeropad(hours)}:${zeropad(mins)}:${zeropad(secs)}`);
}

// takes a puzzle of the form "SOL:WORD1,WORD2" and determines the words and solution
function parse_puzzle(puzzle){
    let outer = puzzle.split(":");
    let sol = outer[0];
    let words = outer[1].split(",");
    let word1 = words[0];
    let word2 = words[1];

    return( [sol, word1, word2] );
}

// gets the wordle colouring that will be produced from guessing a given guess against the solution.
// 0 = green, 1 = yellow, 2 = gray.
function get_wordle_colours(guess, sol){
    let cols = [2, 2, 2, 2, 2]; // colours are all gray by default
    let observed = [];

    // first pass over the guess
    for (var i = 0; i < 5; i++) {
        if (sol.charAt(i) == guess.charAt(i)) {
            // character in the same position, so green
            cols[i] = 0;
        } else {
            // other characters are registered as observed characters.
            observed.push(guess.charAt(i));
        }
    }

    // second pass over the guess
    for (var j = 0; j < 5; j++) {
        if (observed.includes(sol.charAt(j))) {
            if (!(sol.charAt(j) == guess.charAt(j))) {
                // character is in the guess, but not in that position, so yellow
                cols[j] = 1
                
                // remove the character from observed list (so we don't count it again)
                let index = observed.indexOf(sol.charAt(j));
                if (index !== -1) {
                    observed.splice(index, 1);
                }
            }
        }
    }

    return cols;
}

// samples x items from an array using the built in js math.random.
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

// samples x items from an array using the MT19937 given earlier
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

// functionality to initialize game puzzles
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
        // get current day, use to seed to MT19937 RNG.
        let seed = get_day();
        startday = seed;
        let prevday = seed
        
        // setup local flags for daily puzzle
        if (!(window.localStorage.getItem("PrevDaily") == null)) {
            // previous daily puzzle progress found locally.
            prevday = Number(window.localStorage.getItem("PrevDaily"))
            
            if (!(prevday == seed)) {
                // if the day has changed, reset stored daily puzzle progress to that of the new daily puzzle.
                window.localStorage.setItem("PrevDaily", seed)
                window.localStorage.setItem("DailyTime", 0)
                window.localStorage.setItem("DailyGuess", "")
                gametime = 0
                dailyguess = ""
            } else {
                // otherwise, load the daily puzzle from stored progress.
                dailyguess = window.localStorage.getItem("DailyGuess")
                gametime = Number(window.localStorage.getItem("DailyTime"))
            }
        } else {
            // no previous daily puzzle progress found locally, setup some local variables to store future progress.
            window.localStorage.setItem("PrevDaily", seed)
            window.localStorage.setItem("DailyTime", 0)
            window.localStorage.setItem("DailyGuess", "")
            gametime = 0
            dailyguess = ""
        }
        head.innerHTML = `<h2>Daily puzzle #${seed+1}</h2>`
        
        // seed the MT19337 RNG, and use to generate symbols and colours.
        let gen = seed_mt(seed*3291+230293);
        symbles = sample_with_gen(all_symbles, 3, gen);
        coloursample = sample_with_gen(all_colours, 3, gen);
        
        // get index from seed (with shift)
        index = (seed + 2304) % puzzles.length;
    } else {
        if (urlpuzzle != null) {
            console.log(puzzles[Number(urlpuzzle) - 1)]);
            if (!(puzzles[Number(urlpuzzle) - 1)]) == undefined) {
                // selecting random puzzle based on URL argument: clear local random puzzle progress, then use the URL argument to select a new one.
                remove_random_locals()
                symbles = sample(all_symbles, 3)
                coloursample = sample(all_colours, 3)
                index = Number(urlpuzzle)-1
                
                // update local storage to store the new random puzzle
                window.localStorage.setItem("PrevRandom", index)
                window.localStorage.setItem("PrevRandomColours", JSON.stringify(coloursample))
                window.localStorage.setItem("PrevRandomSymbols", JSON.stringify(symbles))
                gametime = 0
                head.innerHTML = `<h2>Random puzzle #${index+1}</h2>`
            } else {
                // url argument invalid, so apply the usual random puzzle selection methods
                if (window.localStorage.getItem("PrevRandom") == null) {
                    // no random puzzle progress found locally, so select at random using inbuilt Math.random
                    symbles = sample(all_symbles, 3)
                    coloursample = sample(all_colours, 3)
                    index = Math.floor(Math.random()*puzzles.length);
                    
                    // update local storage to store the new random puzzle
                    window.localStorage.setItem("PrevRandom", index)
                    window.localStorage.setItem("PrevRandomColours", JSON.stringify(coloursample))
                    window.localStorage.setItem("PrevRandomSymbols", JSON.stringify(symbles))
                    gametime = 0
                } else {
                    // local random puzzle progress found, so reload the in-progress random puzzle from local variables.
                    index = Number(window.localStorage.getItem("PrevRandom"))
                    coloursample = JSON.parse(window.localStorage.getItem("PrevRandomColours"))
                    symbles = JSON.parse(window.localStorage.getItem("PrevRandomSymbols"))
                    gametime = Number(window.localStorage.getItem("RandomGameTime"))
                }
                head.innerHTML = `<h2>Random puzzle #${index+1}</h2>`
            }
        } else {
            // random puzzle selection:
            if (window.localStorage.getItem("PrevRandom") == null) {
                // no random puzzle progress found locally, so select at random using inbuilt Math.random.
                symbles = sample(all_symbles, 3)
                coloursample = sample(all_colours, 3)
                index = Math.floor(Math.random()*puzzles.length);
                
                // update local storage to store the new random puzzle
                window.localStorage.setItem("PrevRandom", index)
                window.localStorage.setItem("PrevRandomColours", JSON.stringify(coloursample))
                window.localStorage.setItem("PrevRandomSymbols", JSON.stringify(symbles))
                gametime = 0
            } else {
                // local random puzzle progress found, so reload the in-progress random puzzle from local variables.
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
            // update the (mode-appropriate) local storage variable each time the timer changes.
            if (gamemode == "daily") {
                window.localStorage.setItem("DailyTime", gametime)
            } else {
                window.localStorage.setItem("RandomGameTime", gametime)
            }
            timer.textContent = display_timer(gametime);
        }
    }, 1000);

    // to finish setting up the puzzle, automatically enter the first two words of the result.
    let puzzle = parse_puzzle(puzzles[index]);
    target = puzzle[0];
    let word1 = puzzle[1];
    let word2 = puzzle[2];

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
        // daily mode automatic previous guess entry.
        if (dailyguess == "xxxxx") {
            // xxxxx means the user gave up, so automatically proceed to enact giving up the puzzle.
            statslock = true; // lock score stats, so that the user score doesn't change each time they see their previous result.
            gaveup = true;
            
            for(var i = 0; i < 5; i++){
                let letter = target.charAt(i)
                updateGuessedWords(letter)
            }
            handleSubmitWord()
        } else if (!(dailyguess == "")) {
            // a non-blank guess was made, automatically enter this guess and submit
            statslock = true; // lock score stats, so that the user score doesn't change each time they see their previous result.
            
            for(var i = 0; i < 5; i++){
                let letter = dailyguess.charAt(i)
                updateGuessedWords(letter)
            }
            handleSubmitWord()
        }
    }
}

// functionality to empty the current puzzle.
function clear_puzzle(){
    clearInterval(interval); // delete the event being used to tick the timer.
    const gameBoard = document.getElementById("board")
    const symbleBoard = document.getElementById("symble-board")

    // reset the appearance of all keyboard keys
    for (let j = 0; j < keys.length; j++) {
        keys[j].style.setProperty("background-color", "rgb(130,130,130)");
    }

    // delete all the puzzle tiles and re-generate them.
    gameBoard.innerHTML = ''
    symbleBoard.innerHTML = ''
    createSquares();
}

// functionality to restart the puzzle interface.
function restart(){
    // clear the puzzle board.
    clear_puzzle()

    // get rid of all the currently scheduled timeout events.
    for (var j = 0; j < timeouts.length; j++) {
        clearTimeout(timeouts[j])
    }
    timeouts = []

    // initialize a new puzzle.
    initialize_puzzle()
}

// gets the current day, relative to the day the puzzle game started.
function get_day(){
    const init = new Date("05/13/2022"); // date the game first started (MM/DD/YYYY) = the day after today.

    let start = Date.now() - init.getTime();
    let day = start/(1000*60*60*24)

    return (Math.floor(day));
}

// calculates remaining time until the next day, returning the display string for an hour timer.
function calculate_remaining_time(){
    let dt = new Date();
    let current_sec = dt.getSeconds() + (60 * dt.getMinutes()) + (3600 * dt.getHours());
    let remaining = (60*60*24) - current_sec;
    
    if((remaining > 0) && (get_day() == startday)){
        return display_hour_timer(remaining);
    } else {
        return display_hour_timer(0);
    }
}

// generates a nice copy-pastable post-game summary.
function generate_summary() {
    let colour_symbols = ["🟥", "🟩", "🟦", "🟨", "🟧", "🟪"]
    let colours = ["rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)", "rgb(255, 255, 0)", "rgb(255, 119, 0)", "rgb(119, 0, 255)"]
    let text = "";
    let col = "";

    let read = head.innerHTML
    text = text + read.slice(4, read.length - 5) // obtain game number from header.

    text = text.replace("puzzle", "Instant Symble") // swap "puzzle" with Instant Symble

    // game outcome
    if (!(wongame)) {
        text = text + ": X/3"
    } else {
        text = text + ": 3/3"
    }
    
    // display time (fancy), and the colours for the first two rows of symbols that were in the game.
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

    // advertisement url (include the puzzle number if the puzzle was a random puzzle).
    text = text + "play at https://www.InstantSymble.xyz"
    if (gamemode == "random") {
        text = text + `?n=${findnumber(read)}`
    }

    // automatically copy to clipboard.
    copyToClipboard(text);
}

// find the number, NUM, from a string in the format "USELESSTEXT #NUM USELESSTEXT"
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

// utility function for copying a string to clipboard
function copyToClipboard(text) {
    navigator.permissions.query({name: "clipboard-write"}).then(result => {
        if (result.state == "granted" || result.state == "prompt") {
            navigator.clipboard.writeText(text)
        }
    });
}

// --------------------------------------------------------------------------------------------
// global variables and initialization functions
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

// event for the switch mode button (change appearance, change game mode, then reset the puzzle board).
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

// obtains the url content, x, for selecting a random puzzle via [URL]/?n=x
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

// once all the constants are set up, initialize.
initialize_puzzle();

// --------------------------------------------------------------------------------------------
// ingame appearance and guess handling functionality

// display the true appearance of a symbol (after the guessno-th guess).
function set_symble(ns, cols, guessno){
    let n = ns[0]
    ns.splice(0, 1) // remove the first item from the list ns.
    // (crucially, as ns is actually just a reference to a list, this removes the first item for subsequent calls of the function using that same list.)
    
    // control animation, content, and appearance, using the colour data, cols, passed in
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

// show the appearance of all the symbols (after the guessno-th guess).
function show_symbles(guess, guessno){
    // produce symble colouring (wordle colouring but with guess and solution swapped)
    let cols = get_wordle_colours(guess, target);
    
    // seemingly necessary hack: push the order in which symbols will update into a list, pass said list as a parameter,
    // then trigger the function for updating these symbols once every 0.25s.
    const interval = 250;
    let is = [0,1,2,3,4];
    for (var i = 0; i < 5; i++){
        timeouts.push(setTimeout(() => {set_symble(is, cols, guessno)}, i*interval));
    }
}

// colour the keyboard keys based on a guess (key is coloured dark gray if its letter has been included in the guess).
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

// gray out all the tiles for the guessno-th guess (ultimately same formatting as wordle tiles get when not in a word).
function gray_tiles(guessno){
    for (var i = 0; i < 5; i++){
        const tile = document.getElementById(String((guessno-1)*5 + i + 1));
        tile.style.setProperty("background-color", "#888");
        tile.style.setProperty("border-color", "#666");
    }
}

// reveal all the answers post-game
function reveal_answers(numguesses){
    for (var guess=0; guess < numguesses; guess++){
        // for each guess, get the guessed word, then produce the true wordle colouring
        let guessword = guessedWords[guess].join('');
        let cols = get_wordle_colours(target, guessword);
        
        for (var i = 0; i < 5; i++){
            // for each tile in the guess, control the animations to flip the tile around, change the colour, and then unflip the tile.
            const tile = document.getElementById(String((guess)*5 + i + 1));
            
            // seemingly necessary hack: setting the tile attribute to data so that the tile knows what colour it is when the animation is done.
            // (if this wasn't done, the tile wouldn't know what colour to be as the colour data it has references to would have already been changed by this code).
            tile.setAttribute("mycol", cols[i])
            
            // animation control
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

// utility function for obtaining the current guessed word array.
function getCurrentWordArr(){
    const totalGuessed = guessedWords.length;
    return guessedWords[totalGuessed - 1]
}

// colour the guessno-th word letters red (this is done if we have an invalid word as a way of signalling to the user that it is invalid so won't be accepted)
function colour_red(guessno){
    for (var i = 0; i < 5; i++){
        const tile = document.getElementById(String((guessno-1)*5 + i + 1));
        tile.style.setProperty("color", "#d55");
        //tile.style.setProperty("border-color", "#f00");
    }
}

// colour the guessno-th word letters white (essentially, undo the functionality of colour_red(guessno) above)
function colour_white(guessno){
    for (var i = 0; i < 5; i++){
        const tile = document.getElementById(String((guessno-1)*5 + i + 1));
        tile.style.setProperty("color", "#fff");
        //tile.style.setProperty("border-color", "#fff");
    }
}

// add a new letter to the guessed word
function updateGuessedWords(letter) {
    // get the current word guess array
    const currentArr = getCurrentWordArr();
    if (currentArr.length < 5) {
        // there is space in the array, so add the new letter to the end
        currentArr.push(letter);

        // increase the global index storing position in the current word, and get the current tile.
        const availableSpaceEl = document.getElementById(String(availableSpace));
        availableSpace = availableSpace + 1

        // pretty animation for the current tile.
        availableSpaceEl.classList.add("animate__pulse");
        availableSpaceEl.style.setProperty("--animate-duration", "0.5s");
        availableSpaceEl.addEventListener("animationend", () => {
            availableSpaceEl.classList.remove("animate__pulse");
        })
        
        // update the current tile to store the new letter
        availableSpaceEl.textContent = letter;

        if (currentArr.length == 5){
            // a full length word guess comes with an extra check that the guess is a valid word
            const guess = currentArr.join('');

            if (!(valid_words.includes(guess))) {
                // if it is not, colour the word red.
                redword = true
                colour_red(guessedWords.length)
                return;
            }
        }
    }
}

// delete the last letter from a guessed word
function deleteGuessedWords() {
    if (redword){
        // if the word was previously coloured red, now colour it white.
        colour_white(guessedWords.length)
    }

    // get the current word array
    const currentArr = getCurrentWordArr();
    if (currentArr.length > 0) {
        // remove the last letter, decrease the global index storing position in the current word.
        currentArr.pop();

        availableSpace = availableSpace - 1
        
        // blank out the current word tile
        const availableSpaceEl = document.getElementById(String(availableSpace));
        availableSpaceEl.textContent = "";
    }
}

// utility function to delete local variables storing information about the current random game.
function remove_random_locals() {
    window.localStorage.removeItem("PrevRandom")
    window.localStorage.removeItem("PrevRandomColours")
    window.localStorage.removeItem("PrevRandomSymbols")
    window.localStorage.removeItem("RandomGameTime")
}

// utility function for updating personal win/loss stats after a game has finished.
function updateGlobalStats(gamewon) {
    // if the stats aren't locked (i.e.: not automatically filling the game in for the user to show a previous outcome)
    if (!(statslock)) {
        // default values for wins, games played, streak, and best streak.
        let statwins = 0
        let statgames = 0
        let statstreak = 0
        let statbeststreak = 0

        if (!(window.localStorage.getItem("TotalWins") == null)) {
            // if local variables for stats are found, load them from storage
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

// update the statistics display to show win/loss statistics.
function updateStatsDisplay() {
    // get references to all the elements where we'll write the results of our calculations.
    const totalplayed = document.getElementById("total-played")
    const winpct = document.getElementById("win-pct")
    const currentstreak = document.getElementById("current-streak")
    const beststreak = document.getElementById("best-streak")

    // default values for wins, games played, streak, and best streak.
    let statwins = 0
    let statgames = 0
    let statstreak = 0
    let statbeststreak = 0

    if (!(window.localStorage.getItem("TotalWins") == null)) {
        // if local variables for stats are found, load them from storage
        statwins = Number(window.localStorage.getItem("TotalWins"))
        statgames = Number(window.localStorage.getItem("TotalGames"))
        statstreak = Number(window.localStorage.getItem("CurrentStreak"))
        statbeststreak = Number(window.localStorage.getItem("BestStreak"))
    }

    // total number of games played is already just stored in local storage, as are streak and best streak.
    totalplayed.textContent = statgames
    if (statgames == 0){
        // if no games have been played, win% = W/0 (error). correct by just setting it to 0%.
        winpct.textContent = 0
    } else {
        // otherwise, win% = round(games_won/games_played)
        winpct.textContent = Math.round(100*statwins/statgames)
    }
    currentstreak.textContent = statstreak
    beststreak.textContent = statbeststreak
}

// functionality for controlling the submission of a guess word
function handleSubmitWord() {
    // get the current word array
    const currentWordArr = getCurrentWordArr();
    if (currentWordArr.length != 5) {
        // if not enough letters, clear the guess out, then return.
        const size = currentWordArr.length
        for(var i = 0; i < size; i++) {
            deleteGuessedWords()
        }
        return;
    }

    // get the current guess word
    const guess = currentWordArr.join('');

    if (!(valid_words.includes(guess))) {
        // if the guess word is not a valid word, return
        return;
    }

    // colouring and animations for the guess submission
    show_symbles(guess, guessedWords.length);
    gray_tiles(guessedWords.length);
    colour_keys(guess);

    if (guess == target){
        // guess was the target, so we won the game. Update global stats (only say we won if we didn't give up).
        updateGlobalStats(!gaveup)
        if (gamemode == "daily") {
            // store game outcome if we're in daily mode
            if (gaveup) {
                window.localStorage.setItem("DailyGuess", "xxxxx")
            } else {
                window.localStorage.setItem("DailyGuess", target)
            }
        } else {
            // otherwise, remove the random game from local storage so a new random game can be loaded.
            remove_random_locals()
        }

        // set the boolean flag to indicate the game is over.
        gameover = true
        
        // stop the timer from ticking, change the appearance of the timer to a tick circle.
        clearInterval(interval);
        timericon.textContent = "check_circle";
        
        // reveal the wordle colourings of each guess 1.5 seconds later
        timeouts.push(setTimeout(() => reveal_answers(endturn), 1500))
        
        // then, after another 0.5 seconds, show the game outcome string (gave up or won, in this case).
        timeouts.push(setTimeout(() => {
            result.style.setProperty("color", "gainsboro");
            if (gaveup){
                result.innerHTML = `<h2>You gave up. Better luck next time!</h2>`
            } else {
                wongame = true;
                result.innerHTML = `<h2>You won!</h2>`
            }
        }, 2000));
        
        // finally, after another second, automatically open the stats modal.
        timeouts.push(setTimeout(() => {
            // code for automatically opening stats modal
            const modal = document.getElementById("stats-modal");
            const replay = document.getElementById("replay");
            const countdown = document.getElementById("countdown");
        
            postgamestats.style.display = "flex";
            if (gamemode == "daily"){
                // daily mode version - set up countdown timer, hide replay button.
                countdown.style.display = "inline-block";
                replay.style.display = "none";
                countdowntimer.textContent = calculate_remaining_time()
                countdowninterval = setInterval(function() {
                    countdowntimer.textContent = calculate_remaining_time()
                }, 1000);
            } else {
                // random mode version - hide countdown timer, show replay button
                replay.style.display = "inline-block";
                countdown.style.display = "none";
            }

            // hide the help modal automatically (so the ugly "stats visible over help" situation can't happen.
            const helpmodal = document.getElementById("help-modal");
            helpmodal.style.display = "none";
            
            // update the display of stats based on local storage win/loss statistics
            updateStatsDisplay()

            // finally, actually show the stats modal
            modal.style.display = "block";
            overlay = true;
        }, 3000));
        return;
    }

    if (guessedWords.length == 3) {
        // ran out of guesses, so the game was lost, update global stats to say we did not win.
        updateGlobalStats(false)

        if (gamemode == "daily") {
            // daily mode, store the game outcome
            window.localStorage.setItem("DailyGuess", guess)
        } else {
            // random mode, remove random game from local storage so the next one can load
            remove_random_locals()
        }

        // set the boolean flag to indicate the game is over.
        gameover = true;
        
        // stop the timer from ticking, change the timer icon to a tick circle
        clearInterval(interval);
        timericon.textContent = "check_circle";
        
        // reveal the wordle colourings of each guess 1.5 seconds later
        timeouts.push(setTimeout(() => reveal_answers(endturn), 1500))
        
        // then, after another 0.5 seconds, show the game outcome string (gave up or won, in this case).
        timeouts.push(setTimeout(() => {
            result.style.setProperty("color", "gainsboro");
            result.innerHTML = `<h2>You lost. The word was ${target}</h2>`
        }, 2000));
        
        // finally, after another second, automatically open the stats modal.
        timeouts.push(setTimeout(() => {
            // code for automatically opening stats modal
            const modal = document.getElementById("stats-modal");
            const replay = document.getElementById("replay");
            const countdown = document.getElementById("countdown");
        
            postgamestats.style.display = "flex";
            if (gamemode == "daily"){
                // daily mode version - set up countdown timer, hide replay button.
                countdown.style.display = "inline-block";
                replay.style.display = "none";
                countdowntimer.textContent = calculate_remaining_time()
                countdowninterval = setInterval(function() {
                    countdowntimer.textContent = calculate_remaining_time()
                }, 1000);
            } else {
                // random mode version - hide countdown timer, show replay button
                replay.style.display = "inline-block";
                countdown.style.display = "none";
            }

            // hide the help modal automatically (so the ugly "stats visible over help" situation can't happen.
            const helpmodal = document.getElementById("help-modal");
            helpmodal.style.display = "none";

            // update the display of stats based on local storage win/loss statistics
            updateStatsDisplay()

            // finally, actually show the stats modal
            modal.style.display = "block";
            overlay = true;
        }, 3000));
        return;
        
    } else {
        // if guesses still remain, set the border of the tiles of the subsequent guess to be white (highlighting to catch the users's eye)
        for (var i = 0; i < 5; i++){
            const tile = document.getElementById(String((guessedWords.length)*5 + i + 1));
            tile.style.setProperty("border-color", "#fff");
        }
    }
    // push a blank word to the guess list.
    guessedWords.push([]);
}

// functionality for setting up game board tiles
function createSquares() {
    const gameBoard = document.getElementById("board")
    const symbleBoard = document.getElementById("symble-board")

    let index = 0;

    for (let j = 0; j < 3; j ++) {
        // tiles and symbols are each placed into three rows, last row is row2 type (just means there's no bottom border)
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

        // spacing element is also added (this is to make the symbols and letters have a bit of a gap in the middle where the vertical border will go)
        let spacer = document.createElement("div");
        spacer.classList.add("spacer");
        row.appendChild(spacer);
        
        let symblespacer = document.createElement("div");
        symblespacer.classList.add("spacer2");
        symblerow.appendChild(symblespacer);

        // add the 5 symbol and letter tiles
        for (let k = 0; k < 5; k ++) {
            // tiles are animatable, first row is set by default to have white border for highlighting (pending the first guess from the player)
            let square = document.createElement("div");
            square.classList.add("square");
            square.classList.add("animate__animated");
            if (j == 0){
                square.style.setProperty("border-color", "#fff");
            }
            
            // letter tiles are given an id to allow data entry, symbols have the same id, just +18.
            square.setAttribute("id", index+1);
            row.appendChild(square);

            let symble = document.createElement("div");
            symble.classList.add("symble");
            symble.classList.add("animate__animated");
            symble.setAttribute("id", 18+index+1);
            symblerow.appendChild(symble);

            index ++
        }
        
        // we add the rows of symbols and letters to the game boards when done building them.
        gameBoard.appendChild(row);
        symbleBoard.appendChild(symblerow);
    }
} 

// --------------------------------------------------------------------------------------------
// game event and modal setup

// keyboard button onclick events
for (let i = 0; i < keys.length; i++) {
    keys[i].onclick = ({target}) => {
        // keyboard buttons only work if during a game and not in an overlay menu
        if (!(gameover) && !(overlay)) {
            const letter = target.getAttribute("data-key");

            if (letter == "enter") {
                // enter key - submits the current word
                handleSubmitWord()
            } else if (letter == "del") {
                // backspace key - deletes the last letter
                deleteGuessedWords();
            } else {
                // all other keys add a new letter
                updateGuessedWords(letter);
            }
        }
    }
}

// give up button onclick event
giveup.onclick = ({thisbutton}) => {
    // give up button only works if during a game and not in an overlay menu
    if (!(gameover) && !(overlay)) {
        // give up button clicked during game, register that we gave up and get the current word
        gaveup = true;
        const currentWordArr = getCurrentWordArr();

        // clear out the current guess
        const size = currentWordArr.length
        for(var i = 0; i < size; i++) {
            deleteGuessedWords()
        }

        // then automatically enter the solution for us
        for(var i = 0; i < 5; i++){
            let letter = target.charAt(i)
            updateGuessedWords(letter)
        }
        handleSubmitWord()

    }
}

// key press events (allows typing in the words on keyboard instead of clicking if you want to type them in)
document.addEventListener("keyup", function(event) {
    // key press events only work if during a game and not in an overlay menu
    if (!(gameover) && !(overlay)) {
        if (event.code.slice(0, 3) == "Key") {
            // slight hack here - if the event begins "KeyX", we read what X is, convert it to lowercase, and find the corresponding key on the keyboard
            let letter = event.code.slice(3, 4).toLowerCase();
            // check the letter is in the keyboard (if it is not, ignore the input)
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].getAttribute("data-key") == letter) {
                    // this key's letter is then entered as the latest word in the guess
                    updateGuessedWords(letter);
                }
            }
        } else if (event.code == "Enter") {
            // enter key pressed - submit the word
            handleSubmitWord();
        } else if (event.code == "Backspace") {
            // backspace key pressed - delete the last letter
            deleteGuessedWords();
        }
    }
})

// help modal initialization
function initHelpModal() {
    // get help modal element reference
    const modal = document.getElementById("help-modal");

    // get the button that opens the modal, set up the event that will open the modal when this button is clicked
    const btn = document.getElementById("help");
    btn.addEventListener("click", function () {
        modal.style.display = "block";
        overlay = true;
    });

    // When the user clicks anywhere outside of the modal content, close it
    window.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
            overlay = false;
        }
    });
}

// stats modal initialization
function initStatsModal() {
    // get stats modal element reference
    const modal = document.getElementById("stats-modal");

    // get the button that opens the modal
    const btn = document.getElementById("stats");

    // get element references for various relevant buttons and frames
    const replay = document.getElementById("replay");
    const countdowntimer = document.getElementById("countdowntimer")
    const countdown = document.getElementById("countdown");
    const replaybutton = document.getElementById("replaybutton");
    const postgamestats = document.getElementById("postgamestats")
    const sharebutton = document.getElementById("sharebutton");

    // When the user clicks on the button to open the modal, open the modal
    btn.addEventListener("click", function () {
        // update stats display based on local win/loss information
        updateStatsDisplay()
        
        modal.style.display = "block";
        if (gameover) {
            // if the game has ended, add extra elements under the win/loss stats
            postgamestats.style.display = "flex";
            if (gamemode == "daily"){
                // daily mode version - show a countdown timer, setup countdown interval events, hide the replay button.
                countdown.style.display = "inline-block";
                replay.style.display = "none";
                countdowntimer.textContent = calculate_remaining_time()
                countdowninterval = setInterval(function() {
                    countdowntimer.textContent = calculate_remaining_time()
                }, 1000);
            } else {
                // random mode version - hide the countdown timer, show a replay button in the same spot.
                replay.style.display = "inline-block";
                countdown.style.display = "none";
            }
        } else {
            // if the game has not finished yet, hide the content which will go underneath the win/loss stats
            postgamestats.style.display = "none";
        }
        overlay = true;
    });

    // share button click event: generate a summary of the game and copy it to the clipboard
    sharebutton.addEventListener("click", function () {
        generate_summary();
    });

    // replay click event: close the stats modal and restart the game
    replaybutton.addEventListener("click", function () {
        modal.style.display = "none";
        overlay = false;
        restart();
    });

    // When the user clicks anywhere outside of the modal content, close it
    window.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
            clearInterval(countdowninterval) // stop the countdown timer (no need to keep triggering it as we can't see it any more)
            overlay = false;
        }
    });
}
