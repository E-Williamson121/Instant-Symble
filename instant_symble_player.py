import random

with open("extendedwordles.txt") as f:
    EXTENDED_WORDLE = f.read().split(", ")

def wordle_colour(solution, guess, colset):
    yellowcount = 0
    greencount = 0
    
    col = [colset[2], colset[2], colset[2], colset[2], colset[2]]
    observed = []
    for pos, letter in enumerate(guess):
        if guess[pos] == solution[pos]:
            greencount += 1
            col[pos] = colset[0]
        else: observed.append(letter)

    for pos, letter in enumerate(solution):
        if letter in observed:
            observed.remove(letter)
            if guess[pos] != letter:
                yellowcount += 1
                col[pos] = colset[1]

    return "".join(i for i in col), yellowcount + greencount, greencount

def play_game(guess):
    sol, words = guess
    word1, word2 = words
    colset = random.sample("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@?&%$£", 3)
    col1, _, _ = wordle_colour(sol, word1, colset)
    col2, _, _ = wordle_colour(sol, word2, colset)
    letters = "abcdefghijklmnopqrstuvwxyz"
    for letter in word1:
        letters = "".join(l if l != letter else "" for l in letters)
    for letter in word2:
        letters = "".join(l if l != letter else "" for l in letters)
    while True:
        print(f"{word1} \t {col1}\n{word2} \t {col2}")
        print(f"remaining letters: {letters}")
        ans = input("Enter guess: ")
        if ans == "": break
        elif len(ans) != 5:
            print("The guess must be a 5 letter word.")
        elif ans not in EXTENDED_WORDLE:
            print(f"The guess '{ans}' is not a valid word.")
        elif ans != sol:
            print(f"The guess '{ans}' is incorrect.")
        else: break
    print(f"The answer was '{sol}'.")

with open("puzzlesv2.txt") as f:
    s = f.read()
    puzzles = s.split(";")
    puzzle = puzzles[random.randint(0, len(puzzles)-1)].split(":")
    sol, words = puzzle[0], puzzle[1].split(",")
    word1, word2 = words[0], words[1]
    play_game( (sol, (word1, word2)) )
