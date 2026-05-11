import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error'

export type Toast = {
	id: string
	kind: ToastKind
	message: string
}

type ToastState = {
	toasts: Toast[]
	push: (message: string, kind?: ToastKind, ttlMs?: number) => void
	dismiss: (id: string) => void
}

let counter = 0
const nextId = () => `toast-${++counter}-${Date.now().toString(36)}`

export const useToastStore = create<ToastState>((set, get) => ({
	toasts: [],
	push: (message, kind = 'info', ttlMs = 3500) => {
		const id = nextId()
		set(state => ({ toasts: [...state.toasts, { id, kind, message }] }))
		if (ttlMs > 0) {
			window.setTimeout(() => get().dismiss(id), ttlMs)
		}
	},
	dismiss: id => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}))

export const toast = (message: string, kind: ToastKind = 'info') => {
	useToastStore.getState().push(message, kind)
}
