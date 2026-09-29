# Generating new hero clips

Everything the character does comes from 13 clips in `videos/raw/`, concatenated by
`build-hero.py` into `hero-actions.mp4` (actions) and `hero-gaze.mp4` (the two head sweeps).
This file is how to add more without them looking pasted in.

Open `reference/safe-area.jpg` before you write a prompt. It shows, on a real source frame,
what the build keeps and what the page throws away.

---

## 1. Use image-to-video, not text-to-video

This is the whole game. Text-to-video will not reproduce this character twice — the hair,
the shirt, the headphone shape and the exact framing will all drift, and the new clip will
read as a different person the moment it cross-fades in.

Start every generation from one of these, as the **first frame**:

| File | Use it for |
|---|---|
| `reference/ref-headphones-on.jpg` | anything in **work** mode — headphones on his ears |
| `reference/ref-headphones-off.jpg` | anything in **attentive** mode — headphones down on his neck |

Both are real frames pulled from `raw/A1-typing.mp4` and `raw/B1-idle.mp4`, so they carry the
exact character, framing, lighting and backdrop the existing clips have. Regenerate them with:

```
ffmpeg -y -i videos/raw/A1-typing.mp4 -frames:v 1 videos/reference/ref-headphones-on.jpg
ffmpeg -y -ss 0.5 -i videos/raw/B1-idle.mp4 -frames:v 1 videos/reference/ref-headphones-off.jpg
```

If your tool supports an end frame too, give it the **same** image. The clip then returns to
neutral, and the 320 ms cross-fade back into the loop becomes invisible.

---

## 2. Output spec

Match the existing raw files exactly:

- **1920 × 1080**, **24 fps**, **~5 s** (121 frames). Shorter is fine; the build trims.
- **H.264 MP4**, no audio.
- A generator watermark is fine **only** if it lands outside x 330–1590 or below y 940 —
  the build crop discards those. The current clips have one in the bottom-left corner and it
  never reaches the page.

---

## 3. Two constraints the code imposes

These are not style preferences. Break them and the clip will visibly break.

### Keep the action inside the green box

`build-hero.py` crops `1260×940+330+0`, then `style.css` feathers the video's outer edges so
it melts into the page background. Back-projected into the 1920 × 1080 source, the fully
opaque region is:

> **x 532 → 1464, y 132 → 1080**

Above y = 132 the image fades to nothing. His hair already sits almost on that line, so
**anything raised above his head disappears.** No arms-overhead stretches, no big overhead
waves, no hands thrown up. Keep hands at chest height or lower, elbows in.

### A limb enclosing background — now handled, but know why

`normalize()` flattens the drifting red backdrop to one flat colour. It used to do that only
for regions **connected to the frame edge**, so a pose that walls red off from every edge —
a mug raised to the mouth, both hands going up to the headphones — kept its raw drifted red
and showed on the page as a dark shape stuck to him. Measured on `A7-coffee`, that pocket was
11,257 px and 18 levels darker than the page background.

The build now also flattens enclosed regions whose mean distance from the backdrop colour is
under 20. Across all 15 raw clips the two groups separate cleanly:

| | mean distance |
|---|---|
| Backdrop walled off by a limb | **9 – 11** |
| Enclosed skin/clothing shadow (must be left alone) | **32 – 47** |

So you no longer have to avoid these poses. Two things still matter: keep arms *open* enough
that the pocket is a pocket and not a thin sliver, and after building, check the join — if a
pose ever lands between those two bands the flattener has to guess.

### Props must leave with the action

`A7-coffee` ends with the mug sitting on the desk. The work loop it cross-fades back into has
no mug, so the mug dissolves away over the 320 ms fade. It is soft rather than a pop, but it
is visible, and nothing downstream can fix it — cutting the clip earlier does not help
(frame 92 and frame 120 differ from the typing loop by 18.41 vs 18.59, i.e. not at all).

If a clip introduces a prop, have the character **take it back out of frame** before the clip
ends, so the last frame matches the loop it returns to. Anything left on the desk will
evaporate on the next cross-fade.

---

## 4. The blocks to paste

### Character (identical in every prompt — do not paraphrase)

> A stylized 3D animated character, Pixar-style rendering with soft subsurface skin shading:
> a friendly young Indian man in his early thirties, seated at a desk, framed from the waist
> up and centred. Voluminous dark brown-black hair swept up and back, thick dark eyebrows,
> warm medium skin tone, clean-shaven. He wears a cream-ivory long-sleeved button-up shirt
> with an open collar. **{HEADPHONES}** In front of him a silver-grey laptop, screen-back to
> camera, filling the bottom edge of frame.

Replace `{HEADPHONES}` with exactly one of:

