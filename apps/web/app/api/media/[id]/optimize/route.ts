import { NextRequest, NextResponse } from "next/server";
import { optimizeMedia } from "@/lib/media-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sadece ADMIN veya AUTHOR optimize edebilir
  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "AUTHOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 0 }); // Better Auth usually handles roles, but we check manually for safety
  }

  const { id } = await params;

  try {
    const result = await optimizeMedia(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Optimization failed" },
      { status: 500 }
    );
  }
}
