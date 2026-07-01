import type { UserProfile } from '../../types/user'
import type { Exercise } from '../../types/exercise'
import type { SystemMessage } from '../client'
import { FitnessGoal, Equipment, FitnessLevel } from '../../types/enums'
import type { InjurySeverity } from '../../types/enums'

export interface PlanParams {
  weeks: number
  daysPerWeek: number
  sessionDurationMin: number
  trainingStyle?: string
  additionalNotes?: string
}

const GOAL_LABELS: Record<FitnessGoal, string> = {
  [FitnessGoal.LoseWeight]: 'Perder peso',
  [FitnessGoal.GainMuscle]: 'Ganar masa muscular',
  [FitnessGoal.ImproveEndurance]: 'Mejorar resistencia cardiovascular',
  [FitnessGoal.Flexibility]: 'Mejorar flexibilidad',
  [FitnessGoal.GeneralFitness]: 'Fitness general',
  [FitnessGoal.Strength]: 'Ganar fuerza',
}

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  [Equipment.Dumbbells]: 'Mancuernas',
  [Equipment.ResistanceBands]: 'Bandas elásticas',
  [Equipment.PullUpBar]: 'Barra de dominadas',
  [Equipment.Bench]: 'Banco',
  [Equipment.Barbell]: 'Barra olímpica',
  [Equipment.Kettlebell]: 'Kettlebell',
  [Equipment.YogaMat]: 'Esterilla',
  [Equipment.BodyweightOnly]: 'Solo peso corporal',
}

const SEVERITY_LABELS: Record<InjurySeverity, string> = {
  mild: 'leve',
  moderate: 'moderada',
  severe: 'grave',
}

type SlimExercise = Omit<Exercise, 'description' | 'instructions' | 'imageUrl' | 'videoUrl'>

function slimExercise(ex: Exercise): SlimExercise {
  const { description: _d, instructions: _i, imageUrl: _img, videoUrl: _v, ...slim } = ex
  return slim
}

export function buildPhaseSystemPrompt(): string {
  return `Eres un entrenador personal experto y fisiólogo del ejercicio. Diseñas planes de entrenamiento personalizados estructurados en fases con variación semanal.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown, sin explicaciones.
- El JSON debe cumplir EXACTAMENTE el schema proporcionado.
- Usa solo los IDs de ejercicio del catálogo proporcionado.
- Incluye calentamiento y vuelta a la calma en cada sesión.
- Aplica sobrecarga progresiva entre fases Y entre semanas de la misma fase.
- Adapta el plan a las lesiones e historial del usuario: evita ejercicios que afecten zonas lesionadas.
- Cada sesión define su bloque principal por semana para evitar monotonía: varía ejercicios, series y repeticiones semana a semana.`
}

/**
 * Retorna el catálogo slimado como SystemMessage con cache_control ephemeral.
 * Al ser el bloque más grande del prompt, se cachea en la API de Anthropic
 * (90% de descuento en tokens de lectura tras el primer uso).
 */
export function buildPhaseCatalogMessage(exercises: Exercise[]): SystemMessage {
  const slim = exercises.map(slimExercise)
  return {
    type: 'text',
    text: `CATÁLOGO DE EJERCICIOS DISPONIBLES:\n${JSON.stringify(slim)}`,
    cache_control: { type: 'ephemeral' },
  }
}

function buildPhaseStructureNote(weeks: number): string {
  if (weeks <= 4) {
    return '- 1 fase: Adaptación (todas las semanas)'
  } else if (weeks <= 8) {
    const half = Math.floor(weeks / 2)
    return `- 2 fases: Adaptación (semanas 1-${half}) + Progresión (semanas ${half + 1}-${weeks})`
  } else if (weeks <= 12) {
    const third = Math.floor(weeks / 3)
    const twoThirds = third * 2
    return `- 3 fases: Adaptación (semanas 1-${third}), Progresión (semanas ${third + 1}-${twoThirds}), Especialización (semanas ${twoThirds + 1}-${weeks})`
  } else {
    return `- Fase 1 Adaptación fija (semanas 1-4), luego 2 fases que cubren las semanas 5-${weeks}`
  }
}

