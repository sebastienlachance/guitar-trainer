# Practice modules

Each folder here is one kind of exercise, listed on the home screen through `registry.ts`.

| Module     | Answer style                                    | Look here for                                            |
| ---------- | ----------------------------------------------- | -------------------------------------------------------- |
| `notes`    | App-checked: tap the fretboard or play the note | The smallest complete module; copy it to start a new one |
| `identify` | App-checked: multiple choice                    | The shared choice buttons, random answer options         |
| `scales`   | App-checked: multiple choice                    | Scale positions on the neck, the shared scale catalog    |
| `triads`   | Self-check: reveal, then Got it / Missed        | An answer template, microphone matching, richer setup    |

Every module has the same shape: `settings.ts`, `deck.ts` (pure logic and tests), a
`*-session.ts` service implementing `Drill`, `*.routes.ts`, and `setup/`, `practice/` and `stats/`
pages built from the shared pieces in `core/`.

How to add one, step by step: [docs/adding-a-practice-module.md](../../../docs/adding-a-practice-module.md).
