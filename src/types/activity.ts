export type ActivityType =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'hiking'
  | 'other'

export interface ManualActivity {
  id?: number
  userId: string
  date: string          // YYYY-MM-DD (local calendar day)
  type: ActivityType
  distanceKm?: number    // running / cycling / hiking — entered and stored in km
  distanceM?: number     // swimming — entered and stored in meters
  durationMin?: number
  note?: string
  createdAt: string     // ISO
}
