import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
