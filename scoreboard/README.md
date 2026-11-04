# Scoreboard

The screen behind you on camera: a lamp match board, Kushaagra in green against an opponent in red. Plain static files with no build step and nothing to install.

## Use it
Run `./serve.sh`, open http://localhost:4827 in Chrome, and put the window in full screen. For another port, run `./serve.sh 5000`.

## Change the score
Edit [score.json](score.json) and save it. Reload the page to load it.

| Field | What it does |
|---|---|
| `player` | Your name, on the green side |
| `opponent` | The name on the red side, for example Reality, The Receipts, Hindsight, The Homework, The Facts, Past Me or The Internet |
| `guesses` | One letter per guess, oldest first: `r` when the guess held, `w` when it failed. `rrw` is 2–1 |
| `dim` | Screen dimming, from `0` (none) to `0.7` (darkest) |

## Film the score change
| Key | What it does |
|---|---|
| `K` | Point to Kushaagra, with the bell |
| `R` | Point to the opponent, with the buzzer |

Open the page with the old score, start recording, then press the key. These points are not saved, so a reload clears them and returns to `score.json`. After the piece, add the letter to `guesses` to keep the point.

If the file has a mistake, a line in the bottom corner says what failed. Fix the file and reload.

To change the colours, edit the tokens at the top of `styles.css`, after the two font blocks.

## On GitHub Pages
`.github/workflows/deploy.yml` at the repository root publishes this folder, and only this folder, at `/scoreboard/`. To change the saved score there, edit `score.json` and push. The change appears after GitHub finishes deploying and you reload.

## Fonts
Bungee and Bungee Inline are in `fonts/`, under the SIL Open Font License (`fonts/OFL.txt`).
