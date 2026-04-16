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
  if (session.user.role !== "ADMIN" && session.user.role !== "AUTHOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await optimizeMedia(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Optimization failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
