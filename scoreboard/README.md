# Scoreboard

The screen behind you on camera: a lamp match board, Kushaagra in green against an opponent in red. Plain static files with no build step and nothing to install.

## Use it
Run `./serve.sh`, open http://localhost:4827 in Chrome, and put the window in full screen. For another port, run `./serve.sh 5000`.

The layout follows the screen shape. A wide screen puts the two corners side by side. A tall screen stacks them, with the opponent below, and the record runs in two rows. To use a monitor upright, turn it in System Settings, Displays, Rotation.

## Change the score
Edit [score.json](score.json) and save it. Reload the page to load it.

| Field | What it does |
|---|---|
| `player` | Your name, on the green side |
| `opponent` | The name on the red side. Locked as The Sources |
| `guesses` | One letter per guess, oldest first: `r` when the guess held, `w` when it failed. `rrw` is 2–1 |
| `dim` | Screen dimming, from `0` (none) to `0.7` (darkest) |

## Film the score change
| Key | What it does |
|---|---|
| `K` | Point to Kushaagra, with the bell |
| `S` | Point to the opponent, with the buzzer |

Open the page with the old score, start recording, then press the key. These points are not saved, so a reload clears them and returns to `score.json`. After the piece, add the letter to `guesses` to keep the point.

If the file has a mistake, a line in the bottom corner says what failed. Fix the file and reload.

To change the colours, edit the tokens at the top of `styles.css`, after the two font blocks.

## On GitHub Pages
`.github/workflows/deploy.yml` at the repository root builds the public site and publishes the scoreboard at `/scoreboard/`. The build includes only its runtime files, fonts and favicon. To change the saved score there, edit `score.json` and push. The change appears after GitHub finishes deploying and you reload.

## Fonts
Bungee and Bungee Inline are in `fonts/`, under the SIL Open Font License (`fonts/OFL.txt`).

The badge uses `bungee-vs-400-normal.woff2`, a subset of the original Bungee font with only `V` and `S`. Its glyph outlines, advance widths and vertical metrics are unchanged. Names still use the complete Bungee Inline font, so changing a name does not require a new subset. The main app keeps its original full Bungee font.

To regenerate the badge font with [FontTools](https://fonttools.readthedocs.io/en/latest/subset/) (generated with FontTools 4.68.0 and Brotli 1.2.1):

```bash
pyftsubset scoreboard/fonts/bungee-latin-400-normal.woff2 --text=VS --layout-features='*' --flavor=woff2 --output-file=scoreboard/fonts/bungee-vs-400-normal.woff2
```

Run this command from the repository root. The generated font is checked in; normal site builds need only the existing Node.js build tool.
