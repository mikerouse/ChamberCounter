import { useMemo, useState } from 'react'
import { buildDisplayNames } from '@/domain/display'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import type { VoteState } from '@/domain/types'

type NotePreset = {
	label: string
	note: string
	vote?: Exclude<VoteState, 'unassigned'>
	hint: string
}

const NOTE_PRESETS: NotePreset[] = [
	{ label: 'On leave', note: 'On leave', vote: 'absent', hint: 'Marks Absent and notes the reason' },
	{ label: 'Sick', note: 'Sick', vote: 'absent', hint: 'Marks Absent and notes the reason' },
	{ label: 'Paired', note: 'Paired', vote: 'abstain', hint: 'Pairing arrangement → Abstain' },
	{ label: 'Conflict', note: 'Conflict of interest', vote: 'abstain', hint: 'Legal duty to abstain' },
	{ label: 'Mat/Pat', note: 'Maternity / paternity leave', vote: 'absent', hint: 'Marks Absent and notes the reason' },
	{ label: 'Free vote', note: 'Free vote', hint: 'Tags as free vote, leaves vote untouched' },
	{ label: 'Wobbly', note: 'Wobbly', hint: 'Tags as wobbly, leaves vote untouched' },
	{ label: 'Likely rebel', note: 'Likely rebel', hint: 'Tags as likely rebel, leaves vote untouched' },
]

const VOTE_BUTTONS: Array<{ vote: Exclude<VoteState, 'unassigned'>; label: string; activeClass: string; idleClass: string }> = [
	{
		vote: 'aye',
		label: 'A',
		activeClass: 'bg-emerald-600 text-white',
		idleClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
	},
	{
		vote: 'no',
		label: 'N',
		activeClass: 'bg-rose-600 text-white',
		idleClass: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
	},
	{
		vote: 'abstain',
		label: 'Ab',
		activeClass: 'bg-amber-600 text-white',
		idleClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
	},
	{
		vote: 'absent',
		label: 'Out',
		activeClass: 'bg-slate-700 text-white',
		idleClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
	},
]

type CouncillorRow = {
	id: string
	partyId: string
	partyName: string
	partyColour: string
	isMayor: boolean
	vote: VoteState
	placeholder: string
	name: string
	notes: string
}

type PartyGroup = {
	partyId: string
	partyName: string
	partyColour: string
	rows: CouncillorRow[]
}

