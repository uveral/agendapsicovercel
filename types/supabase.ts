export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      therapists: {
        Row: {
          id: string
          name: string
          specialty: string
          email: string | null
          phone: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          specialty: string
          email?: string | null
          phone?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          specialty?: string
          email?: string | null
          phone?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          profile_image_url: string | null
          therapist_id: string | null
          role: 'admin' | 'therapist' | 'client'
          must_change_password: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          therapist_id?: string | null
          role?: 'admin' | 'therapist' | 'client'
          must_change_password?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          therapist_id?: string | null
          role?: 'admin' | 'therapist' | 'client'
          must_change_password?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      client_availability: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      therapist_working_hours: {
        Row: {
          id: string
          therapist_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          therapist_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          therapist_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          date: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled'
          notes: string | null
          series_id: string | null
          frequency: 'puntual' | 'semanal' | 'quincenal'
          duration_minutes: number
          pending_reason: string | null
          optimization_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          therapist_id: string
          client_id: string
          date: string
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          notes?: string | null
          series_id?: string | null
          frequency?: 'puntual' | 'semanal' | 'quincenal'
          duration_minutes?: number
          pending_reason?: string | null
          optimization_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          therapist_id?: string
          client_id?: string
          date?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          notes?: string | null
          series_id?: string | null
          frequency?: 'puntual' | 'semanal' | 'quincenal'
          duration_minutes?: number
          pending_reason?: string | null
          optimization_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'therapist' | 'client'
      appointment_status: 'pending' | 'confirmed' | 'cancelled'
      appointment_frequency: 'puntual' | 'semanal' | 'quincenal'
    }
  }
}
