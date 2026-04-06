import "server-only";

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY"): string;
function requireEnv(name: "SUPABASE_SERVICE_ROLE_KEY", required: false): string | undefined;
function requireEnv(
  name:
    | "SUPABASE_URL"
    | "SUPABASE_ANON_KEY"
    | "SUPABASE_SERVICE_ROLE_KEY",
  required = true
) {
  const value = process.env[name];

  if (!value && required) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export const supabaseUrl = requireEnv("SUPABASE_URL");
export const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
export const supabaseServiceRoleKey = requireEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  false
);
