import { useEffect, useSyncExternalStore } from 'react'
import { Chamber } from '@/components/Chamber'
import { SetupPanel } from '@/components/SetupPanel'
import { TallyPanel } from '@/components/TallyPanel'
import { clearShareHash, readSharedScenarioFromHash } from '@/domain/share'
import { ensureSeedScenario, selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	if (target.isContentEditable) return true
	const tag = target.tagName
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export default function App() {
	const scenario = useChamberStore(selectCurrentScenario)

	const importSharedScenario = useChamberStore(s => s.importSharedScenario)
	const undo = useChamberStore(s => s.undo)
	const redo = useChamberStore(s => s.redo)

	const canUndo = useSyncExternalStore(
		useChamberStore.subscribe,
		() => useChamberStore.getState().canUndo(),
	)
	const canRedo = useSyncExternalStore(
		useChamberStore.subscribe,
		() => useChamberStore.getState().canRedo(),
	)

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const meta = e.ctrlKey || e.metaKey
			if (!meta) return
			const isUndo = e.key === 'z' && !e.shiftKey
			const isRedo = e.key === 'y' || (e.key === 'z' && e.shiftKey)
			if (!isUndo && !isRedo) return
			if (isEditableTarget(e.target)) return
			e.preventDefault()
			if (isUndo) undo()
			else redo()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [undo, redo])

	useEffect(() => {
		const shared = readSharedScenarioFromHash()
		if (shared) {
			const ok = window.confirm(`Import shared scenario "${shared.name}"?`)
			if (ok) importSharedScenario(shared)
			clearShareHash()
		}
		if (!useChamberStore.getState().currentScenarioId) ensureSeedScenario()
		// Re-seed if scenario becomes null later (e.g. last one deleted)
	}, [importSharedScenario])

	useEffect(() => {
		if (!scenario) ensureSeedScenario()
	}, [scenario])

	return (
		<div className="flex h-screen flex-col bg-slate-50">
			<header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
				<div className="flex items-baseline gap-2">
					<h1 className="text-sm font-semibold text-slate-800">ChamberCounter</h1>
					<span className="text-xs text-slate-400">vote modelling</span>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => undo()}
							disabled={!canUndo}
							title="Undo (Ctrl+Z)"
							aria-label="Undo"
							className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M3 8h7a3 3 0 0 1 0 6H7" />
								<path d="M6 5L3 8l3 3" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => redo()}
							disabled={!canRedo}
							title="Redo (Ctrl+Y)"
							aria-label="Redo"
							className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M13 8H6a3 3 0 0 0 0 6h3" />
								<path d="M10 5l3 3-3 3" />
							</svg>
						</button>
					</div>
					<div className="text-xs text-slate-500 tabular-nums">
						{scenario ? `${scenario.councillors.length} / ${scenario.chamberSize} seated` : '—'}
					</div>
				</div>
			</header>
			<main className="flex min-h-0 flex-1">
				<SetupPanel />
				<section className="flex min-w-0 flex-1 flex-col">
					<Chamber />
				</section>
				<TallyPanel />
			</main>
		</div>
	)
}
