export type Title = string;
export type Id = string;
export type Question = string;
export type Id1 = number;
export type Numberofcomments = number;
export type Answer = string;
export type Correct = boolean;
export type Answers = Items1[];
export type Contributors = string[];
export type Data = Items[];
export type Updatedat = number;

export interface Root {
  $schema: string;
  title?: Title;
  id?: Id;
  data: Data;
  updatedAt: Updatedat;
  [k: string]: unknown;
}
export interface Items {
  question?: Question;
  id?: Id1;
  numberOfComments?: Numberofcomments;
  answers?: Answers;
  comments?: {
    author: string;
    comment: string;
    date: string;
    [k: string]: unknown;
  }[];
  contributors?: Contributors;
  [k: string]: unknown;
}
export interface Items1 {
  answer: Answer;
  correct: Correct;
  [k: string]: unknown;
}
