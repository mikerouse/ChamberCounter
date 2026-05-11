import { AnimatePresence, motion } from 'motion/react'
import { useToastStore } from '@/store/toasts'

const STYLE = {
	info: 'bg-slate-800 text-white',
	success: 'bg-emerald-600 text-white',
	error: 'bg-rose-600 text-white',
} as const

export function Toasts() {
	const toasts = useToastStore(s => s.toasts)
	const dismiss = useToastStore(s => s.dismiss)

	return (
		<div
			role="region"
			aria-label="Notifications"
			aria-live="polite"
			className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-16 sm:items-end"
		>
			<AnimatePresence initial={false}>
				{toasts.map(t => (
					<motion.button
						key={t.id}
						type="button"
						onClick={() => dismiss(t.id)}
						initial={{ opacity: 0, y: 12, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.95 }}
						transition={{ duration: 0.18 }}
						className={`pointer-events-auto max-w-md rounded-lg px-3 py-2 text-left text-xs shadow-lg ${STYLE[t.kind]}`}
					>
						{t.message}
					</motion.button>
				))}
			</AnimatePresence>
		</div>
	)
}
