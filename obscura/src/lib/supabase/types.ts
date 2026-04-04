// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts

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
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      sets: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          subject: string | null
          visibility: 'public' | 'link' | 'private'
          share_token: string | null
          forked_from: string | null
          card_count: number
          star_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          subject?: string | null
          visibility?: 'public' | 'link' | 'private'
          share_token?: string | null
          forked_from?: string | null
          card_count?: number
          star_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          subject?: string | null
          visibility?: 'public' | 'link' | 'private'
          share_token?: string | null
          forked_from?: string | null
          card_count?: number
          star_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          set_id: string
          type: 'diagram' | 'flashcard'
          position: number
          front: string | null
          back: string | null
          image_url: string | null
          labels: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          set_id: string
          type: 'diagram' | 'flashcard'
          position?: number
          front?: string | null
          back?: string | null
          image_url?: string | null
          labels?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          set_id?: string
          type?: 'diagram' | 'flashcard'
          position?: number
          front?: string | null
          back?: string | null
          image_url?: string | null
          labels?: Json | null
          created_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          set_id: string
          mode: 'flashcard' | 'diagram' | 'mixed'
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          set_id: string
          mode: 'flashcard' | 'diagram' | 'mixed'
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          set_id?: string
          mode?: 'flashcard' | 'diagram' | 'mixed'
          started_at?: string
          completed_at?: string | null
        }
      }
      card_results: {
        Row: {
          id: string
          session_id: string
          card_id: string
          grade: 'correct' | 'close' | 'wrong' | 'empty'
          time_taken_ms: number | null
          answered_at: string
        }
        Insert: {
          id?: string
          session_id: string
          card_id: string
          grade: 'correct' | 'close' | 'wrong' | 'empty'
          time_taken_ms?: number | null
          answered_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          card_id?: string
          grade?: 'correct' | 'close' | 'wrong' | 'empty'
          time_taken_ms?: number | null
          answered_at?: string
        }
      }
      set_stars: {
        Row: {
          user_id: string
          set_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          set_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          set_id?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
