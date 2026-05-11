# ChamberCounter — v1 specification

> Status: approved for build, 2026-05-11
> Owner: Mike Rouse

## 1. Purpose

A browser-based tool for council whips and party managers to:

1. Configure a council chamber (size + party allocation).
2. Draft a voting scenario by dragging councillors between vote positions (Aye / No / Abstain / Absent).
3. See instantly whether a motion passes under one or more configurable threshold rules.

The audience is people who already understand how council votes work — the UI should feel like a tactile model of the chamber, not a tutorial.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Chamber layout | Semicircle / hemicycle |
| Threshold rules supported | Simple majority of voters; Majority of whole chamber; Mayor's casting vote on tie |
| v1 scope | Core + localStorage scenarios + UK party presets |
| Tech stack | React 18 + Vite + TypeScript (strict) + Tailwind CSS |
| Mayor / Chair | Any councillor can be designated; takes the centre-front seat automatically |
| Target device | Desktop only for v1 (≥1024px viewport). Mobile/touch deferred to v2. |

## 3. Domain model

```ts
type VoteState = 'unassigned' | 'aye' | 'no' | 'abstain' | 'absent'

type Party = {
	id: string
	name: string         // e.g. "Labour"
	colour: string       // hex, e.g. "#E4003B"
}

type Councillor = {
	id: string
	partyId: string
	isMayor: boolean     // exactly zero or one per scenario
	seatIndex: number    // assigned position in the hemicycle (Mayor always centre-front)
	vote: VoteState
}

type ThresholdRule =
	| { kind: 'simple-majority'; mayorBreaksTies: boolean }
	| { kind: 'whole-chamber-majority' }

type Scenario = {
	id: string
	name: string
	chamberSize: number
	parties: Party[]
	councillors: Councillor[]
	enabledRules: ThresholdRule[]   // both rules can be active simultaneously
	createdAt: number
	updatedAt: number
}
```

The Mayor's casting vote is modelled as a flag on the simple-majority rule rather than a separate rule, because it only meaningfully modifies that one calculation.

## 4. UK party presets

One-click "Add UK preset parties" button populates the setup panel with standard colours. Counts default to 0; user adjusts. Presets:

| Party | Hex |
|---|---|
| Labour | `#E4003B` |
| Conservative | `#0087DC` |
| Liberal Democrats | `#FAA61A` |
| Green | `#6AB023` |
| Reform UK | `#12B6CF` |
| SNP | `#FDF38E` |
| Plaid Cymru | `#005B54` |
| Independent | `#888888` |

User can edit names/colours after applying the preset, and can add fully custom parties alongside.

## 5. User flow

1. **Empty state** → "New scenario" CTA prompts for chamber size (1–200).
2. **Setup panel** (docked left) →
	- Chamber size (editable; warns if changed after allocation).
	- "Add UK preset parties" button.
	- Party rows: colour swatch · name · seat count · delete.
	- Live remaining-seats counter ("48 / 52 assigned, 4 remaining").
	- Mayor selector: dropdown of all allocated councillors (label = "Party — #seatIndex"), or "None". Selected Mayor takes the centre-front seat automatically.
	- "Apply" button enabled only when party counts sum to chamber size.
3. **Chamber view** (main canvas) → SVG hemicycle of dots, coloured by party, Mayor visually distinguished (subtle ring/crown). Four labelled drop zones beneath: **Aye**, **No**, **Abstain**, **Absent**. Drag dots into zones; drag back to the chamber to unassign.
4. **Tally panel** (docked right) →
	- Counts by vote state.
	- Compact party × vote-state matrix (spot rebels at a glance).
	- One result card per enabled rule, e.g.
		- *Simple majority of voters* → **PASSES 27–24** (1 abstain, 0 absent)
		- *Majority of whole chamber* → **FAILS** (needs 27 ayes from 52)
		- *Tie → Mayor (Lab) casts AYE → PASSES*
5. **Scenarios sidebar** (collapsible) → list of saved scenarios; current one auto-saves to a `draft` slot; named saves explicit ("Budget 2026 worst case"). Rename / duplicate / delete from a per-item menu.

## 6. Hemicycle layout

SVG-based. Algorithm:

- Pick row count R = `clamp(round(sqrt(N / 3)), 3, 10)`.
- Distribute N seats across rows proportionally to arc length (outer rows hold more seats).
- Mayor seat: reserved at row 0, centre — not part of the algorithmic distribution, the other N−1 seats fill around it.
- Stable seat assignment: councillors keep the same seat across re-renders even as votes change. Vote state changes the dot's *position on the canvas* (moves out of the hemicycle into a zone), not its identity.

