# ChamberCounter

A browser-based vote-modelling tool for council whips, party managers, and anyone who needs to work out *whether the numbers add up* before a motion goes to the chamber.

**Try it:** [mikerouse.github.io/ChamberCounter](https://mikerouse.github.io/ChamberCounter/)

---

## What it does

ChamberCounter lets you build a model of a council chamber — its size, its parties, and (optionally) its Mayor or Chair — and then **drag councillors into vote positions** to see whether your motion passes.

It's the digital equivalent of moving counters around a whiteboard before a difficult vote. You can play out "what if three backbenchers rebel?", check how the maths shifts if four members go absent, and have an answer ready for the Mayor's casting vote before the question is even put.

## Who it's for

- **Whips** working out the maths before a contentious vote.
- **Party managers** modelling scenarios for budget night, motions of no confidence, or constitutional changes.
- **Council officers** explaining vote thresholds to members.
- **Students of local government** wanting an interactive way to understand how casting votes, quorum, and supermajorities actually work.

## Highlights

- **Visual hemicycle** with each councillor as a coloured dot in their seat.
- **Drag-and-drop voting** between Aye / No / Abstain / Absent zones, with smooth animations as dots move.
- **Right-click *and* left-click** any dot for quick actions: rename, mark wobbly, mark sick, set party-wide votes.
- **Built-in UK party presets** (Labour, Conservative, Lib Dem, Green, Reform UK, SNP, Plaid Cymru, Advance UK, Independent) with one-click setup.
- **The Mayor / Chair** is given a crown, takes the centre-front seat, and is prompted for a casting vote whenever a tie arises.
- **Three threshold rules**, switchable per scenario:
  - Simple majority of those voting (with optional Mayor's casting vote).
  - Majority of the whole chamber.
  - Configurable supermajority — 3/5, 2/3, 3/4, or 4/5 — for constitutional changes.
- **Quorum check** with the UK Local Government Act 1972 default (one quarter of the chamber). Banners when you fall below.
- **Whip-style note presets** on every councillor — "On leave", "Sick", "Paired", "Conflict of interest", "Wobbly", etc. Most also adjust the vote automatically.
- **Multiple scenarios** saved in your browser. Drag to reorder, duplicate the awkward one, or share a link with a colleague.
- **Sharing** via URL — copies a self-contained link (no backend involved). On mobile, uses your phone's native share sheet.
- **Undo / redo** with `Ctrl+Z` and `Ctrl+Y` for every deliberate change.
- **PNG export** of the chamber for inclusion in briefings.
- **Mobile-friendly** with side drawers for setup and tally, large touch targets, sticky pass/fail badge, and a button-based path to every feature.

## Quick workflow

1. Open the app — it starts you off with a 57-seat council and the UK party presets loaded at zero.
2. Type your party seat counts in the **Parties** panel until your chamber is fully allocated.
3. (Optional) Pick a **Mayor / Chair** from the dropdown — they'll appear in the centre with a small crown.
4. Drag dots into the **Aye / No / Abstain / Absent** zones — or click a councillor and pick from the menu.
5. Read the result card under the zones. If you've drawn a tie and casting-vote-on-tie is enabled, the Mayor will be prompted.
6. Save the result as a named scenario, share the link with a colleague, or export a PNG for the briefing pack.

## Sharing

Pick **Copy share link** from the kebab menu next to a scenario. Anyone who opens the link is offered a one-click import — no account or backend needed. The whole scenario is encoded inside the URL hash.

## Privacy

Everything happens in your browser. Your scenarios are saved to `localStorage` on your device — there is no server, no analytics, no telemetry. If you clear your browser data, your scenarios go with it. Use **Copy share link** to back up a scenario by sending it to yourself.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Z` / `⌘Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Esc` | Close any open menu or drawer |
| Tab / arrows | Navigate (drag-and-drop is keyboard-accessible) |

## Limitations

- **No accounts, no sync** — by design. Your scenarios live in this browser, on this device.
- **Per-councillor names are local to the scenario.** Real council member lists aren't pre-loaded; you type names you care about, or leave the defaults.

## Feedback

Issues, feature requests, or "this is missing X for my council" notes are welcome on the [GitHub issue tracker](https://github.com/mikerouse/ChamberCounter/issues).
