import { NextResponse } from "next/server";
import { processNextDeletionJob } from "@/lib/interview/deletion/deletion-service";

export async function POST(request: Request) {
  const key = process.env.ADMIN_API_KEY;
  const provided = request.headers.get("x-admin-key");
  if (!key || provided !== key) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const job = await processNextDeletionJob();
  if (!job) {
    return NextResponse.json({ processed: false });
  }
  return NextResponse.json({ processed: true, job });
}
