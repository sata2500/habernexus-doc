/* ============================================
   Haber Nexus — TypeScript Type Definitions
   ============================================ */

// User Roles
export type UserRole = "USER" | "AUTHOR" | "ADMIN";

// Article Status
export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// User
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  _count?: {
    articles: number;
  };
}

// Tag
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// Article (summary for cards)
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  status: ArticleStatus;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  author: Pick<User, "id" | "name" | "image">;
  category: Pick<Category, "id" | "name" | "slug" | "color"> | null;
  tags: Pick<Tag, "id" | "name" | "slug">[];
}

// Article (full detail)
export interface ArticleDetail extends ArticleSummary {
  content: string;
  updatedAt: Date;
  author: Pick<User, "id" | "name" | "image" | "bio">;
  _count?: {
    comments: number;
    bookmarks: number;
  };
}

// Comment
export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: Pick<User, "id" | "name" | "image">;
  parentId: string | null;
  replies?: Comment[];
}

// Bookmark
export interface Bookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: Date;
  article?: ArticleSummary;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Search Params
export interface SearchParams {
  q?: string;
  category?: string;
  tag?: string;
  author?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "latest" | "popular" | "trending";
}

// Navigation
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  children?: NavItem[];
}

// Theme
export type Theme = "light" | "dark" | "system";
