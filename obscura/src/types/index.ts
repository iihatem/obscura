export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Label {
  label: string
  x: number      // % of image width
  y: number      // % of image height
  width: number  // % of image width
  height: number // % of image height
}

interface BaseCard {
  id: string
  set_id: string
  position: number
  created_at: string
}

export interface FlashCard extends BaseCard {
  type: 'flashcard'
  front: string
  back: string
  image_url: null
  labels: null
}

export interface DiagramCard extends BaseCard {
  type: 'diagram'
  front: null
  back: null
  image_url: string
  labels: Label[]
}

export type Card = FlashCard | DiagramCard

export interface Set {
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

export interface StudySession {
  id: string
  user_id: string
  set_id: string
  mode: 'flashcard' | 'diagram' | 'mixed'
  started_at: string
  completed_at: string | null
}

export interface CardResult {
  id: string
  session_id: string
  card_id: string
  grade: 'correct' | 'close' | 'wrong' | 'empty'
  time_taken_ms: number | null
  answered_at: string
}

export interface SetStar {
  user_id: string
  set_id: string
  created_at: string
}
