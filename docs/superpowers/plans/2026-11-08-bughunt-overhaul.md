# Bug Hunt overhaul implementation plan

**Goal:** Make the existing solo insect collecting adventure reliable on keyboard/mouse and touch while preserving saved progress and its voxel art.
**Architecture:** Keep React for overlays. Move the live hunt scene into a pure Three.js engine. Centralize input, collision, scheduling and resource ownership; validate existing save formats without changing keys.
**Tech Stack:** React 18, Three.js, Vite, Node test runner, Playwright browser regression checks.
**Spec:** User requests an autonomous broad bug and controls overhaul, with no questions. Existing CLAUDE.md defines the solo collecting/crafting/pedia loop.

## Constraints and decisions
- Preserve art, habitats, recipes, existing storage keys and accumulated progress; no server or account.
- Work in fresh clone on fix/bughunt-overhaul; no shared main changes.
- Mobile: analog four-direction joystick, independent look drag and action/jump/place buttons, selected by input capability instead of viewport width.
- Pause simulation and clear inputs on craft, Escape, focus loss and hidden page; resume only deliberately.
- Guarantee access to every material, especially starter twig/leaf nodes; regenerate resources in simulation time.
- Avoid consuming resources on invalid placement, duplicate permanent tools or invalid saves.

## Review focus
- Repeated enter/leave and delayed spawns must not leak scenes or mutate unmounted React state.
- Lost pointer capture, touch cancellation, keyboard repeat and focus switching must release held actions.
- Craft panel must fit a small landscape screen and stop world actions.
- Malformed/blocked localStorage must not crash or silently lose catches during the session.
- Large insects must require disabling and still be catchable; aiming must not pass through walls.

## Tasks
1. [x] Reproduce save and controls failures with Node/browser regressions, run baseline build. Assert malformed counts are sanitized, rejected writes remain recoverable during session, net cannot be crafted twice, selling preserves last specimen.
2. [x] Extract hunt engine; add input controller and swept body collision tests (diagonal speed, analog magnitude, thin walls, sliding, one-block steps, jump release). Implement desktop/touch pause/resume, action cooldown/hold and cancellable input.
3. [x] Stabilize resource/capture lifecycle. Test material availability, timer pause/cleanup, targeting occlusion, invalid placements, disposal without destroying shared voxel resources. Add target prompt and progress feedback.
4. [x] Harden saves and house data; preserve existing formats, report session-only storage, keep pedia return context.
5. [x] Run full unit suite, production build and real browser desktop/mobile flows; review complete diff and fix important findings; commit and publish reviewable branch/PR if credentials permit.

## Execution record

Fresh clone isolated from user work; branch fix/bughunt-overhaul. All 22 unit tests and 13 Chrome browser checks pass; production build and diff whitespace checks pass. Independent reviewer identified 3 P2 issues; each reproduced by a failing regression and fixed. No deferred review findings. Existing Vite single-bundle size warning remains documented in docs/bughunt-validation.md. User requested no questions; reviewable branch/PR chosen without changing shared main.
