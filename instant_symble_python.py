import random

with open("wordles.txt") as f:
    WORDLES = f.read().split(", ")

with open("extendedwordles.txt") as f:
    EXTENDED_WORDLE = f.read().split(", ")

WORD_THRESHOLD = 2
TOTAL_THRESHOLD = 2

def find_pairs(words):
    puzzles = {}
    used_words = []
    random.shuffle(words)
    
    for n, sol in enumerate(words):
        print(f"word {n+1} of {len(words)}")
        colsets = [["g","y","x"],["g","x","y"],["y","g","x"],["y","x","g"],["x","y","g"],["x","g","y"]]

        # step 1: produce all wordle colourings for guess and solution
        guesses = [[],[],[],[],[],[]]
        for word in words:
            if word != sol:
                for i in range(0, 6):
                    info = get_info(word, sol, colsets[i])
                    if not info == None:
                        guesses[i].append((word, info))
        puzzles[sol] = None
                    
        # step 2: pick ordered pairs until we can find a solution
        for i in range(0, len(guesses[0])):
            word1, guess1 = guesses[0][i]
            if puzzles[sol] != None: break
            if not word1 in used_words:
                for k in range(i+1, len(guesses[0])):
                    word2, guess2 = guesses[0][k]

                    if not word2 in used_words:
                        # step 3: find solution using extended word list
                        if find_sols(EXTENDED_WORDLE, [word1, word2], [guess1, guess2]) == [sol]:
                            # final step: confirm that permuting colours doesn't break things
                            solworks = True
                            for j in range(1, 5):
                                word11, guess11 = guesses[j][i]
                                word22, guess22 = guesses[j][k]
                                if len(find_sols(EXTENDED_WORDLE, [word11, word22], [guess11, guess22])) == 1:
                                    solworks = False

                            if solworks:
                                puzzles[sol] = (word1, word2)
                                used_words.append(word1)
                                used_words.append(word2)
                                break
    return puzzles

def wordle_colour(solution, guess, colset = None):
    if colset == None:
        colset = ["g", "y", "x"]
    col = [colset[2], colset[2], colset[2], colset[2], colset[2]]
    observed = []
    for pos, letter in enumerate(guess):
        if guess[pos] == solution[pos]:
            col[pos] = colset[0]
        else: observed.append(letter)

    for pos, letter in enumerate(solution):
        if letter in observed:
            observed.remove(letter)
            if guess[pos] != letter:
                col[pos] = colset[1]

    return "".join(i for i in col)
       

def find_sols(words, guesswords, guessinfos, colset = None):
    sols = []
    for word in words:
        found = True
        for i in range(0, len(guesswords)):
            if get_info(guesswords[i], word, colset) != guessinfos[i]:
                found = False
                break
        if found: sols.append(word)
            
    return sols

def represent(guess):
    info, observed = {}, {}
    letters, colours = guess
        
    for pos in range(0, 5):
        letter, colour = letters[pos], colours[pos]
        if not letter in observed.keys(): observed[letter] = 0
        if colour != "x": observed[letter] += 1
    
    for pos in range(0, 5):
        letter, colour = letters[pos], colours[pos]

        if letter not in info.keys():
            info[letter] = "22222" if observed[letter] > 0 else "00000"
        
        if colour == "g":
            info[letter] = "".join(bit if k != pos else "1" for k, bit in enumerate(info[letter]))
        elif colour == "y":
            info[letter] = "".join(bit if k != pos else "0" for k, bit in enumerate(info[letter]))
        elif colour == "x":
            if observed[letter] != 0: info[letter] = "".join(bit if k != pos else "0" for k, bit in enumerate(info[letter]))

    return info, observed

def get_info(word, sol, colset=None):
    guess = (word, wordle_colour(sol, word, colset))
    info, counts = represent(guess)
    return (info, counts)

def check_word(word, info, counts):
    observed = {}
    for letter in word:
        if not letter in observed.keys():
            observed[letter] = 1
        else:
            observed[letter] += 1
    
    for letter in counts.keys():
        
        if not letter in observed.keys():
            observed[letter] = 0
            
        if counts[letter] == 0 and observed[letter] > 0:
            return False
        elif counts[letter] > 0 and observed[letter] == 0:
            return False
        elif observed[letter] < counts[letter]:
            return False
        else:
            for pos in range(0, 5):
                if info[letter][pos] == "0" and word[pos] == letter:
                    return False
                elif info[letter][pos] == "1" and word[pos] != letter:
                    return False
    return True

#if __name__ == "__main__":
#    puzzles = find_pairs(WORDLES)
