import { useDraggable } from '@dnd-kit/core'
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
		...(inHemicycle
			? {
					position: 'absolute',
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

	const label = councillor.isMayor
		? `${displayName} — Mayor / Chair`
		: displayName

	const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = e => {
		if (!onContextMenu) return
		e.preventDefault()
		e.stopPropagation()
		onContextMenu(councillor.id, e.clientX, e.clientY)
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="h-[22px] w-[22px] rounded-full border-2 border-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
			title={label}
			aria-label={label}
			onContextMenu={handleContextMenu}
			{...listeners}
			{...attributes}
		>
			{councillor.isMayor && (
				<span
					aria-hidden
					className="pointer-events-none absolute -inset-[3px] rounded-full border-[2.5px] border-amber-400"
				/>
			)}
		</div>
	)
}