- **on** — `Large white padded over-ear headphones worn over his ears, headband across his hair.`
- **off** — `Large white padded over-ear headphones resting down around his neck, off his ears.`

### Scene (identical in every prompt)

> Background: a completely flat, even, solid deep red wall, no gradient, no vignette, no
> texture, no shadow cast on the wall, no props. Lighting: soft even frontal studio key with
> a gentle warm fill, constant for the whole shot. Camera: locked off and completely static —
> no pan, no tilt, no zoom, no dolly, no handheld motion, no parallax. Eye level.

### Negative

> camera movement, zoom, pan, dolly, handheld shake, rack focus, depth of field change, lens
> flare, background gradient, vignette, shadow on wall, background change, scene change, cut,
> extra people, extra hands, text, captions, watermark over the subject, hair colour change,
> clothing change, arms raised above head, hands leaving the top of frame, hand on hip, arms
> akimbo, standing up, leaving the chair

---

## 5. The clips

Name them on the existing convention: **A#** = headphones on, **B#** = headphones off.

### `A7-coffee.mp4` — a sip mid-work *(headphones ON)*

Pairs with the existing line "Coffee first, then Fusion ☕", which currently plays with no
matching motion.

> He is typing on the laptop. He lifts his right hand from the keyboard, picks up a small
> plain white ceramic mug from beside the laptop, raises it to chest height, takes a short
> sip, lowers it back down out of frame, and returns both hands to the keyboard, resuming
> typing. Unhurried and natural. He stays seated and facing camera throughout. The mug and
> both hands stay low, in the lower centre of frame, well below his chin.

Bringing the mug up from below the frame edge is deliberate — the bottom has no feather, so
it can enter from off-screen cleanly.

### `A8-nod.mp4` — bobbing to the music *(headphones ON)*

The music toggle drives a Web Audio head-bob, but a real nodding clip sells it far better
than a transform ever will.

> He is typing on the laptop and nodding his head gently in time with music — a small,
> relaxed, rhythmic head bob at a steady tempo, eyes down on the screen, a faint contented
> smile, shoulders loose and moving very slightly with the beat. His hands stay on the
> keyboard the entire time. The same gentle nod repeats evenly; no other movement.

Keep it *repetitive and even*. `build-hero.py` already has `pingpong()` (it is how the `talk`
loop was made), so a clip that does not loop natively can be made seamless with
`w.add('nod', pingpong(read('A8-nod.mp4')[0:60]))`.

### `B11-point-down.mp4` — showing you what is below *(headphones OFF)*

Pairs with "Projects are just below 👇". `B6-point` is already spent on the `idea` pose
(a raised "one moment" finger), so this needs to be its own clip.

> He looks at the camera with a warm smile, then raises his right hand to chest height and
> points downward with his index finger, glancing down in the direction he is pointing, then
> looks back up to the camera and lowers his hand. Inviting, like showing someone something
> just below. His hand stays in the centre of frame at chest height and never rises above his
> shoulders; his arm stays clear of his body.

### `B12-stretch.mp4` — a tired mid-work stretch *(headphones OFF)*

For the 15 s idle, instead of the current bubble-only "Guess they're reading…".

> He leans back very slightly, rolls his shoulders once and tilts his head from side to side
> in a small tired stretch, briefly closing his eyes, then settles upright again and gives a
> small smile to camera. A relaxed mid-work stretch. His elbows stay low and close to his
> sides and his hands never rise above his shoulders.

**Do not** prompt a classic arms-overhead yawn. It would be cropped and feathered into
nothing, and the raised arms would trap background against his head.

---

## 6. Wiring a clip in

1. Drop the file in `videos/raw/`.
2. Add one line to `build-hero.py`, in the position you want it on the timeline:
   ```python
   w.add('coffee', read('A7-coffee.mp4'))
   ```
3. Re-run it from the repo root:
   ```
   python videos/build-hero.py
   ```
   It re-encodes both videos **and** rewrites `videos/hero-clips.json`, which `script.js`
   fetches at load. The `CLIPS` / `GAZE` literals in `script.js` are only a fallback now, so
   the timeline cannot silently desync — but update them too if you want the fallback correct.
4. Give the behaviour somewhere to fire from: a `playClip('coffee')` in the relevant state,
   and a line in the `#hero-lines` JSON block in `index.html`.

---

## 7. Check before you commit

- Play it next to an existing clip. Same person? Same shirt, same hair volume, same headphone
  shape, same laptop?
- Did the camera hold still? Any drift shows immediately against a flat background.
- Does anything cross above y = 132, or outside x 532–1464?
- Does any pose trap background between a limb and the body?
- Does the first frame match the reference closely enough that a 320 ms cross-fade from the
  previous clip is invisible?
- After building, scrub `hero-actions.mp4` across the join — the backdrop must not shift
  colour between clips.
