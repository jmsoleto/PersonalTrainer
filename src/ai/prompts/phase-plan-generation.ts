import type { UserProfile } from '../../types/user'
import type { Exercise } from '../../types/exercise'
import type { SystemMessage } from '../client'
import { FitnessGoal, Equipment, FitnessLevel } from '../../types/enums'
import type { InjurySeverity } from '../../types/enums'

export interface PlanParams {
  weeks: number
  daysPerWeek: number
  sessionDurationMin: number
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
  return `Eres un entrenador personal experto y fisiólogo del ejercicio. Diseñas planes de entrenamiento personalizados estructurados en fases.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown, sin explicaciones.
- El JSON debe cumplir EXACTAMENTE el schema proporcionado.
- Usa solo los IDs de ejercicio del catálogo proporcionado.
- Incluye calentamiento y vuelta a la calma en cada sesión.
- Aplica sobrecarga progresiva entre fases.
- Adapta el plan a las lesiones e historial del usuario: evita ejercicios que afecten zonas lesionadas.
- Las sesiones son plantillas reutilizables para todas las semanas de su fase.`
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

## Estructura de fases
${phaseNote}

## Schema JSON requerido
{
  "phases": [
    {
      "phase": 1,
      "name": "Adaptación",
      "weeks": [1, 2, 3],
      "goal": "descripción del objetivo de la fase",
      "sessions": [
        {
          "session_id": "A",
          "name": "Tren superior · Empuje",
          "duration_min": ${params.sessionDurationMin},
          "warmup": {
            "duration_min": 5,
            "exercises": [
              { "exercise_id": "ex_...", "sets": 2, "reps": 10 },
              { "exercise_id": "ex_...", "sets": 1, "duration_sec": 30 }
            ]
          },
          "main": {
            "duration_min": ${params.sessionDurationMin - 10},
            "rest_between_sets_sec": { "min": 60, "max": 90 },
            "exercises": [
              { "exercise_id": "ex_...", "sets": 3, "reps": 12 },
              { "exercise_id": "ex_...", "sets": 3, "duration_sec": 30 }
            ]
          },
          "cooldown": {
            "duration_min": 5,
            "exercises": [
              { "exercise_id": "ex_...", "duration_sec": 30, "each_side": true }
            ]
          }
        }
      ]
    }
  ]
}

IMPORTANTE:
- Cada fase necesita entre ${params.daysPerWeek} y ${params.daysPerWeek + 1} sesiones (plantillas con session_id: "A", "B", "C"...)
- Las sesiones son plantillas que se repiten en rotación durante todas las semanas de la fase
- Los IDs de sesión deben ser únicos dentro de cada fase
- Usa SOLO exercise_id del catálogo proporcionado
- Ejercicios de warmup: categoría "warmup". Ejercicios de cooldown: categoría "cooldown"
- Para ejercicios con tiempo usa duration_sec en vez de reps
- El campo "weeks" de cada fase debe listar exactamente los números de semana que la componen
- La suma de todos los arrays "weeks" debe ser ${Array.from({ length: params.weeks }, (_, i) => i + 1).join(', ')} (${params.weeks} semanas en total)`
}
