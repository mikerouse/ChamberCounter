import { useDraggable } from '@dnd-kit/core'
import { motion } from 'motion/react'
import type { Councillor, Party } from '@/domain/types'

type Props = {
	councillor: Councillor
	party: Party | undefined
	displayName: string
	hemicycleX?: number
	hemicycleY?: number
	onContextMenu?: (councillorId: string, x: number, y: number) => void
}

export function Dot({ councillor, party, displayName, hemicycleX, hemicycleY, onContextMenu }: Props) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: councillor.id,
		data: { councillorId: councillor.id },
	})

	const inHemicycle = hemicycleX !== undefined && hemicycleY !== undefined
	const dragTransform = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : ''
	const combinedTransform = inHemicycle
		? `translate(-50%, -50%) ${dragTransform}`.trim()
		: dragTransform || undefined

	const style: React.CSSProperties = {
		backgroundColor: party?.colour ?? '#94a3b8',
		position: inHemicycle ? 'absolute' : 'relative',
		...(inHemicycle
			? {
					left: `${hemicycleX}%`,
					top: `${hemicycleY}%`,
				}
			: {}),
		transform: combinedTransform,
		cursor: isDragging ? 'grabbing' : 'grab',
		opacity: isDragging ? 0.7 : 1,
		zIndex: isDragging ? 50 : 2,
		touchAction: 'none',
	}

	const labelParts = [displayName]
	if (councillor.isMayor) labelParts.push('Mayor / Chair')
	if (councillor.notes) labelParts.push(`Note: ${councillor.notes}`)
	const label = labelParts.join(' — ')

	const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = e => {
		if (!onContextMenu) return
		e.preventDefault()
		e.stopPropagation()
		onContextMenu(councillor.id, e.clientX, e.clientY)
	}

	const handleClick: React.MouseEventHandler<HTMLDivElement> = e => {
		if (!onContextMenu || isDragging) return
		e.stopPropagation()
		onContextMenu(councillor.id, e.clientX, e.clientY)
	}

	return (
		<motion.div
			ref={setNodeRef}
			layout={!isDragging}
			layoutId={`dot-${councillor.id}`}
			transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
			style={style}
			className="h-[22px] w-[22px] rounded-full border-2 border-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
			title={label}
			aria-label={label}
			onContextMenu={handleContextMenu}
			onClick={handleClick}
			{...listeners}
			{...attributes}
		>
			{councillor.isMayor && (
				<>
					<span
						aria-hidden
						className="pointer-events-none absolute -inset-[3px] rounded-full border-[2.5px] border-amber-400"
					/>
					<svg
						aria-hidden
						viewBox="0 0 14 8"
						className="pointer-events-none absolute -top-[8px] left-1/2 h-[8px] w-[14px] -translate-x-1/2 drop-shadow-sm"
					>
						<path
							d="M0 8 L0 4.5 L2 1 L4.5 5 L7 0 L9.5 5 L12 1 L14 4.5 L14 8 Z"
							fill="#fbbf24"
							stroke="#92400e"
							strokeWidth="0.5"
							strokeLinejoin="round"
						/>
						<circle cx="2" cy="1" r="0.9" fill="#92400e" />
						<circle cx="7" cy="0.2" r="1" fill="#dc2626" />
						<circle cx="12" cy="1" r="0.9" fill="#92400e" />
					</svg>
				</>
			)}
		</motion.div>
	)
}
