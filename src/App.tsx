import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { toPng } from 'html-to-image'
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

	const [compact, setCompact] = useState(false)
	const [exporting, setExporting] = useState(false)
	const captureRef = useRef<HTMLElement>(null)

	const exportPng = async () => {
		if (!captureRef.current) return
		setExporting(true)
		try {
			const dataUrl = await toPng(captureRef.current, {
				backgroundColor: '#f7f7f9',
				pixelRatio: 2,
				cacheBust: true,
			})
			const link = document.createElement('a')
			const safeName = (scenario?.name ?? 'chamber').replace(/[^a-z0-9-_]+/gi, '-')
			link.download = `${safeName}.png`
			link.href = dataUrl
			link.click()
		} catch (err) {
			console.error('PNG export failed', err)
			window.alert('Could not export PNG. See the console for details.')
		} finally {
			setExporting(false)
		}
	}

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
				<div className="flex items-center gap-3 print:hidden">
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
					<button
						type="button"
						onClick={() => setCompact(c => !c)}
						title={compact ? 'Show side panels' : 'Hide side panels for screenshots'}
						aria-pressed={compact}
						className={`rounded border px-2 py-0.5 text-xs ${compact ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
					>
						{compact ? 'Exit compact' : 'Compact'}
					</button>
					<button
						type="button"
						onClick={() => window.print()}
						title="Print"
						aria-label="Print"
						className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
					>
						Print
					</button>
					<button
						type="button"
						onClick={exportPng}
						disabled={exporting}
						title="Export the chamber as a PNG image"
						aria-label="Export PNG"
						className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
					>
						{exporting ? 'Exporting…' : 'PNG'}
					</button>
					<div className="text-xs text-slate-500 tabular-nums">
						{scenario ? `${scenario.councillors.length} / ${scenario.chamberSize} seated` : '—'}
					</div>
				</div>
			</header>
			<main className="flex min-h-0 flex-1">
				{!compact && <SetupPanel />}
				<section ref={captureRef} className="flex min-w-0 flex-1 flex-col bg-slate-50">
					<Chamber />
				</section>
				{!compact && <TallyPanel />}
			</main>
		</div>
	)
}
