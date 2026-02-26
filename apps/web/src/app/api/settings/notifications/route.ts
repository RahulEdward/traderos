import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, notifications: body });
  } catch {
    return NextResponse.json({ error: "Failed to save notifications" }, { status: 500 });
  }
}
