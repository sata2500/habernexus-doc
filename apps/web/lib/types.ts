import type { Category } from "./generated/client";

/**
 * Category with article count
 */
export interface CategoryWithCount extends Category {
  _count: {
    articles: number;
  };
}

/**
 * Server Action Response generic type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};
