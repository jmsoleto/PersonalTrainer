import type {
  Gender,
  FitnessLevel,
  FitnessGoal,
  Equipment,
  MuscleGroup,
  UnitSystem,
  InjurySeverity,
} from './enums'

export interface InjuryZone {
  muscleGroup: MuscleGroup
  severity: InjurySeverity
  notes?: string
  dateMarked: string
}

export interface UserProfile {
  id: string
  gender: Gender
  age: number
  weightKg: number
  heightCm: number
  fitnessLevel: FitnessLevel
  goals: FitnessGoal[]
  equipment: Equipment[]
  injuries: InjuryZone[]
  unitSystem: UnitSystem
  createdAt: string
  updatedAt: string
}
