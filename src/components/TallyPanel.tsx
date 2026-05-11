import { useMemo } from 'react'
import { countByVote } from '@/domain/threshold'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import { effectiveQuorum, presentCount } from '@/domain/types'
import type { Party, VoteState } from '@/domain/types'

type Row = {
	party: Party
	aye: number
	no: number
	abstain: number
	absent: number
	unassigned: number
}

const COUNT_BADGES: Array<{ key: VoteState; label: string; bg: string; text: string }> = [
	{ key: 'aye', label: 'Aye', bg: 'bg-emerald-50', text: 'text-emerald-700' },
	{ key: 'no', label: 'No', bg: 'bg-rose-50', text: 'text-rose-700' },
	{ key: 'abstain', label: 'Abstain', bg: 'bg-amber-50', text: 'text-amber-700' },
	{ key: 'absent', label: 'Absent', bg: 'bg-slate-100', text: 'text-slate-700' },
]

type TallyPanelProps = {
	onCloseMobile?: () => void
}

export function TallyPanel({ onCloseMobile }: TallyPanelProps = {}) {
	const scenario = useChamberStore(selectCurrentScenario)
	const toggleRule = useChamberStore(s => s.toggleRule)
	const setMayorBreaksTies = useChamberStore(s => s.setMayorBreaksTies)
	const setSupermajorityFraction = useChamberStore(s => s.setSupermajorityFraction)

	const counts = useMemo(() => (scenario ? countByVote(scenario.councillors) : null), [scenario])

	const matrix = useMemo<Row[]>(() => {
		if (!scenario) return []
		return scenario.parties.map(party => {
			const cs = scenario.councillors.filter(c => c.partyId === party.id)
			return {
				party,
				aye: cs.filter(c => c.vote === 'aye').length,
				no: cs.filter(c => c.vote === 'no').length,
				abstain: cs.filter(c => c.vote === 'abstain').length,
				absent: cs.filter(c => c.vote === 'absent').length,
				unassigned: cs.filter(c => c.vote === 'unassigned').length,
			}
		})
	}, [scenario])

	if (!scenario || !counts) {
		return <aside className="w-80 shrink-0 border-l border-slate-200 bg-white" />
	}

	const simpleRule = scenario.enabledRules.find(r => r.kind === 'simple-majority')
	const simpleEnabled = !!simpleRule
	const wholeEnabled = scenario.enabledRules.some(r => r.kind === 'whole-chamber-majority')
	const superRule = scenario.enabledRules.find(r => r.kind === 'supermajority')
	const superEnabled = !!superRule
	const mayorBreaksTies = simpleRule?.kind === 'simple-majority' ? simpleRule.mayorBreaksTies : false
	const superFraction =
		superRule?.kind === 'supermajority'
			? `${superRule.numerator}/${superRule.denominator}`
			: '2/3'

	const quorum = effectiveQuorum(scenario)
	const present = presentCount(scenario)
	const quorate = present >= quorum

	return (
		<aside className="flex h-[calc(100vh-3rem)] w-80 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl lg:h-full lg:max-w-none lg:shadow-none">
			{onCloseMobile && (
				<button
					type="button"
					onClick={onCloseMobile}
					aria-label="Close tally"
					className="absolute right-2 top-2 z-10 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<path d="M3 3l10 10M13 3L3 13" />
					</svg>
				</button>
			)}
			{!quorate && (
				<div
					role="alert"
					aria-live="polite"
					className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs"
				>
					<p className="font-semibold uppercase tracking-wide text-rose-700">Not quorate</p>
					<p className="mt-0.5 text-rose-600">
						{present} present / {quorum} required. Motions cannot lawfully be carried.
					</p>
				</div>
			)}
			<div className="border-b border-slate-200 px-4 py-3">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tally</h2>
				<div className="mt-2 grid grid-cols-2 gap-2">
					{COUNT_BADGES.map(b => (
						<div key={b.key} className={`flex items-center justify-between rounded px-2 py-1.5 ${b.bg}`}>
							<span className={`text-xs font-medium ${b.text}`}>{b.label}</span>
							<span className={`text-sm font-semibold tabular-nums ${b.text}`}>{counts[b.key]}</span>
						</div>
					))}
				</div>
				{counts.unassigned > 0 && (
					<p className="mt-2 text-xs text-slate-500">
						Not yet voted: <span className="font-medium tabular-nums text-slate-700">{counts.unassigned}</span>
					</p>
				)}
			</div>

			{matrix.length > 0 && (
				<div className="border-b border-slate-200 px-4 py-3">
					<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">By party</h2>
					<table className="mt-2 w-full text-xs">
						<thead>
							<tr className="text-slate-500">
								<th className="text-left font-medium">Party</th>
								<th className="w-7 text-right font-medium" title="Aye">A</th>
								<th className="w-7 text-right font-medium" title="No">N</th>
								<th className="w-7 text-right font-medium" title="Abstain">Ab</th>
								<th className="w-7 text-right font-medium" title="Absent">Out</th>
							</tr>
						</thead>
						<tbody>
							{matrix.map(row => {
								const partyTotal = row.aye + row.no + row.abstain + row.absent + row.unassigned
								if (partyTotal === 0) return null
								return (
									<tr key={row.party.id} className="border-t border-slate-100">
										<td className="py-1 pr-2">
											<div className="flex items-center gap-1.5">
												<span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.party.colour }} />
												<span className="truncate text-slate-700">{row.party.name}</span>
											</div>
										</td>
										<td className={`text-right tabular-nums ${row.aye > 0 ? 'text-emerald-700 font-medium' : 'text-slate-300'}`}>{row.aye}</td>
										<td className={`text-right tabular-nums ${row.no > 0 ? 'text-rose-700 font-medium' : 'text-slate-300'}`}>{row.no}</td>
										<td className={`text-right tabular-nums ${row.abstain > 0 ? 'text-amber-700 font-medium' : 'text-slate-300'}`}>{row.abstain}</td>
										<td className={`text-right tabular-nums ${row.absent > 0 ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>{row.absent}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<div className="px-4 py-3">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rules</h2>
				<div className="mt-2 space-y-1.5 text-xs">
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={simpleEnabled}
							onChange={() => toggleRule(scenario.id, 'simple-majority')}
							className="h-3.5 w-3.5"
						/>
						<span className="text-slate-700">Simple majority of voters</span>
					</label>
					{simpleEnabled && (
						<label className="ml-5 flex items-center gap-2">
							<input
								type="checkbox"
								checked={mayorBreaksTies}
								onChange={e => setMayorBreaksTies(scenario.id, e.target.checked)}
								className="h-3.5 w-3.5"
							/>
							<span className="text-slate-600">Mayor casts on tie</span>
						</label>
					)}
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={wholeEnabled}
							onChange={() => toggleRule(scenario.id, 'whole-chamber-majority')}
							className="h-3.5 w-3.5"
						/>
						<span className="text-slate-700">Majority of whole chamber</span>
					</label>
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={superEnabled}
							onChange={() => toggleRule(scenario.id, 'supermajority')}
							className="h-3.5 w-3.5"
						/>
						<span className="text-slate-700">Supermajority</span>
						<span className="text-[10px] text-slate-400">(constitutional)</span>
					</label>
					{superEnabled && (
						<div className="ml-5 flex items-center gap-2">
							<label className="text-slate-600" htmlFor="super-fraction-select">Threshold</label>
							<select
								id="super-fraction-select"
								value={superFraction}
								onChange={e => {
									const [n, d] = e.target.value.split('/').map(Number)
									setSupermajorityFraction(scenario.id, n, d)
								}}
								className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs focus:border-slate-400 focus:outline-none"
							>
								<option value="3/5">Three-fifths (3/5)</option>
								<option value="2/3">Two-thirds (2/3)</option>
								<option value="3/4">Three-quarters (3/4)</option>
								<option value="4/5">Four-fifths (4/5)</option>
							</select>
						</div>
					)}
				</div>
			</div>
		</aside>
	)
}
