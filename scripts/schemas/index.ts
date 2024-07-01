export type UpdatedAt = number;
export type Title = string;
export type Id = string;
export type QuestionsCount = number;
export type Pages = Items[];

export interface Root {
  updatedAt: UpdatedAt;
  pages: Pages;
  [k: string]: unknown;
}
export interface Items {
  title: Title;
  id: Id;
  questionsCount?: QuestionsCount;
  [k: string]: unknown;
}
