# Ideas

Features worth building, roughly in order of interest. Each one names what it would reuse. Move an
idea to "Planned" once its plan is agreed, and remove it once it ships (the README lists what
exists).

## Planned

- **Play it back (ear training on the guitar).** The app plays a short phrase (an interval or a
  3–4 note melody from a scale), giving the first note; you find it on the neck and the microphone
  checks the notes in order. Ear training apps answer with buttons; this one answers on the
  guitar. Reuses note detection (`MicListener`), the fretboard and the card flow; new is a plucked
  string sound, played in the browser.

## Later

- **Drone or backing loop.** A held root note, or a simple two-chord loop, to improvise over with
  the scale shape shown on the neck. Reuses the scale catalog, scale positions and the audio
  scheduling of `Metronome`; the plucked sound from Play it back would help. Open question: synth
  sounds only, or a few recorded loops (they'd have to be cached for offline use).
- **Scales in time.** Play a scale position up and down in eighth notes with the metronome; the
  app checks both the notes and the timing, with a tempo ladder like play along. The most
  ambitious: note detection (`MicListener`) and strike timing (`RhythmListener`) open the
  microphone separately today and would have to share one input and one audio clock.
- **Practice calendar.** A heatmap of the days you practised, and minutes per module, with a
  streak. Built from the session log (`PracticeLog`) the app already keeps; no new data needed.
- **Back up and move progress.** Everything lives in one browser: a phone and a computer keep
  separate stats, and clearing site data loses it all. Export everything under the storage prefix
  to a file, and import it elsewhere (with a check of the format version).

## Small follow-ups

- **Play along:**
  - merge Next and Play into one click after a take
  - set `ownResult` on its session: the frame's "Correct, 20 s" line under a take's own result
    says little
- **Tuner:**
  - string rows for other tunings (drop D, half a step down)
  - an adjustable reference pitch (A = 432 to 446)
  - a tuning-fork button in each module's top bar (leaving a module ends a running session)
- **Chord changes:** open chord diagrams for the chords of a pair.
- **Packaging:** a Tauri build for a native installer or a phone app.
- **Testing:** a WebKit microphone test, if the app gets used on an iPhone.