export function buildPhaseUserPrompt(profile: UserProfile, params: PlanParams): string {
  const goals = profile.goals.map(g => GOAL_LABELS[g]).join(', ')
  const equipment = profile.equipment.length > 0
    ? profile.equipment.map(e => EQUIPMENT_LABELS[e]).join(', ')
    : 'Solo peso corporal'

  const injuries = profile.injuries.length > 0
    ? profile.injuries
        .map(i => `${i.muscleGroup} (severidad: ${SEVERITY_LABELS[i.severity]}${i.notes ? ', nota: ' + i.notes : ''})`)
        .join('; ')
    : 'Ninguna'

  const phaseNote = buildPhaseStructureNote(params.weeks)

  return `Crea un plan de entrenamiento de ${params.weeks} semanas para el siguiente usuario:

## Perfil
- Género: ${profile.gender}
- Edad: ${profile.age} años
- Peso: ${profile.weightKg} kg
- Altura: ${profile.heightCm} cm
- Nivel: ${profile.fitnessLevel}
- Objetivos: ${goals}
- Equipamiento disponible: ${equipment}
- Lesiones/Restricciones: ${injuries}

## Parámetros del plan
- Duración total: ${params.weeks} semanas
- Días de entrenamiento por semana: ${params.daysPerWeek}
- Duración objetivo por sesión: ${params.sessionDurationMin} minutos

## Preferencias adicionales
- Estilo de entrenamiento: ${params.trainingStyle || 'Sin preferencia'}
- Notas adicionales del usuario: ${params.additionalNotes || 'Ninguna'}

## Estructura de fases
${phaseNote}

## Variación semanal dentro de cada fase
Cada semana dentro de una fase debe variar el bloque principal siguiendo periodización ondulatoria:
- Semana 1: Introducción — volumen moderado, técnica. Ej: 3×10 con ejercicios base.
- Semana 2: Acumulación — aumenta repeticiones o series. Ej: 3×12 o 4×10.
- Semana 3: Intensificación — sube carga/dificultad. Puede intercambiar 1-2 ejercicios por variantes más exigentes del mismo grupo muscular.
- Semana 4 (si existe): Descarga o peak — reduce volumen un 20-30% manteniendo intensidad, o introduce la variante más avanzada.
Adapta este patrón al número de semanas de la fase. El calentamiento y la vuelta a la calma NO cambian entre semanas de la misma fase.

## Schema JSON requerido (formato compacto)
Claves: id=exercise_id, s=sets, r=reps, sec=duration_sec, es=each_side(bool)
{
  "phases": [
    {
      "phase": 1,
      "name": "Adaptación",
      "weeks": [1,2,3,4],
      "goal": "descripción del objetivo de la fase",
      "sessions": [
        {
          "id": "A",
          "name": "Tren superior · Empuje",
          "dur": ${params.sessionDurationMin},
          "rest": [60,90],
          "wu": [
            {"id":"ex_...","s":2,"r":10},
            {"id":"ex_...","s":1,"sec":30}
          ],
          "cd": [
            {"id":"ex_...","sec":30,"es":true}
          ],
          "weeks": [
            [{"id":"ex_...","s":3,"r":10},{"id":"ex_...","s":3,"r":10}],
            [{"id":"ex_...","s":3,"r":12},{"id":"ex_...","s":3,"r":12}],
            [{"id":"ex_...","s":4,"r":10},{"id":"ex_2..","s":4,"r":10}],
            [{"id":"ex_...","s":3,"r":8},{"id":"ex_2..","s":3,"r":8}]
          ]
        }
      ]
    }
  ]
}

REGLAS DEL SCHEMA:
- Cada fase necesita entre ${params.daysPerWeek} y ${params.daysPerWeek + 1} sesiones (id: "A","B","C"...)
- "weeks" en la sesión tiene EXACTAMENTE tantos arrays como semanas tenga la fase (length = phase.weeks.length)
- Cada array en "weeks" son los ejercicios principales de esa semana (índice 0 = primera semana de la fase)
- wu = warmup (categoría "warmup"), cd = cooldown (categoría "cooldown"), definidos una sola vez
- Usa SOLO ids del catálogo. Para tiempo usa sec en vez de r.
- El campo "weeks" de cada fase lista los números de semana absolutos. La suma de todos: ${Array.from({ length: params.weeks }, (_, i) => i + 1).join(',')} (${params.weeks} semanas)`
}
