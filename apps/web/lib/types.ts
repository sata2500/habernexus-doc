import type { Category } from "./generated/client";

/** Kategori ve yayındaki haber sayısı */
export interface CategoryWithCount extends Category {
  _count: {
    articles: number;
  };
}

/**
 * Sunucu işlemlerinin (server action) ortak sonuç tipi. İstemci `success` alanına bakar;
 * hata metni her zaman kullanıcıya gösterilebilir Türkçe bir cümledir (iç ayrıntı içermez).
 */
export type ActionResult<T = undefined> =
  | ({ success: true; message?: string } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { success: false; error: string };
