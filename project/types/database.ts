export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      template_exercise_sets: {
        Row: {
          id: string
          template_exercise_id: string
          min_reps: number
          max_reps: number
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_exercise_id: string
          min_reps: number
          max_reps: number
          order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_exercise_id?: string
          min_reps?: number
          max_reps?: number
          order?: number
          created_at?: string
          updated_at?: string
        }
      }
      template_exercises: {
        Row: {
          id: string
          template_id: string
          exercise_id: string
          sets: number
          rest_time: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          exercise_id: string
          sets?: number
          rest_time?: string
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          exercise_id?: string
          sets?: number
          rest_time?: string
          order?: number
          created_at?: string
        }
      }
      workout_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          muscles: string[]
          estimated_duration: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          muscles?: string[]
          estimated_duration?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          muscles?: string[]
          estimated_duration?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}