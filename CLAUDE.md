# ChamberCounter — project context for AI agents

This document orients an AI agent picking up the codebase. The README is for end users; this is for you.

## What this is

A single-page React app that models UK council votes. Whips and party managers configure a chamber (size, parties, optional Mayor/Chair), drag councillors between vote zones, and see live pass/fail results under several configurable threshold rules.

Deployed to GitHub Pages at <https://mikerouse.github.io/ChamberCounter/> via the workflow in `.github/workflows/deploy.yml` on every push to `main`. No backend; scenarios are stored in `localStorage` and shareable via base64-encoded URL hashes.

## Tech stack

- **React 19** + **Vite 8** + **TypeScript 6** (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/vite` (class-based variants; no PostCSS config)
- **Zustand 5** for state (`zustand/middleware/persist` for localStorage)
- **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/modifiers`) for dot drag-and-drop
- **motion** (the new framer-motion, package name `motion`, imported from `motion/react`) for layout animations (dots gliding between seats and zones) and `Reorder` (drag-to-reorder parties and scenarios)
- **html-to-image** for PNG export
- **Vitest 4** + Testing Library + jsdom for unit tests
- Indentation: **tabs (4 spaces wide)** — set in `.vscode/settings.json` and `eslint`/`tsc` are agnostic; CLAUDE.md user preference

## Directory layout

```
src/
  main.tsx                  Bootstrap
  App.tsx                   Layout shell: header, drawers, main section. Wires keyboard
                            shortcuts (Ctrl+Z/Y) and the share-URL import flow.
  index.css                 Tailwind import + minimal base styles + print stylesheet
  domain/                   Pure logic, no React. Fully unit-tested.
    types.ts                Party, Councillor, Scenario, VoteState, RuleResult, etc.
                            Plus presentCount(), effectiveQuorum(), defaultQuorum().
    threshold.ts            evaluate() — runs each enabled rule, returns RuleResult[].
    hemicycle.ts            layoutHemicycle() — places seats on concentric arcs.
                            Forces row 0 to have an odd count so the Mayor seats centre.
    factory.ts              newScenario(), newId(), newParty(), newCouncillor().
    presets.ts              UK party preset list with hex colours.
    notePresets.ts          Whip-style note presets (On leave → Absent, etc.) — shared
                            by CouncillorsList and ContextMenu so they stay in sync.
    display.ts              buildDisplayNames(): turns councillor + party data into
                            "Sarah Smith" or "Labour #3" labels.
    share.ts                base64-url encode/decode of a scenario into the URL hash.
  store/
    useChamberStore.ts      Single Zustand store. Persisted: scenarios, scenarioOrder,
                            currentScenarioId. Not persisted: history / redoStack.
    toasts.ts               Tiny standalone toast store + `toast(msg, kind)` helper.
  components/               React UI. Each component file does one thing.
  hooks/
    useFocusTrap.ts         Tab trap for the mobile drawers.
  test/
    setup.ts                Vitest setup — imports jest-dom matchers.
```

Path alias `@/` resolves to `src/`.

## Domain model (current)

```ts
type VoteState = 'unassigned' | 'aye' | 'no' | 'abstain' | 'absent'
type CastingVote = 'aye' | 'no'

type Party = { id; name; colour }

type Councillor = {
  id; partyId; isMayor; seatIndex; vote
  name?    // user override (else "Labour #3")
  notes?   // whip note ("Wobbly", "Sick", custom text)
}

type ThresholdRule =
  | { kind: 'simple-majority'; mayorBreaksTies: boolean }
  | { kind: 'whole-chamber-majority' }
  | { kind: 'supermajority'; numerator: number; denominator: number }

type Scenario = {
  id; name; chamberSize; parties; councillors; enabledRules
  castingVote?  // separate from any councillor's normal vote
  quorum?       // override; default is ceil(chamberSize / 4), min 3
  createdAt; updatedAt
}
```

`RuleOutcome` includes `pass | fail | tie | pass-by-casting | fail-by-casting | pending-casting`. The `pending-casting` outcome means simple-majority is tied, a Mayor is designated, `mayorBreaksTies` is on, and `scenario.castingVote` is still unset — the ResultCard renders Cast Aye / Cast No buttons in that state.

## Key state patterns

### Store shape (Zustand)

`useChamberStore` is the single source of truth. Everything except history/redo is persisted to `localStorage` under `chambercounter:v1`. `onRehydrateStorage` migrates older shapes that lacked `scenarioOrder`.

### History / undo

Every "deliberate" mutation goes through `withScenarioUpdateAndHistory` which pushes the previous state onto `history[scenarioId]` (cap 50) and clears `redoStack[scenarioId]`. Text-edit mutations (renameScenario, renameCouncillor, updateParty) deliberately use `withScenarioUpdate` (no history) so the user doesn't get character-by-character undo. Same for `setQuorum`. App.tsx wires Ctrl+Z/Y but bails out when focus is in an `INPUT` / `TEXTAREA` / `SELECT` / `contenteditable` so native edit-undo still works.

### Seat assignment

