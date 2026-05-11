import { useMemo } from 'react'
import { buildDisplayNames } from '@/domain/display'
import { defaultQuorum } from '@/domain/types'
import { selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import { PartyRow } from './PartyRow'
import { ScenariosSidebar } from './ScenariosSidebar'

const randomColour = () => {
	const hue = Math.floor(Math.random() * 360)
	return `hsl(${hue} 65% 50%)`
}

function hslToHex(hsl: string): string {
	const m = hsl.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/)
	if (!m) return '#888888'
	const h = Number(m[1]) / 360
	const s = Number(m[2]) / 100
	const l = Number(m[3]) / 100
	const a = s * Math.min(l, 1 - l)
	const f = (n: number) => {
		const k = (n + h * 12) % 12
		const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
		return Math.round(255 * c).toString(16).padStart(2, '0')
	}
	return `#${f(0)}${f(8)}${f(4)}`
}

export function SetupPanel() {
	const scenario = useChamberStore(selectCurrentScenario)
	const renameScenario = useChamberStore(s => s.renameScenario)
	const setChamberSize = useChamberStore(s => s.setChamberSize)
	const addParty = useChamberStore(s => s.addParty)
	const applyUKPresets = useChamberStore(s => s.applyUKPresets)
	const setMayor = useChamberStore(s => s.setMayor)
	const resetVotes = useChamberStore(s => s.resetVotes)
	const setQuorum = useChamberStore(s => s.setQuorum)

	const counts = useMemo(() => {
		if (!scenario) return new Map<string, number>()
		const m = new Map<string, number>()
		for (const p of scenario.parties) m.set(p.id, 0)
		for (const c of scenario.councillors) m.set(c.partyId, (m.get(c.partyId) ?? 0) + 1)
		return m
	}, [scenario])

	const allocated = scenario?.councillors.length ?? 0
	const remaining = (scenario?.chamberSize ?? 0) - allocated
	const overflow = remaining < 0

	const partyIndexById = useMemo(() => {
		if (!scenario) return new Map<string, number>()
		const m = new Map<string, number>()
		scenario.parties.forEach((p, i) => m.set(p.id, i))
		return m
	}, [scenario])

	const mayor = scenario?.councillors.find(c => c.isMayor)

	const councillorOptions = useMemo(() => {
		if (!scenario) return [] as { id: string; label: string }[]
		const names = buildDisplayNames(scenario.councillors, scenario.parties)
		const sorted = [...scenario.councillors].sort((a, b) => {
			const pa = partyIndexById.get(a.partyId) ?? Number.MAX_SAFE_INTEGER
			const pb = partyIndexById.get(b.partyId) ?? Number.MAX_SAFE_INTEGER
			if (pa !== pb) return pa - pb
			return a.id.localeCompare(b.id)
		})
		return sorted.map(c => {
			const party = scenario.parties.find(p => p.id === c.partyId)
			const display = names.get(c.id) ?? c.id
			const hasCustomName = !!c.name?.trim()
			const label = hasCustomName && party ? `${display} (${party.name})` : display
			return { id: c.id, label }
		})
	}, [scenario, partyIndexById])

	if (!scenario) return null

	return (
		<aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
			<ScenariosSidebar />
			<div className="border-b border-slate-200 px-4 py-3">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenario</h2>
				<input
					type="text"
					value={scenario.name}
					onChange={e => renameScenario(scenario.id, e.target.value)}
					className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm font-medium focus:border-slate-400 focus:outline-none"
				/>
				<label className="mt-3 block">
					<span className="text-xs font-medium text-slate-600">Chamber size</span>
					<input
						type="number"
						min={1}
						max={200}
						value={scenario.chamberSize}
						onChange={e => setChamberSize(scenario.id, Number(e.target.value))}
						className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm tabular-nums focus:border-slate-400 focus:outline-none"
					/>
				</label>
				<label className="mt-3 block">
					<span className="flex items-baseline justify-between text-xs font-medium text-slate-600">
						<span>Quorum</span>
						{scenario.quorum !== undefined && (
							<button
								type="button"
								onClick={() => setQuorum(scenario.id, null)}
								className="text-[10px] font-normal text-slate-400 underline-offset-2 hover:underline"
							>
								reset to default
							</button>
						)}
					</span>
					<input
						type="number"
						min={1}
						max={scenario.chamberSize}
						value={scenario.quorum ?? defaultQuorum(scenario.chamberSize)}
						onChange={e => setQuorum(scenario.id, Number(e.target.value))}
						className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm tabular-nums focus:border-slate-400 focus:outline-none"
					/>
					<span className="mt-1 block text-[10px] text-slate-400">
						Default: {defaultQuorum(scenario.chamberSize)} (one quarter of {scenario.chamberSize})
					</span>
				</label>
			</div>

			<div className="border-b border-slate-200 px-4 py-3">
				<div className="flex items-center justify-between">
					<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parties</h2>
					<span
						className={`rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${
							overflow
								? 'bg-rose-100 text-rose-700'
								: remaining === 0
									? 'bg-emerald-100 text-emerald-700'
									: 'bg-amber-100 text-amber-700'
						}`}
					>
						{allocated} / {scenario.chamberSize}
					</span>
				</div>
				<div className="mt-2 divide-y divide-slate-100">
					{scenario.parties.map(p => (
						<PartyRow
							key={p.id}
							scenarioId={scenario.id}
							party={p}
							count={counts.get(p.id) ?? 0}
							remaining={Math.max(0, remaining)}
						/>
					))}
					{scenario.parties.length === 0 && (
						<p className="py-3 text-xs italic text-slate-400">No parties yet. Apply UK presets or add one manually.</p>
					)}
				</div>
				<div className="mt-3 flex gap-2">
					<button
						type="button"
						onClick={() => addParty(scenario.id, 'New party', hslToHex(randomColour()))}
						className="flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
					>
						+ Add party
					</button>
					<button
						type="button"
						onClick={() => applyUKPresets(scenario.id)}
						className="flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
					>
						Apply UK presets
					</button>
				</div>
			</div>

			<div className="border-b border-slate-200 px-4 py-3">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mayor / Chair</h2>
				<p className="mt-1 text-xs text-slate-500">Designated councillor takes the centre-front seat and may cast a tie-breaking vote.</p>
				<select
					value={mayor?.id ?? ''}
					onChange={e => setMayor(scenario.id, e.target.value || null)}
					disabled={councillorOptions.length === 0}
					className="mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
				>
					<option value="">— None —</option>
					{councillorOptions.map(o => (
						<option key={o.id} value={o.id}>{o.label}</option>
					))}
				</select>
			</div>

			<div className="px-4 py-3">
				<button
					type="button"
					onClick={() => resetVotes(scenario.id)}
					disabled={scenario.councillors.length === 0}
					className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Reset all votes
				</button>
			</div>
		</aside>
	)
}
