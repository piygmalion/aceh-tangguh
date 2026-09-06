/**
 * Public Aceh Tangguh Supabase project.
 * The anon JWT is designed for the browser; RLS blocks writes.
 * Vercel Functions do not always load repo `.env.production` at runtime,
 * so these defaults keep production on Supabase when dashboard env is empty.
 */
export const ACEH_TANGGUH_SUPABASE_URL =
  "https://whojoxrbcdyotrpolgav.supabase.co";

export const ACEH_TANGGUH_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indob2pveHJiY2R5b3RycG9sZ2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NTc1OTYsImV4cCI6MjEwMzAzMzU5Nn0.3ds2D91komJFHNCZ9bRYJPIgbgrClz460JRyjSAGJFU";

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ACEH_TANGGUH_SUPABASE_URL;
}

export function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ACEH_TANGGUH_SUPABASE_ANON_KEY
  );
}
