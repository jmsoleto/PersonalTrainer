import type { UserProfile } from '../../types/user'
import type { Exercise } from '../../types/exercise'
import type { TrainingPlan, CompletedSession } from '../../types/plan'
import { buildSystemPrompt } from './plan-generation'

export { buildSystemPrompt }

export function buildRecalculationPrompt(
  profile: UserProfile,
  plan: TrainingPlan,
  completedSessions: CompletedSession[],
  availableExercises: Exercise[],
  changeReason: string,
): string {
  const currentWeek = getCurrentWeek(plan)

  const feedbackSummary = summarizeFeedback(completedSessions)

  const exerciseList = availableExercises
    .map(e => `${e.id}|${e.name}|${e.primaryMuscle}|${e.category}`)
    .join('\n')

  const completedWeeksThemes = plan.weeks
    .filter(w => w.weekNumber <= currentWeek)
    .map(w => `Semana ${w.weekNumber}: ${w.theme}`)
    .join('\n')

  return `Recalcula las semanas restantes de este plan de entrenamiento.

## Estado Actual
- Semanas completadas: 1-${currentWeek}
- Semanas a generar: ${currentWeek + 1}-12

## Perfil Actualizado del Cliente
- Genero: ${profile.gender}
- Edad: ${profile.age} anos
- Peso: ${profile.weightKg} kg
- Altura: ${profile.heightCm} cm
- Nivel: ${profile.fitnessLevel}
- Objetivos: ${profile.goals.join(', ')}
- Equipamiento actual: ${profile.equipment.join(', ')}
- Lesiones: ${profile.injuries.length > 0 ? profile.injuries.map(i => `${i.muscleGroup} (${i.severity})`).join(', ') : 'Ninguna'}

## Resumen de Rendimiento
${feedbackSummary}

## Progresion Anterior
${completedWeeksThemes}

## Motivo del Recalculo
${changeReason}

## Ejercicios Disponibles (ID|Nombre|Musculo|Categoria)
${exerciseList}

Genera SOLO las semanas ${currentWeek + 1} a 12 en el mismo formato JSON que el plan original.
Mantiene la continuidad de la progresion. Responde UNICAMENTE con JSON valido.

{
  "weeks": [ ... semanas ${currentWeek + 1} a 12 ... ]
}`
}

function getCurrentWeek(plan: TrainingPlan): number {
  const start = new Date(plan.startDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return Math.min(Math.max(diffWeeks + 1, 1), 12)
}

function summarizeFeedback(sessions: CompletedSession[]): string {
  if (sessions.length === 0) return 'Sin sesiones completadas aun.'

  const byWeek = new Map<number, CompletedSession[]>()
  for (const s of sessions) {
    const existing = byWeek.get(s.weekNumber) || []
    existing.push(s)
    byWeek.set(s.weekNumber, existing)
  }

  const lines: string[] = []
  for (const [week, weekSessions] of byWeek) {
    const avgDiff = weekSessions.reduce((sum, s) => sum + s.difficultyRating, 0) / weekSessions.length
    lines.push(`- Semana ${week}: ${weekSessions.length} sesiones, dificultad media ${avgDiff.toFixed(1)}/5`)
  }

  return lines.join('\n')
}
