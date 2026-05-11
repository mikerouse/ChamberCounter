import type { Councillor, Party, Scenario, ThresholdRule } from './types'

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function newId(prefix = ''): string {
	let s = ''
	for (let i = 0; i < 8; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]
	return prefix ? `${prefix}_${s}` : s
}

export function newParty(name: string, colour: string): Party {
	return { id: newId('p'), name, colour }
}

export function newCouncillor(partyId: string, seatIndex: number, isMayor = false): Councillor {
	return {
		id: newId('c'),
		partyId,
		isMayor,
		seatIndex,
		vote: 'unassigned',
	}
}

export function defaultRules(): ThresholdRule[] {
	return [
		{ kind: 'simple-majority', mayorBreaksTies: true },
		{ kind: 'whole-chamber-majority' },
	]
}

export function newScenario(name: string, chamberSize: number): Scenario {
	const now = Date.now()
	return {
		id: newId('s'),
		name,
		chamberSize,
		parties: [],
		councillors: [],
		enabledRules: defaultRules(),
		createdAt: now,
		updatedAt: now,
	}
}
