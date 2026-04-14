// 공용 도메인 타입. 점진 TS 전환을 위해 하위 JS 파일에서 JSDoc `@typedef import`로 참조 가능.

export type UUID = string;
export type ISO8601 = string;

export interface User {
  id: UUID;
  email: string;
  nickname: string;
  avatar?: string;
  joinedAt?: ISO8601;
}

export type Category = "food" | "wellness" | "beauty" | "kitchen" | "home" | "one4one";
export type Mood = "love" | "good" | "save" | "wow";

export interface ReviewMedia {
  id?: number | string;
  type: "image" | "video";
  url: string;
  duration?: number;
}

export interface Review {
  id: number | UUID;
  title: string;
  body: string;
  category: Category | string;
  tags: string[];
  author: string;
  authorId?: UUID;
  date: string;
  likes: number;
  views: number;
  product?: string;
  products?: { id: number | string; name: string }[];
  media?: ReviewMedia[];
  img?: string;
}

export interface Comment {
  id: number | UUID;
  author: string;
  avatar?: string;
  text: string;
  createdAt: number;
  time?: string;
  parentId?: number | UUID | null;
  mentionTo?: string | null;
  likedBy?: (string | UUID)[];
}

export interface Notification {
  id: number | UUID;
  text: string;
  time?: string;
  read?: boolean;
  targetReviewId?: number | UUID;
}

export interface Challenge {
  id?: UUID;
  status: "active" | "completed" | "abandoned";
  startDate: string;
  completedAt?: ISO8601;
  weight?: number;
  height?: number;
  age?: number;
  gender?: "male" | "female";
  goal?: "lose" | "maintain" | "muscle";
  bmr?: number;
  targetCalories?: number;
  coachTone?: "cheerful" | "gentle" | "strict" | "funny";
  anonId?: string;
}