`reassignSeats(scenario)` is called whenever the councillor set changes. It sorts councillors by party index in `parties[]`, then within-party by id. If a Mayor is designated, it swaps the Mayor's seatIndex with the layout-calculated centre-front position (row 0, middle slot). Reordering parties therefore changes the visual seating left-to-right.

### Drag-and-drop (dnd-kit)

- **MouseSensor** (`distance: 4`) for instant desktop drag.
- **TouchSensor** (`delay: 180, tolerance: 6`) — long-press to start drag on touch so a quick swipe scrolls the page instead.
- **KeyboardSensor** for keyboard accessibility.
- Dots are `useDraggable`; the hemicycle and four vote zones are `useDroppable`. `onDragEnd` reads `over.data.current.vote` and calls `setVote`.
- Accessibility announcements wired via `DndContext accessibility={{ announcements }}` — party name + Mayor flag spoken on pickup / over / drop / cancel.

### Animation (motion)

- `Dot` is a `motion.div` with `layoutId={`dot-${id}`}` and `layout` toggled off during drag (`layout={!isDragging}`). This is what makes dots glide from seat → zone → zone smoothly even though they unmount/remount across parents.
- A second, non-interactive `motion.div` "ghost" is rendered at each voted councillor's seat at 22% opacity inside `<AnimatePresence>` so the hemicycle visualises the seating even after votes are cast.
- `Reorder.Group` / `Reorder.Item` (with `dragListener={false}` + explicit `useDragControls` handle) for sortable lists. Use `as="div"` because the default `<li>` clashes with the existing ref types.

### Toast notifications

`src/store/toasts.ts` exports `useToastStore` and a `toast(message, kind)` helper. `<Toasts />` mounts once in `App.tsx`, animates with `AnimatePresence`. Auto-dismisses after 3.5 s. Used for share success, PNG export results, etc.

### Sharing

`src/domain/share.ts` encodes a Scenario into a URL-safe base64 string in the hash (`#share=...`). On mount, `App.tsx` reads the hash, prompts the user to import, and clears it. `importSharedScenario` regenerates party + councillor IDs so the imported scenario can't collide with existing ones. `buildShareUrl` produces the URL; `handleShare` in ScenariosSidebar tries `navigator.share` first (system share sheet on mobile/modern desktops), falls back to clipboard + toast.

## Conventions

- **Mobile-first responsive**: the centre column (chamber) is always visible; SetupPanel and TallyPanel are off-canvas drawers below `lg` (1024 px) and static columns at `lg+`. Sticky `MobileTallyPill` shows pass/fail counts at the top of the centre column on mobile.
- **Feature parity**: nothing in the app should be reachable *only* via right-click. Every right-click action is also surfaced via a visible button (CouncillorsList chips, PartyRow buttons, ContextMenu opened via left-click too).
- **Print + screenshot friendly**: `@media print` in `index.css` hides side panels and buttons; the "Compact" header toggle hides drawers on desktop for clean screenshots; PNG export captures the centre section only.
- **No comments unless the why is non-obvious.** Variable names should carry intent.

## Gotchas

- **The Dot has three position modes**. In the hemicycle it uses `position: absolute` with percentage `left/top` plus `transform: translate(-50%, -50%)` to centre on the seat point. In a vote zone it uses `position: relative` and flexes normally. During drag, dnd-kit adds an inline `transform: translate3d(...)`. Don't change the `position` rules carelessly — see git commit `8eeab23` for the time the Mayor ring escaped the page because `static` ancestors broke the absolute child anchor.
- **dnd-kit + motion's `layout`**: the spring transition fights the pointer if layout animation is on during an active drag. Always gate `layout={!isDragging}` on motion items that are also draggable.
- **Casting vote is independent of the Mayor's normal vote.** It's stored on the Scenario, not on the Mayor councillor. The Mayor's piece does not move when the casting vote is set; the casting is shown as a +1 in the result explanation. This was a deliberate refactor in commit `817e211`.
- **History push uniqueness**: `withScenarioUpdateAndHistory` shallow-compares with `===` to avoid no-op history entries. If a mutation logically returns the same scenario (e.g. trying to remove a party that still has councillors), history shouldn't grow.
- **Stale IDE diagnostics**: when an Edit adds an import and a later Edit uses it, the linter snapshot between those two writes will flag the import as unused. The build will pass. Don't chase these.

## Build / test / deploy

```bash
npm run dev          # Vite dev server on :5173
npm run build        # tsc -b && vite build
npm run test         # vitest watch
npm run test:run     # vitest single run
npm run preview      # serve dist/ for a build smoke test
```

Deployment is automatic: any push to `main` runs `.github/workflows/deploy.yml` which installs, tests, builds, uploads the artifact, and deploys to GitHub Pages. The Vite `base` is conditional in `vite.config.ts` — `/` in dev, `/ChamberCounter/` in production.

## What's intentionally out of scope

- **Dark mode** — adding `dark:` variants across every component is a v2-sized pass.
- **Cloud sync / accounts** — the appeal of the app is that it's a local notepad. Sharing is intentionally via URL hash.
- **Margin-to-win indicator** — the user explicitly turned this down.
- **Whip-level tags (1/3-line whip)** — the user explicitly turned this down. The freeform `notes` field plus presets covers the practical need.
- **PDF export** — PNG covers it for briefing packs.
