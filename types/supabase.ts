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
          must_change_password: boolean
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
          must_change_password?: boolean
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
          must_change_password?: boolean
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
          start_at: string
          duration: string
          status: 'pending' | 'confirmed' | 'cancelled'
          notes: string | null
          time_span: unknown
          series_id: string | null
          frequency: 'puntual' | 'semanal' | 'quincenal'
          pending_reason: string | null
          optimization_score: number | null
          created_at: string
          updated_at: string
          // Legacy fields kept for backward compatibility during migration
          date?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
        }
        Insert: {
          id?: string
          therapist_id: string
          client_id: string
          start_at: string
          duration?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          notes?: string | null
          time_span?: unknown
          series_id?: string | null
          frequency?: 'puntual' | 'semanal' | 'quincenal'
          pending_reason?: string | null
          optimization_score?: number | null
          created_at?: string
          updated_at?: string
          // Legacy fields kept for backward compatibility during migration
          date?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
        }
        Update: {
          id?: string
          therapist_id?: string
          client_id?: string
          start_at?: string
          duration?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          notes?: string | null
          time_span?: unknown
          series_id?: string | null
          frequency?: 'puntual' | 'semanal' | 'quincenal'
          pending_reason?: string | null
          optimization_score?: number | null
          created_at?: string
          updated_at?: string
          // Legacy fields kept for backward compatibility during migration
          date?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
        }
      }
      clients: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          notes?: string | null
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
