export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
  PreferNotToSay = 'prefer_not_to_say',
}

export enum FitnessLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export enum FitnessGoal {
  LoseWeight = 'lose_weight',
  GainMuscle = 'gain_muscle',
  ImproveEndurance = 'improve_endurance',
  Flexibility = 'flexibility',
  GeneralFitness = 'general_fitness',
  Strength = 'strength',
}

export enum Equipment {
  Dumbbells = 'dumbbells',
  ResistanceBands = 'resistance_bands',
  PullUpBar = 'pull_up_bar',
  Bench = 'bench',
  Barbell = 'barbell',
  Kettlebell = 'kettlebell',
  YogaMat = 'yoga_mat',
  BodyweightOnly = 'bodyweight_only',
}

export enum MuscleGroup {
  Chest = 'chest',
  Back = 'back',
  Shoulders = 'shoulders',
  Biceps = 'biceps',
  Triceps = 'triceps',
  Forearms = 'forearms',
  Core = 'core',
  Quads = 'quads',
  Hamstrings = 'hamstrings',
  Glutes = 'glutes',
  Calves = 'calves',
  FullBody = 'full_body',
}

export enum ExerciseDifficulty {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export enum SessionDifficulty {
  TooEasy = 1,
  Easy = 2,
  JustRight = 3,
  Hard = 4,
  TooHard = 5,
}

export enum DayType {
  Training = 'training',
  ActiveRest = 'active_rest',
  Rest = 'rest',
}

export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'balance'
  | 'plyometric'
  | 'warmup'
  | 'cooldown'

export type UnitSystem = 'metric' | 'imperial'

export type PlanStatus = 'active' | 'completed' | 'abandoned' | 'recalculating'

export type InjurySeverity = 'mild' | 'moderate' | 'severe'
