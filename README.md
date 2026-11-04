# The Thinking Behind: sealed list

A filmed prop. The page holds real company decisions as black bars. One bar opens at random. You guess on camera, lock the guess, and only then see the sources.

It is a plain static page. It has no dependencies, no build step and no server.

## Use it
Open `index.html` in Chrome and press `F` for full screen. To try it with demo entries, add `?demo` to the address. Each demo entry says what a real entry holds in that spot.

| Key | What it does | When |
|---|---|---|
| `Space` | Open a file at random | Bars showing |
| `X` | Reject this topic | Before you lock the guess |
| `G` | Lock my guess | After you say the guess |
| `S` | Open the sources | After you lock the guess |
| `C` | Close this file | After you open the sources |
| `F` | Full screen | Any time |
| `0` `0` | Clear the record of opened files | Any time |

## The rules the page enforces
- The pick uses the browser's secure random numbers. You cannot choose an entry.
- A reload returns to the open file. It does not give a new draw.
- After you lock a guess, you cannot reject the topic.
- A used entry does not come back. Rejected entries stay on the wall with a hatched bar, so the count stays honest.

The browser keeps the record per address, so always open the file from the same place.

## The sealed list
Only an agent fills the list. You do not fill it or read it.

```bash
node seal.mjs entries.json
```

`entries.json` is an array of `{ thing, question, sources: [{ title, url }] }`. Every entry needs at least one source that the agent opened. Delete `entries.json` after you seal it. The script prints counts only.

The seal stops you from reading an entry by accident. It is not encryption. Anyone who wants to decode the list can do so. Also, the session that fills the list has the entries in its transcript, so do not read that transcript.

## Change it
- **The blue:** edit `--wall` at the top of `styles.css`, to match your wall.
- **The fonts:** Futura and Avenir Next come with macOS. A public version needs web fonts.

## Scoreboard
The screen behind you on camera is in `scoreboard/`. See its README.

## Going public
This page is the private prop. `sealed.js` must never be deployed. It is git-ignored, and the deploy publishes `scoreboard/` only, so keep your own copy of it. The public version uses a separate list of finished decisions. See `ttb-open-work` in the vault for the trigger.
