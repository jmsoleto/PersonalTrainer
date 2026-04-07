import type { UserProfile } from '../../types/user'
import type { Exercise } from '../../types/exercise'
import { FitnessGoal, Equipment, FitnessLevel } from '../../types/enums'

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
  [Equipment.ResistanceBands]: 'Bandas elasticas',
  [Equipment.PullUpBar]: 'Barra de dominadas',
  [Equipment.Bench]: 'Banco',
  [Equipment.Barbell]: 'Barra olimpica',
  [Equipment.Kettlebell]: 'Kettlebell',
  [Equipment.YogaMat]: 'Esterilla',
  [Equipment.BodyweightOnly]: 'Solo peso corporal',
}

const DAYS_PER_WEEK: Record<FitnessLevel, number> = {
  [FitnessLevel.Beginner]: 3,
  [FitnessLevel.Intermediate]: 4,
  [FitnessLevel.Advanced]: 5,
}

export function buildSystemPrompt(): string {
  return `Eres un entrenador personal experto y fisiologo del ejercicio. Creas programas de entrenamiento estructurados de 12 semanas.

REGLAS ESTRICTAS:
- Responde UNICAMENTE con JSON valido. Sin texto adicional, sin markdown, sin explicaciones.
- El JSON debe cumplir EXACTAMENTE el schema proporcionado.
- Usa solo los IDs de ejercicio proporcionados en la lista de ejercicios disponibles.
- Incluye calentamiento (5-8 min) y vuelta a la calma (5 min) en cada sesion de entrenamiento.
- Aplica sobrecarga progresiva: incrementa volumen/intensidad a lo largo de las semanas.
- Periodizacion: semanas de descarga (reduccion de volumen) en las semanas 4 y 8.
- Los dias de descanso activo deben incluir estiramientos y movilidad.
- Cada sesion debe tener entre 4-8 ejercicios principales (sin contar calentamiento/vuelta a la calma).`
}

export function buildUserPrompt(
  profile: UserProfile,
  availableExercises: Exercise[],
): string {
  const goals = profile.goals.map(g => GOAL_LABELS[g]).join(', ')
  const equipment = profile.equipment.map(e => EQUIPMENT_LABELS[e]).join(', ')
  const trainingDays = DAYS_PER_WEEK[profile.fitnessLevel]

  const injuries = profile.injuries.length > 0
    ? profile.injuries.map(i => `${i.muscleGroup} (${i.severity}${i.notes ? ': ' + i.notes : ''})`).join(', ')
    : 'Ninguna'

  const exerciseList = availableExercises
    .map(e => `${e.id}|${e.name}|${e.primaryMuscle}|${e.category}`)
    .join('\n')

  return `Crea un plan de entrenamiento de 12 semanas para el siguiente cliente:

## Perfil del Cliente
- Genero: ${profile.gender}
- Edad: ${profile.age} anos
- Peso: ${profile.weightKg} kg
- Altura: ${profile.heightCm} cm
- Nivel: ${profile.fitnessLevel}
- Objetivos: ${goals}
- Equipamiento disponible: ${equipment}
- Lesiones/Restricciones: ${injuries}

## Estructura del Plan
- ${trainingDays} dias de entrenamiento por semana
- 1-2 dias de descanso activo (estiramientos/movilidad)
- Resto dias de descanso completo
- Semanas de descarga: 4 y 8 (reducir volumen un 40%)
- Duracion por sesion: 30-60 minutos segun nivel

## Ejercicios Disponibles (ID|Nombre|Musculo|Categoria)
${exerciseList}

## Schema JSON Requerido
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "string descriptivo del enfoque de la semana",
      "days": [
        {
          "dayNumber": 1,
          "dayType": "training|active_rest|rest",
          "session": {
            "id": "uuid-string",
            "title": "string descriptivo",
            "targetMuscleGroups": ["chest", "triceps"],
            "estimatedDurationMinutes": 45,
            "warmup": {
              "exercises": [
                {
                  "exerciseId": "ex_id",
                  "exerciseName": "nombre",
                  "sets": 1,
                  "reps": null,
                  "durationSeconds": 60,
                  "restSeconds": 0,
                  "notes": null,
                  "targetWeightKg": null
                }
              ],
              "durationMinutes": 5
            },
            "mainWorkout": [
              {
                "exerciseId": "ex_id",
                "exerciseName": "nombre",
                "sets": 3,
                "reps": 12,
                "durationSeconds": null,
                "restSeconds": 60,
                "notes": "indicaciones opcionales",
                "targetWeightKg": null
              }
            ],
            "cooldown": {
              "exercises": [...],
              "durationMinutes": 5
            }
          }
        }
      ]
    }
  ]
}

IMPORTANTE:
- "session" es null para dias de tipo "rest"
- Para ejercicios con tiempo (plancha, estiramientos), usa durationSeconds en vez de reps
- Cada semana tiene exactamente 7 dias (dayNumber 1-7)
- Genera las 12 semanas completas
- Usa UUIDs unicos para cada session.id (formato: "s-weekN-dayN")
- Los ejercicios de calentamiento y vuelta a la calma deben ser de categoria "warmup" y "cooldown" respectivamente`
}
