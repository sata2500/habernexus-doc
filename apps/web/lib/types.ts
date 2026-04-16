import { 
  StaticPage, 
  Category, 
  Article, 
  User, 
  Comment, 
  Media 
} from "./generated/client";

/**
 * StaticPage with JSON extraData type safety
 */
export interface StaticPageWithData extends Omit<StaticPage, "extraData"> {
  extraData: Record<string, any>;
}

/**
 * Category with article count
 */
export interface CategoryWithCount extends Category {
  _count: {
    articles: number;
  };
}

/**
 * User with role and basic info
 */
export interface UserWithInfo extends User {
  _count?: {
    articles: number;
    comments: number;
  };
}

/**
 * Article with relations for admin/author lists
 */
export interface ArticleWithRelations extends Article {
  category: Category | null;
  author: {
    name: string | null;
    image: string | null;
  };
}

/**
 * Comment with user and article info for moderator
 */
export interface CommentWithRelations extends Comment {
  user: {
    name: string | null;
    image: string | null;
  };
  article: {
    title: string;
    slug: string;
  };
}

/**
 * Server Action Response generic type
 */
export type ActionResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};
