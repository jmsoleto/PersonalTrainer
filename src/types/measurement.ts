export interface BodyMeasurement {
  id: string
  userId: string
  date: string
  weightKg?: number
  bodyFatPercent?: number
  waistCm?: number
  chestCm?: number
  leftArmCm?: number
  rightArmCm?: number
  leftThighCm?: number
  rightThighCm?: number
  hipsCm?: number
  notes?: string
}
