"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getSafeActionError } from "@/lib/server/authz";
import { applyPendingMigrations, getMigrationStatus } from "@/lib/server/db-migrations";

export async function getMigrationStatusAction() {
  await requireRole("ADMIN");
  try {
    return { success: true as const, status: await getMigrationStatus() };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "Veritabanına bağlanılamadı.") };
  }
}

export async function applyMigrationsAction() {
  await requireRole("ADMIN");
  try {
    const { results, status } = await applyPendingMigrations();
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true as const, results, status };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "Migration işlemi başlatılamadı.") };
  }
}
