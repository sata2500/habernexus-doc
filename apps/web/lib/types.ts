import { 
  StaticPage,
  Category,
  Slider,
  Slide
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
 * Server Action Response generic type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface SliderWithSlides extends Slider {
  slides: Slide[];
}
