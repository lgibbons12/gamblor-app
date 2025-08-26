// frontend/src/lib/backend.ts
import type { paths } from "@/lib/types/api";
import createClient from "openapi-fetch";

export const backendBaseUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||   // accept either
  process.env.BACKEND_URL ||
  "http://127.0.0.1:8000"              // IPv4 default
).replace(/\/$/, "");

export const backendApi = createClient<paths>({ baseUrl: backendBaseUrl });