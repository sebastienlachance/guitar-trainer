# Ideas

Features worth building, roughly in order of interest. Each one names what it would reuse. Move an
idea to "Planned" once its plan is agreed, and remove it once it ships (the README lists what
exists).

## Planned

Nothing yet: pick from below.

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
- **Metronome page.** A metronome on its own, like the tuner: tempo, beats per bar, accents, tap
  tempo, and a speed trainer that adds a few bpm every few bars. Reuses `Metronome` and its
  light.
- **Hear the changes.** The app plays a short progression (I–IV–V, I–vi–IV–V, ii–V–I) with
  strummed chords; you name it, or play it back. Play it back with chords: reuses `PhrasePlayer`
  (strummed chords would be plucks of each chord tone, a few milliseconds apart) and strum
  matching.
- **Reading music.** A note on a staff; you play it. Learns to read notation with the note
  detection the app already has; new is drawing the staff and the ledger lines in SVG.
- **Voice leading.** The app shows a triad shape, then names the next chord of a progression; you
  play its closest shape, moving as few fingers as possible. Builds on the triads catalog and
  shapes, with arpeggio matching.
- **Daily warm-up.** A guided 10 to 15 minutes chaining modules with timers: tune, chord changes,
  a few notes, a round of play it back. Goes with the practice calendar.
- **Record and listen back.** Record a take and hear it straight away: the quickest way to notice
  timing and buzzing notes. `MediaRecorder` on the open microphone; recordings kept only for the
  session, or saved in IndexedDB if asked.

## Small follow-ups

- **Play along:**
  - merge Next and Play into one click after a take
  - light the current slot of a strumming pattern as it plays (only the beats light today)
  - set `ownResult` on its session: the frame's "Correct, 20 s" line under a take's own result
    says little
- **Tuner:**
  - string rows for other tunings (drop D, half a step down)
  - an adjustable reference pitch (A = 432 to 446)
  - a tuning-fork button in each module's top bar (leaving a module ends a running session)
- **Chord changes:** open chord diagrams for the chords of a pair.
- **Play it back:** longer melodies, more scales (minor, modes), and a choice of the start
  position; the plucked sound could also serve the drone idea above.
- **Packaging:** a Tauri build for a native installer or a phone app.
- **Testing:** a WebKit microphone test, if the app gets used on an iPhone.
