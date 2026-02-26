import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    // In demo mode, just acknowledge
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
