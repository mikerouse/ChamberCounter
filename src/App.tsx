import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { toPng } from 'html-to-image'
import { Chamber } from '@/components/Chamber'
import { SetupPanel } from '@/components/SetupPanel'
import { TallyPanel } from '@/components/TallyPanel'
import { Toasts } from '@/components/Toasts'
import { clearShareHash, readSharedScenarioFromHash } from '@/domain/share'
import { ensureSeedScenario, selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'
import { toast } from '@/store/toasts'

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
	const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
	const captureRef = useRef<HTMLElement>(null)

	useEffect(() => {
		if (!drawer) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setDrawer(null)
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [drawer])

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
			toast('PNG exported', 'success')
		} catch (err) {
			console.error('PNG export failed', err)
			toast('Could not export PNG. See the console for details.', 'error')
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
			<Toasts />
			<header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 lg:px-4">
				<div className="flex min-w-0 items-center gap-2">
					<button
						type="button"
						onClick={() => setDrawer('left')}
						aria-label="Open setup"
						className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
							<path d="M3 5h14M3 10h14M3 15h14" />
						</svg>
					</button>
					<h1 className="truncate text-sm font-semibold text-slate-800">ChamberCounter</h1>
					<span className="hidden text-xs text-slate-400 sm:inline">vote modelling</span>
				</div>
				<div className="flex items-center gap-1.5 print:hidden sm:gap-3">
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
						className={`hidden rounded border px-2 py-0.5 text-xs lg:inline-flex ${compact ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
					>
						{compact ? 'Exit compact' : 'Compact'}
					</button>
					<button
						type="button"
						onClick={() => window.print()}
						title="Print"
						aria-label="Print"
						className="hidden rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 sm:inline-flex"
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
					<button
						type="button"
						onClick={() => setDrawer('right')}
						aria-label="Open tally"
						className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
							<path d="M3 5h14M3 10h9M3 15h14" />
						</svg>
					</button>
					<div className="hidden text-xs text-slate-500 tabular-nums sm:block">
						{scenario ? `${scenario.councillors.length} / ${scenario.chamberSize} seated` : '—'}
					</div>
				</div>
			</header>
			<main className="relative flex min-h-0 flex-1">
				{drawer && (
					<button
						type="button"
						onClick={() => setDrawer(null)}
						aria-label="Close drawer"
						className="fixed inset-0 z-20 bg-black/40 lg:hidden"
					/>
				)}
				<div
					className={`fixed inset-y-12 left-0 z-30 transform transition-transform duration-200 ease-out lg:static lg:inset-auto lg:translate-x-0 ${
						drawer === 'left' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
					} ${compact ? 'lg:hidden' : ''}`}
				>
					<SetupPanel onCloseMobile={() => setDrawer(null)} />
				</div>
				<section ref={captureRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50">
					<Chamber />
				</section>
				<div
					className={`fixed inset-y-12 right-0 z-30 transform transition-transform duration-200 ease-out lg:static lg:inset-auto lg:translate-x-0 ${
						drawer === 'right' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
					} ${compact ? 'lg:hidden' : ''}`}
				>
					<TallyPanel onCloseMobile={() => setDrawer(null)} />
				</div>
			</main>
		</div>
	)
}
