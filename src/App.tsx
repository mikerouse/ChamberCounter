import { useEffect } from 'react'
import { Chamber } from '@/components/Chamber'
import { SetupPanel } from '@/components/SetupPanel'
import { TallyPanel } from '@/components/TallyPanel'
import { ensureSeedScenario, selectCurrentScenario, useChamberStore } from '@/store/useChamberStore'

export default function App() {
	const scenario = useChamberStore(selectCurrentScenario)

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
				<div className="text-xs text-slate-500 tabular-nums">
					{scenario ? `${scenario.councillors.length} / ${scenario.chamberSize} seated` : '—'}
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
