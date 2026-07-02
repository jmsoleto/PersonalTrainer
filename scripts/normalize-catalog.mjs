// One-off normalization of src/data/exercises.json to the canonical English enum
// vocabulary (src/types/enums.ts). Idempotent: canonical values map to themselves.
// Fails loudly on any unmapped value. Run: node scripts/normalize-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const PATH = new URL('../src/data/exercises.json', import.meta.url)

const EQUIPMENT_MAP = {
  mancuernas: 'dumbbells',
  barra: 'barbell',
  banco: 'bench', bench: 'bench',
  kettlebell: 'kettlebell',
  pull_up_bar: 'pull_up_bar', barra_dominadas: 'pull_up_bar',
  yoga_mat: 'yoga_mat',
  'banda_elástica': 'resistance_bands', resistance_bands: 'resistance_bands',
}
const MUSCLE_MAP = {
  antebrazos: 'forearms', 'bíceps': 'biceps', core: 'core',
  cuerpo_completo: 'full_body', 'cuádriceps': 'quads', espalda: 'back',
  gemelos: 'calves', 'glúteos': 'glutes', hombros: 'shoulders',
  isquiotibiales: 'hamstrings', pecho: 'chest', 'tríceps': 'triceps',
}
const CATEGORY_MAP = {
  fuerza: 'strength', warmup: 'warmup', cooldown: 'cooldown',
  flexibilidad: 'flexibility', 'pliométrico': 'plyometric',
  cardio: 'cardio', equilibrio: 'balance',
}
const DIFFICULTY_MAP = {
  principiante: 'beginner', intermedio: 'intermediate', avanzado: 'advanced',
}

const map = (table, val, ctx) => {
  if (!(val in table)) throw new Error(`UNMAPPED ${ctx}: ${JSON.stringify(val)}`)
  return table[val]
}

const data = JSON.parse(readFileSync(PATH, 'utf-8'))
for (const ex of data) {
  ex.equipment = ex.equipment.map(v => map(EQUIPMENT_MAP, v, 'equipment'))
  ex.primaryMuscle = map(MUSCLE_MAP, ex.primaryMuscle, 'primaryMuscle')
  ex.muscleGroups = ex.muscleGroups.map(v => map(MUSCLE_MAP, v, 'muscleGroups'))
  ex.category = map(CATEGORY_MAP, ex.category, 'category')
  ex.difficulty = map(DIFFICULTY_MAP, ex.difficulty, 'difficulty')
}

writeFileSync(PATH, JSON.stringify(data, null, 2)) // 2-space indent, no trailing newline
console.log(`OK: normalized ${data.length} exercises.`)
