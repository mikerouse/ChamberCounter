import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
	const containerRef = useRef<T>(null)

	useEffect(() => {
		if (!active) return
		const container = containerRef.current
		if (!container) return

		const previouslyFocused = document.activeElement as HTMLElement | null

		const getFocusables = () =>
			Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
				el => el.offsetParent !== null || el === document.activeElement,
			)

		const focusables = getFocusables()
		focusables[0]?.focus()

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return
			const focusable = getFocusables()
			if (focusable.length === 0) {
				e.preventDefault()
				return
			}
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault()
				last.focus()
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault()
				first.focus()
			}
		}

		container.addEventListener('keydown', handleKeyDown)
		return () => {
			container.removeEventListener('keydown', handleKeyDown)
			previouslyFocused?.focus?.()
		}
	}, [active])

	return containerRef
}
