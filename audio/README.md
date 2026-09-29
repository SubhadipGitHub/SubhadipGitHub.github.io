# Hero focus music

The hero's headphone toggle plays **`audio/focus-loop.mp3`**. That file is not in the repo —
drop one in and the control appears by itself.

## What the page does

`script.js` probes the file once the preloader clears. The toggle in the hero stays
`hidden` until the audio fires `canplay`, so a missing or broken file never ships a dead
control — the hero simply has no music button.

Once a track is present, the control is the **focus mode** switch:

- Every visit opens in **non-focus** mode: headphones round his neck, eyes on the cursor,
  greets on hover or click, laughs or goes shy on a double tap. Nothing from focus mode plays.
- Pressing the control (browsers need that gesture before audio) puts the headphones on
  (`hpOn`) and starts the track. He nods along (`nod`), ignores the cursor completely, and
  very occasionally breaks off for a sip of coffee or a glance round (`coffee`, `notice`).
- Pressing it again, or clicking him, takes the headphones off (`hpOff`), fades the track
  out over 1.2 s and drops him back into non-focus mode.
- A `WebAudio` `AnalyserNode` reads the low bins and adds a small beat-driven bob on top of
  the nod clip. The gain node sits upstream of the analyser, so he settles as the track
  fades instead of bobbing in silence.
- The choice is deliberately not remembered: a returning visitor starts in non-focus too.

## Choosing a track

- **Loop it cleanly.** The element is `loop`; an audible seam is very noticeable under a
  headphone-wearing character.
- **Keep it instrumental and low-key.** It plays under a portfolio, at `0.28` gain.
- **A steady beat reads best**, since the bob is driven from the low frequencies. Ambient pads
  with no transients will barely move him.
- **2–4 MB.** It is fetched lazily (`preload="none"` until the hero is on screen), but it is
  still a download.
- **Check the licence.** Pixabay Music, Uppbeat and the Free Music Archive all carry tracks
  usable on a personal site; most require attribution. That is yours to decide.

MP3 is the safe single format. To add alternates, replace the `<audio>` element's `src` in
`index.html` with `<source>` children (`.webm`/Opus first, `.mp3` last).

## Serving

Web Audio needs a same-origin file, so the analyser is skipped on `file://` and the code
falls back to plain element volume. Test over HTTP:

```
python -m http.server 8000
```
