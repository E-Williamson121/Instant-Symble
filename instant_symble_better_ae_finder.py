import random, itertools

with open("wordles.txt") as f:
    WORDLES = f.read().split(", ")

with open("extendedwordles.txt") as f:
    EXTENDED_WORDLE = f.read().split(", ")

# 3 yellows, 1 green

def get_all_guesses(words, ext_words):
    guesses = {}
    for i, guess in enumerate(words):
        if i % 100 == 0: print(i)
        for sol in ext_words:
            if sol != guess:
                col = wordle_colour(sol, guess)              
                if (guess, col) in guesses.keys():
                    guesses[(guess, col)].append(sol)
                else:
                    guesses[(guess, col)] = [sol]
    return guesses


def cols_to_nums(cols):
    num = []
    for col in cols:
        if col == "g": num.append(0)
        elif col == "y": num.append(1)
        elif col == "x": num.append(2)
    return num

def nums_to_cols(num, perm):
    cols = "".join(perm[i] for i in num)
    return cols

def not_permutable(guesses, guess1, guess2):
    word1, col1 = guess1
    word2, col2 = guess2

    num1 = cols_to_nums(col1)
    num2 = cols_to_nums(col2)

    perms = ["gxy", "ygx", "yxg", "xgy", "xyg"]
    for perm in perms:
        col1 = nums_to_cols(num1, perm)
        col2 = nums_to_cols(num2, perm)

        if (word1, col1) in guesses.keys() and (word2, col2) in guesses.keys():
            poss1 = guesses[(word1, col1)]
            poss2 = guesses[(word2, col2)]

            sols = list(set(poss1) - (set(poss1) - set(poss2)))
            if len(sols) > 0:
                return False

    return True

def can_all_be_green(guesses, guess1, guess2):
    word1, col1 = guess1
    word2, col2 = guess2

    num1 = cols_to_nums(col1)
    num2 = cols_to_nums(col2)

    filters = ["gxx", "xgx", "xxg"]
    can_green = True

    for col_filter in filters:
        col1 = nums_to_cols(num1, col_filter)
        col2 = nums_to_cols(num2, col_filter)

        if (word1, col1) in guesses.keys() and (word2, col2) in guesses.keys():
            poss1 = guesses[(word1, col1)]
            poss2 = guesses[(word2, col2)]

            sols = list(set(poss1) - (set(poss1) - set(poss2)))
            if len(sols) == 0:
                can_green = False
                break
        else:
            can_green = False
            break
            
    return can_green

def check_valid_pattern(ng, ny, ng2, ny2, sols, word1, word2, guesses, guess1, guess2):
    nx = 5 - (ny + ng)
    nx2 = 5 - (ny2 + ng2)

    if len(sols) == 1 and sols[0] in WORDLES:
        # check that there are no other permutations of (the same set of) colours that would also work
        if not_permutable(guesses, guess1, guess2):
            if abs((ny + ny2) - (ng + ng2)) < 2 and abs((nx + nx2) - (ng + ng2)) < 2 and abs((nx + nx2) - (ny + ny2)) < 2: #approx-equal puzzle
                if can_all_be_green(guesses, guess1, guess2):
                    return( (sols[0], (word1, word2)) )

    return False

def is_solvable(guesses, guess1, guess2, poss1, poss2):
    word1, col1 = guess1
    word2, col2 = guess2

    gc = col1.count("g")
    yc = col1.count("y")
    gc2 = col2.count("g")
    yc2 = col2.count("y")

    sols = list(set(poss1) - (set(poss1) - set(poss2)))

    res = check_valid_pattern(gc, yc, gc2, yc2, sols, word1, word2, guesses, guess1, guess2)
    if res:
        return res

def pair_generator(guesskeys):
    for i in range(0, len(guesskeys)):
        for j in range(i+1, len(guesskeys)):
            pair = (guesskeys[i], guesskeys[j])
            yield pair
   
def find_solutions(guesses):
    puzzles = []
    print("shuffling input to randomize puzzles")
    guesskeys = list(guesses.keys())
    random.shuffle(guesskeys)
    gen = pair_generator(guesskeys)
    c = 0
    
    while True:
        guess1, guess2 = next(gen)
        if c % 10000 == 0:
            print(c, len(puzzles))
        chk = is_solvable(guesses, guess1, guess2, guesses[guess1], guesses[guess2])
        if chk:
            puzzles.append(chk)
        c += 1
        if len(puzzles) == 250: break
    return puzzles

def wordle_colour(solution, guess):
    colset = ["g", "y", "x"]
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

    return "".join(i for i in col)

##if __name__ == "__main__":
##    guesses = get_all_guesses(WORDLES, EXTENDED_WORDLE)
##    print("guesses found")
##    puzzles = find_solutions(guesses)
##
##    with open("aepuzzles.txt", "w") as f:
##        f.write(";".join(f"{sol}:{word1},{word2}" for (sol, (word1, word2)) in puzzles))
