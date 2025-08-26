import { NextRequest, NextResponse } from "next/server";
import { backendApi } from "@/app/lib/backend";

export async function GET() {
  const { data, error } = await backendApi.GET("/users");

  if (error || !data) {
    throw new Error(`Failed to get users`);
  }

  return NextResponse.json(data);
}
