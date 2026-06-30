import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: error.flatten()
      },
      { status: 400 }
    );
  }

  return jsonError("Invalid request", 400);
}
