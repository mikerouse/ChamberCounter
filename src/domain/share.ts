import type { Scenario } from './types'

const SHARE_HASH_PREFIX = 'share='

type SharePayload = Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>

function toBase64Url(text: string): string {
	const bytes = new TextEncoder().encode(text)
	let binary = ''
	for (const b of bytes) binary += String.fromCharCode(b)
	const b64 = btoa(binary)
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64url: string): string {
	let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
	while (b64.length % 4) b64 += '='
	const binary = atob(b64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return new TextDecoder().decode(bytes)
}

export function encodeScenarioForShare(scenario: Scenario): string {
	const payload: SharePayload = {
		name: scenario.name,
		chamberSize: scenario.chamberSize,
		parties: scenario.parties,
		councillors: scenario.councillors,
		enabledRules: scenario.enabledRules,
		castingVote: scenario.castingVote,
	}
	return toBase64Url(JSON.stringify(payload))
}

export function decodeSharedScenario(encoded: string): SharePayload | null {
	try {
		const json = fromBase64Url(encoded)
		const parsed = JSON.parse(json) as SharePayload
		if (!parsed || typeof parsed !== 'object') return null
		if (typeof parsed.name !== 'string') return null
		if (typeof parsed.chamberSize !== 'number') return null
		if (!Array.isArray(parsed.parties) || !Array.isArray(parsed.councillors)) return null
		if (!Array.isArray(parsed.enabledRules)) return null
		return parsed
	} catch {
		return null
	}
}

export function buildShareUrl(scenario: Scenario): string {
	const url = new URL(window.location.href)
	url.hash = `${SHARE_HASH_PREFIX}${encodeScenarioForShare(scenario)}`
	return url.toString()
}

export function readSharedScenarioFromHash(): SharePayload | null {
	const hash = window.location.hash
	if (!hash.startsWith(`#${SHARE_HASH_PREFIX}`)) return null
	const encoded = hash.slice(`#${SHARE_HASH_PREFIX}`.length)
	return decodeSharedScenario(encoded)
}

export function clearShareHash(): void {
	const url = new URL(window.location.href)
	url.hash = ''
	window.history.replaceState(null, '', url.pathname + url.search)
}

export type { SharePayload }
