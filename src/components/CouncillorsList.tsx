import { useMemo, useState } from 'react'
import { buildDisplayNames } from '@/domain/display'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import type { VoteState } from '@/domain/types'

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

export function CouncillorsList() {
	const scenario = useChamberStore(selectCurrentScenario)
	const setVote = useChamberStore(s => s.setVote)
	const renameCouncillor = useChamberStore(s => s.renameCouncillor)
	const [query, setQuery] = useState('')

	const rows = useMemo(() => {
		if (!scenario) return [] as Array<{ id: string; partyName: string; partyColour: string; isMayor: boolean; vote: VoteState; placeholder: string; name: string }>
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
				partyName: party?.name ?? 'Unassigned',
				partyColour: party?.colour ?? '#94a3b8',
				isMayor: c.isMayor,
				vote: c.vote,
				placeholder,
				name: c.name ?? '',
			}
		})
	}, [scenario])

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return rows
		return rows.filter(r => r.partyName.toLowerCase().includes(q) || r.placeholder.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
	}, [rows, query])

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
				{filtered.map(row => (
					<div key={row.id} className="rounded border border-slate-100 bg-slate-50/50 p-2">
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
					</div>
				))}
				{filtered.length === 0 && (
					<p className="py-2 text-center text-xs italic text-slate-400">No matches.</p>
				)}
			</div>
		</div>
	)
}