Dots are circles with party-colour fill, white stroke, hover lift. Drop zones are large rounded rectangles below the hemicycle; dropped dots arrange in a tidy grid within each zone.

## 7. Threshold evaluation

```ts
function evaluate(scenario): RuleResult[] {
	const c = countByVote(scenario.councillors)
	const total = scenario.chamberSize

	return scenario.enabledRules.map(rule => {
		if (rule.kind === 'simple-majority') {
			if (c.aye > c.no) return PASS
			if (c.no > c.aye) return FAIL
			// tie
			if (rule.mayorBreaksTies && mayorHasVoted(scenario)) {
				return mayorVote(scenario) === 'aye'
					? PASS_BY_CASTING
					: FAIL_BY_CASTING
			}
			return TIE
		}
		if (rule.kind === 'whole-chamber-majority') {
			const needed = Math.floor(total / 2) + 1
			return c.aye >= needed ? PASS : FAIL
		}
	})
}
```

### Edge cases

- **Unassigned councillors** — surfaced in the tally as "Not yet voted: N" so the whip knows the count is incomplete.
- **Mayor marked but absent** — casting-vote rule is greyed out with explanatory tooltip.
- **Mayor marked but hasn't voted (still unassigned)** — casting-vote rule shows "pending Mayor vote".
- **Chamber size reduced after allocation** — prompt user to rebalance party counts rather than silently truncating councillors.
- **Party deleted with councillors still allocated to it** — block deletion until count is set to 0.

## 8. Persistence

`localStorage` key `chambercounter:v1`. Shape:

```ts
{
	scenarios: Scenario[],
	draftId: string | null,    // current working scenario
	settings: { theme: 'light' | 'dark' }
}
```

Hydration on mount; debounced save (300ms) on changes. No backend, no network calls.

## 9. Tech & libraries

- **Vite + React 18 + TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **Zustand** for state (single store, persisted via `zustand/middleware/persist`)
- **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/modifiers`) — pointer + keyboard drag support (touch deferred but the library gives it free if we want it in v2)
- **Vitest + Testing Library** for unit tests on threshold logic, hemicycle layout, and store reducers
- No router needed

## 10. File structure

```
src/
	main.tsx
	App.tsx
	domain/
		types.ts              // Party, Councillor, Scenario, VoteState
		threshold.ts          // evaluate() + tests
		hemicycle.ts          // seat layout algorithm + tests
		factory.ts            // newScenario(), newCouncillors()
		presets.ts            // UK party presets
	store/
		useChamberStore.ts    // Zustand store + persist middleware
	components/
		SetupPanel.tsx        // chamber size + party allocation + Mayor select
		PartyRow.tsx
		Chamber.tsx           // SVG hemicycle
		Seat.tsx              // draggable dot
		VoteZone.tsx          // droppable bin
		TallyPanel.tsx        // counts + rule results
		ScenariosSidebar.tsx
		ResultCard.tsx
	hooks/
		useDragCouncillor.ts
	styles/
		index.css
```

## 11. Phased build plan

Each phase is a commit boundary.

| Phase | Deliverable | Verifiable by |
|---|---|---|
| 0 | Vite scaffold, Tailwind wired, dnd-kit installed, empty `App` renders | `npm run dev` shows blank page, no console errors |
| 1 | Domain types + `threshold.ts` + `hemicycle.ts` + `presets.ts` with unit tests | `npm test` green |
| 2 | Zustand store with persist; can create scenarios from devtools | Manual: refresh persists state |
| 3 | `SetupPanel` — chamber size + party rows + UK preset button + Mayor select + validation | Allocate 52 seats across 4 parties, pick Mayor |
| 4 | `Chamber.tsx` — renders hemicycle of correctly-coloured dots, Mayor centre-front | Visual: dots match party counts; Mayor visibly distinguished |
| 5 | `VoteZone` + dnd-kit wiring — dragging changes vote state | Drag a dot to Aye → vote state updates |
| 6 | `TallyPanel` — live counts + rule results incl. Mayor casting | Toggle Mayor flag, verify tie resolution |
| 7 | `ScenariosSidebar` — save/load/rename/duplicate/delete named scenarios | Persisted across refresh |
| 8 | Polish — dark mode, keyboard a11y for drag, focus management, empty/error states | Keyboard-only run-through works end-to-end |

## 12. Out of scope for v1

Logged here so they're not forgotten:

- Mobile / touch layout (deferred to v2)
- Export to PNG / PDF
- Shareable URL-encoded scenarios
- Cloud sync / multi-user
- Configurable supermajority thresholds (2/3, 75%, etc.)
- Whip predictions ("if 3 backbenchers rebel…") — interesting v2 feature
- Multiple motions in one scenario / vote history
