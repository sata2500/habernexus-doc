import { 
  StaticPage,
  Category, 
  Article, 
  Comment 
} from "./generated/client";

/**
 * StaticPage with JSON extraData type safety
 */
export interface StaticPageWithData extends Omit<StaticPage, "extraData"> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraData: any;
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
export interface UserWithInfo {
  id: string;
  name?: string | null;
  role: string;
  createdAt: Date;
  email: string | null;
  image?: string | null;
  _count?: {
    articles: number;
    comments: number;
  };
}

/**
 * Article with relations for admin/author lists
 */
export interface ArticleWithRelations extends Article {
  category: Pick<Category, "name" | "color" | "id"> | null;
  author: {
    name: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Comment with user and article info for moderator
 */
export interface CommentWithRelations extends Comment {
  user: {
    name: string | null;
    image?: string | null;
    email?: string | null;
  };
  article: {
    title: string;
    slug: string;
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

export interface SliderWithSlides extends import("./generated/client").Slider {
  slides: import("./generated/client").Slide[];
}
