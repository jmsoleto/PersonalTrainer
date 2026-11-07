import type { BlockItem, TemplateBlock } from '../types/workout-template'

/**
 * Superset helpers. A superset is `{ kind: 'superset', items: [A1, A2] }` with
 * the same number of sets (rounds) in both items. Rests live in the sets:
 * A1's rest is the transition to A2, A2's rest is the rest between rounds.
 * Helpers that edit a block mutate it in place (the editor works on a reactive draft).
 */

export const SUPERSET_ITEMS = 2
export const SUPERSET_MIN_ROUNDS = 1
export const SUPERSET_MAX_ROUNDS = 10
export const SUPERSET_DEFAULT_TRANSITION = 0
export const SUPERSET_DEFAULT_ROUND_REST = 90

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function letter(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : `S${index + 1}`
}

/** Letters (A, B, C…) for the superset blocks of a list, in order. Other kinds get none. */
export function supersetLetters(blocks: TemplateBlock[]): Map<string, string> {
  const out = new Map<string, string>()
  let n = 0
  for (const block of blocks) {
    if (block.kind === 'superset') out.set(block.id, letter(n++))
  }
  return out
}

export function roundsOf(block: TemplateBlock): number {
  return block.items[0]?.sets.length ?? 0
}

export function transitionOf(block: TemplateBlock): number {
  return block.items[0]?.sets[0]?.restSeconds ?? 0
}

export function roundRestOf(block: TemplateBlock): number {
  return block.items[1]?.sets[0]?.restSeconds ?? 0
}

function resize(item: BlockItem, rounds: number): void {
  const template = { ...(item.sets[0] ?? {}) }
  item.sets = Array.from({ length: rounds }, () => ({ ...template }))
}

function setRest(item: BlockItem | undefined, seconds: number): void {
  if (!item) return
  item.sets = item.sets.map(s => ({ ...s, restSeconds: seconds }))
}

export function setTransition(block: TemplateBlock, seconds: number): void {
  setRest(block.items[0], seconds)
}

export function setRoundRest(block: TemplateBlock, seconds: number): void {
  setRest(block.items[1], seconds)
}

/** Sets the rounds of both items (clamped to 1–10), keeping each item's prescription. */
export function setRounds(block: TemplateBlock, rounds: number): void {
  const n = clamp(Math.round(rounds), SUPERSET_MIN_ROUNDS, SUPERSET_MAX_ROUNDS)
  for (const item of block.items) resize(item, n)
}

/**
 * Turns a straight block into a superset: its item becomes A1 (all sets equal
 * to its first set), `a2` becomes A2 with the same number of rounds, and the
 * default rests are applied.
 */
export function toSuperset(block: TemplateBlock, a2: BlockItem): void {
  const a1 = block.items[0]
  if (!a1) return
  const rounds = clamp(a1.sets.length || 1, SUPERSET_MIN_ROUNDS, SUPERSET_MAX_ROUNDS)
  const second: BlockItem = { ...a2, sets: a2.sets.map(s => ({ ...s })) }
  delete second.sets[0]?.weightKg
  resize(a1, rounds)
  resize(second, rounds)
  block.kind = 'superset'
  delete block.pyramid
  block.items = [a1, second]
  setTransition(block, SUPERSET_DEFAULT_TRANSITION)
  setRoundRest(block, SUPERSET_DEFAULT_ROUND_REST)
}

/** Swaps A1 and A2; the transition and the round rest stay with their positions. */
export function swapItems(block: TemplateBlock): void {
  if (block.items.length !== SUPERSET_ITEMS) return
  const transition = transitionOf(block)
  const roundRest = roundRestOf(block)
  block.items = [block.items[1], block.items[0]]
  setTransition(block, transition)
  setRoundRest(block, roundRest)
}

function straightFrom(id: string, item: BlockItem): TemplateBlock {
  return { id, kind: 'straight', items: [{ ...item, sets: item.sets.map(s => ({ ...s })) }] }
}

/**
 * Splits a superset into two straight blocks (A1 then A2) with each item's
 * values. A1's sets keep the transition as their rest. The first block keeps
 * the superset's id.
 */
export function splitSuperset(block: TemplateBlock, newId: () => string): TemplateBlock[] {
  return block.items.map((item, i) => straightFrom(i === 0 ? block.id : newId(), item))
}

/** Removes one item; the other one remains as a straight block (same id). */
export function removeSupersetItem(block: TemplateBlock, index: number): TemplateBlock {
  const remaining = block.items.filter((_, i) => i !== index)[0]
  return remaining ? straightFrom(block.id, remaining) : { id: block.id, kind: 'straight', items: [] }
}
