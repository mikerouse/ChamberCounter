import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type ComboboxOption = {
	id: string
	label: string
}

type Props = {
	options: ComboboxOption[]
	selectedId: string | null
	onSelect: (id: string | null) => void
	placeholder?: string
	emptyLabel?: string
	disabled?: boolean
}

export function Combobox({ options, selectedId, onSelect, placeholder = 'Search…', emptyLabel = '— None —', disabled }: Props) {
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const listId = useId()
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [highlight, setHighlight] = useState(0)

	const selected = useMemo(
		() => (selectedId ? options.find(o => o.id === selectedId) ?? null : null),
		[options, selectedId],
	)

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return options
		return options.filter(o => o.label.toLowerCase().includes(q))
	}, [options, query])

	useEffect(() => {
		if (!open) return
		const onDocClick = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
				setQuery('')
			}
		}
		document.addEventListener('mousedown', onDocClick)
		return () => document.removeEventListener('mousedown', onDocClick)
	}, [open])

	useEffect(() => {
		if (open) setHighlight(0)
	}, [open, filtered.length])

	const choose = (option: ComboboxOption | null) => {
		onSelect(option?.id ?? null)
		setOpen(false)
		setQuery('')
		inputRef.current?.blur()
	}

	const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			if (!open) {
				setOpen(true)
				return
			}
			setHighlight(h => Math.min(filtered.length - 1, h + 1))
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			setHighlight(h => Math.max(0, h - 1))
		} else if (e.key === 'Enter') {
			e.preventDefault()
			if (open && filtered[highlight]) choose(filtered[highlight])
		} else if (e.key === 'Escape') {
			setOpen(false)
			setQuery('')
		}
	}

	const displayValue = open ? query : (selected?.label ?? '')

	return (
		<div ref={containerRef} className="relative">
			<input
				ref={inputRef}
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-controls={listId}
				aria-autocomplete="list"
				value={displayValue}
				disabled={disabled}
				placeholder={selected ? selected.label : placeholder}
				onChange={e => {
					setQuery(e.target.value)
					setOpen(true)
				}}
				onFocus={() => setOpen(true)}
				onKeyDown={onKeyDown}
				className="w-full rounded border border-slate-200 bg-white px-2 py-1 pr-7 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
			/>
			{selected && !open && (
				<button
					type="button"
					onClick={() => choose(null)}
					aria-label="Clear selection"
					className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<path d="M3 3l10 10M13 3L3 13" />
					</svg>
				</button>
			)}
			{open && (
				<ul
					id={listId}
					role="listbox"
					className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-md"
				>
					<li>
						<button
							type="button"
							role="option"
							aria-selected={!selected}
							onMouseDown={e => e.preventDefault()}
							onClick={() => choose(null)}
							className="block w-full px-3 py-1 text-left text-xs italic text-slate-500 hover:bg-slate-50"
						>
							{emptyLabel}
						</button>
					</li>
					{filtered.length === 0 && (
						<li className="px-3 py-2 text-xs italic text-slate-400">No matches.</li>
					)}
					{filtered.map((option, i) => (
						<li key={option.id}>
							<button
								type="button"
								role="option"
								aria-selected={option.id === selectedId}
								onMouseDown={e => e.preventDefault()}
								onMouseEnter={() => setHighlight(i)}
								onClick={() => choose(option)}
								className={`block w-full px-3 py-1 text-left text-xs ${
									i === highlight ? 'bg-slate-100' : 'hover:bg-slate-50'
								} ${option.id === selectedId ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
							>
								{option.label}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
