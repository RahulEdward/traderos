import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    // In demo mode, just acknowledge the save
    return NextResponse.json({ success: true, profile: body });
  } catch {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
