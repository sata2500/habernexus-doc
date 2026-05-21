import { getAuthorArticles } from "../actions";
import { AuthorArticlesClient } from "../components/AuthorArticlesClient";

export const dynamic = "force-dynamic";

export default async function AuthorArticlesPage() {
  const articles = await getAuthorArticles();

  // Map to the format required by the AuthorArticlesClient
  const mappedArticles = articles.map(art => ({
    id: art.id,
    title: art.title,
    slug: art.slug,
    status: art.status,
    viewCount: art.viewCount,
    aiPersonaId: art.aiPersonaId,
    categoryId: art.categoryId,
    plagiarismRate: art.plagiarismRate,
    seoScore: art.seoScore,
    readabilityScore: art.readabilityScore,
    qualityScore: art.qualityScore,
    analysisReport: art.analysisReport,
    publishedAt: art.publishedAt,
    createdAt: art.createdAt,
    category: art.category ? { id: art.category.id, name: art.category.name } : null
  }));

  return <AuthorArticlesClient initialArticles={mappedArticles} />;
}
