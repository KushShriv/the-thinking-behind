# The Thinking Behind

A practice tool, and a prop for the videos. It has two modes. It is a plain static page with no dependencies, no build step and no server.

- **Classic:** read a real story that stops before the decision. Write your call and your reason. The page builds a prompt, and you paste it into an AI tool. The prompt asks the AI to read your sources, find additional reliable sources, and compare your reasoning with the evidence. It separates what was known at the time from later outcomes. The AI's reply starts with a verdict and what you missed. Check Right, Partly right or Wrong, add what you missed if you want, and the page makes a clean card to screenshot. The page itself never gives the answer.
- **Arcade:** a quick question. Lock your guess to see the answer and the sources. Mark if you got it, and the cabinet shows a Right or Wrong screen to screenshot. It can hold trivia that the videos never cover.

## Use it
Open `index.html` in Chrome and press `F` for full screen. To try it with demo entries, add `?demo` to the address. Each demo entry says what a real entry holds in that spot.

| Key | What it does | When |
|---|---|---|
| `1` `2` | Choose Classic or Arcade | Mode choice |
| `Esc` | Change mode, or leave an entry for now | Any time. It comes back when you return |
| `Space` | Open a journal entry or start a level | Journal or start screen showing |
| `X` `X` | Skip this one for good | Before you lock |
| `Return` | Move from your call to your reason | Classic, in the first box |
| `⌘` `Return` | Lock my call | Classic, after you write both boxes |
| `P` | Copy the prompt | Classic, after you lock |
| `V` | Check the verdict, or change it | Classic, after you lock |
| `Y` `H` `N` | Right, Partly right, Wrong | Classic, on the verdict check |
| `Return` | Make my card | Classic, after Partly right or Wrong |
| `B` | Back to the prompt | Classic, on the verdict check |
| `C` | Done, or close without a verdict | Classic, after you lock |
| `Return` | Next box, then lock my guess and see the answer | Arcade |
| `G` | Lock my guess and see the answer | Arcade, outside the boxes |
| `Y` `N` | I got it, I missed it | Arcade, after the answer |
| `Space` | Next question | Arcade, on the result screen |
| `F` | Full screen | Any time |
| `0` `0` | Clear the record for this mode | Journal or start screen showing |

## The rules the page enforces
- The pick uses the browser's secure random numbers. You cannot choose an entry.
- A reload returns to the open case. It does not give a new draw.
- After you lock, you cannot reject the topic.
- A used entry does not come back. The journal gets thinner as entries are used, and the count stays on screen.
- What you write stays in your browser. It leaves only if you paste the prompt somewhere.

The browser keeps the record per address, so always open the file from the same place.

## The lists
```bash
node seal.mjs entries.json
```

`entries.json` is an array of entries. Every entry needs at least one source that was opened.

```json
[
  { "mode": "classic", "thing": "", "story": "", "question": "", "sources": [{ "title": "", "url": "" }] },
  { "mode": "arcade", "thing": "", "question": "", "answer": "", "sources": [{ "title": "", "url": "" }] }
]
```

- **`story`:** only what was known at that moment. It stops before the decision.
- **`sources`:** Classic sends these to the AI as sources you have already read. They are starting points; they do not need to hold the outcome. The prompt asks the AI to find and check additional sources for the decision, rationale, and outcome.

Delete `entries.json` after you seal it. The script prints counts only.

The seal stops you from reading an entry by accident. It is not encryption. Anyone who wants to decode the list can do so. Also, the session that fills a list has the entries in its transcript.

## Change it
- **The colours:** edit the values at the top of `styles.css`. Match `--wall` to your wall.
- **The fonts:** Rockwell, Baskerville and Avenir Next come with macOS, so a public version needs web fonts. The Arcade font comes from `scoreboard/fonts/`.
- **The motion:** the book, the level reel and the screen power-on are in `app.js`, in `bookTimeline`, `runLevelReel`, `powerOn` and `powerOff`. Change their durations there.

## Scoreboard
The screen behind you on camera is in `scoreboard/`. See its README.

## GitHub Pages
The `Deploy The Thinking Behind to GitHub Pages` workflow publishes the app at the site root and the scoreboard at `scoreboard/`. In the repository's Settings → Pages, select **GitHub Actions** as the source. A push to `main` that changes the app, scoreboard or workflow triggers deployment. You can also run the workflow manually from Actions.

The workflow creates an empty public `sealed.js`. Your local `sealed.js` and `entries.json` stay git-ignored and are never copied into the deployment. Use the home screen's demo link, or add `?demo` to the site URL, to play the placeholder entries. Real public entries need a separate reviewed content list. System fonts have fallbacks; Arcade's web fonts are included in the deployment.

Progress is saved per browser and site address. Progress from a local preview does not transfer to the GitHub Pages address.