export function CouncillorsList() {
	const scenario = useChamberStore(selectCurrentScenario)
	const setVote = useChamberStore(s => s.setVote)
	const renameCouncillor = useChamberStore(s => s.renameCouncillor)
	const setCouncillorNotes = useChamberStore(s => s.setCouncillorNotes)
	const [query, setQuery] = useState('')
	const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
	const [collapsedParties, setCollapsedParties] = useState<Record<string, boolean>>({})

	const rows = useMemo(() => {
		if (!scenario) return [] as CouncillorRow[]
		const names = buildDisplayNames(scenario.councillors, scenario.parties)
		const partyOrder = new Map<string, number>()
		scenario.parties.forEach((p, i) => partyOrder.set(p.id, i))
		const sorted = [...scenario.councillors].sort((a, b) => {
			const pa = partyOrder.get(a.partyId) ?? Number.MAX_SAFE_INTEGER
			const pb = partyOrder.get(b.partyId) ?? Number.MAX_SAFE_INTEGER
			if (pa !== pb) return pa - pb
			return a.id.localeCompare(b.id)
		})
		return sorted.map(c => {
			const party = scenario.parties.find(p => p.id === c.partyId)
			const placeholder = names.get(c.id) ?? c.id
			return {
				id: c.id,
				partyId: c.partyId,
				partyName: party?.name ?? 'Unassigned',
				partyColour: party?.colour ?? '#94a3b8',
				isMayor: c.isMayor,
				vote: c.vote,
				placeholder,
				name: c.name ?? '',
				notes: c.notes ?? '',
			}
		})
	}, [scenario])

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return rows
		return rows.filter(
			r =>
				r.partyName.toLowerCase().includes(q) ||
				r.placeholder.toLowerCase().includes(q) ||
				r.name.toLowerCase().includes(q) ||
				r.notes.toLowerCase().includes(q),
		)
	}, [rows, query])

	const groups = useMemo<PartyGroup[]>(() => {
		const map = new Map<string, PartyGroup>()
		for (const r of filtered) {
			const existing = map.get(r.partyId)
			if (existing) {
				existing.rows.push(r)
			} else {
				map.set(r.partyId, {
					partyId: r.partyId,
					partyName: r.partyName,
					partyColour: r.partyColour,
					rows: [r],
				})
			}
		}
		return Array.from(map.values())
	}, [filtered])

	const filterActive = query.trim().length > 0

	const applyPreset = (councillorId: string, preset: NotePreset) => {
		if (!scenario) return
		setCouncillorNotes(scenario.id, councillorId, preset.note)
		if (preset.vote) setVote(scenario.id, councillorId, preset.vote)
	}

	if (!scenario || rows.length === 0) return null

	return (
		<div className="border-b border-slate-200 px-4 py-3">
			<div className="flex items-baseline justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Councillors</h2>
				<span className="text-[10px] text-slate-400 tabular-nums">{filtered.length} / {rows.length}</span>
			</div>
			<input
				type="search"
				value={query}
				onChange={e => setQuery(e.target.value)}
				placeholder="Filter by name or party…"
				className="mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
			/>
			<div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
				{groups.map(group => {
					const isCollapsed = !filterActive && (collapsedParties[group.partyId] ?? false)
					return (
						<div key={group.partyId} className="space-y-1.5">
							<button
								type="button"
								onClick={() =>
									setCollapsedParties(prev => ({ ...prev, [group.partyId]: !isCollapsed }))
								}
								aria-expanded={!isCollapsed}
								className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100"
							>
								<svg
									width="10"
									height="10"
									viewBox="0 0 16 16"
									className={`shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
									fill="currentColor"
								>
									<path d="M6 4l4 4-4 4V4z" />
								</svg>
								<span
									className="inline-block h-2 w-2 shrink-0 rounded-full"
									style={{ backgroundColor: group.partyColour }}
								/>
								<span className="flex-1 truncate">{group.partyName}</span>
								<span className="tabular-nums text-slate-400">{group.rows.length}</span>
							</button>
							{!isCollapsed && group.rows.map(row => {
								const isNotesOpen = expandedNotes[row.id] ?? row.notes.length > 0
								return (
									<div key={row.id} className="ml-3 rounded border border-slate-100 bg-slate-50/50 p-2">
							<div className="flex items-center gap-2">
								<span
									className="inline-block h-2 w-2 shrink-0 rounded-full"
									style={{ backgroundColor: row.partyColour }}
								/>
								<input
									type="text"
									value={row.name}
									onChange={e => renameCouncillor(scenario.id, row.id, e.target.value)}
									placeholder={row.placeholder}
									className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs focus:border-slate-400 focus:outline-none"
									aria-label={`Name for ${row.placeholder}`}
								/>
								{row.isMayor && (
									<span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
										Mayor
									</span>
								)}
								<button
									type="button"
									onClick={() => setExpandedNotes(prev => ({ ...prev, [row.id]: !isNotesOpen }))}
									aria-expanded={isNotesOpen}
									aria-label={`${isNotesOpen ? 'Hide' : 'Show'} notes for ${row.placeholder}`}
									title="Notes"
									className={`rounded p-0.5 ${row.notes ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
								>
									<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
										<path d="M3 3h10v9l-3 2H3z" />
										<path d="M5.5 6.5h5M5.5 9h3.5" strokeLinecap="round" />
									</svg>
								</button>
							</div>
							<div className="mt-1.5 grid grid-cols-4 gap-1">
								{VOTE_BUTTONS.map(b => (
									<button
										key={b.vote}
										type="button"
										onClick={() => setVote(scenario.id, row.id, b.vote)}
										aria-pressed={row.vote === b.vote}
										className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
											row.vote === b.vote ? b.activeClass : b.idleClass
										}`}
									>
										{b.label}
									</button>
								))}
							</div>
							{isNotesOpen && (
								<div className="mt-2 border-t border-slate-100 pt-2">
									<input
										type="text"
										value={row.notes}
										onChange={e => setCouncillorNotes(scenario.id, row.id, e.target.value)}
										placeholder="Add a note…"
										className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs focus:border-slate-400 focus:outline-none"
										aria-label={`Notes for ${row.placeholder}`}
									/>
									<div className="mt-1.5 flex flex-wrap gap-1">
										{NOTE_PRESETS.map(p => (
											<button
												key={p.label}
												type="button"
												onClick={() => applyPreset(row.id, p)}
												title={p.hint}
												className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900"
											>
												{p.label}
											</button>
										))}
										{row.notes && (
											<button
												type="button"
												onClick={() => setCouncillorNotes(scenario.id, row.id, '')}
												title="Clear note"
												className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"
											>
												Clear
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					)
				})}
						</div>
					)
				})}
				{filtered.length === 0 && (
					<p className="py-2 text-center text-xs italic text-slate-400">No matches.</p>
				)}
			</div>
		</div>
	)
}
