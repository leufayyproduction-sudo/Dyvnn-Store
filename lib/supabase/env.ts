import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

const serviceRoleEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

function requiredValue(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(
      `[Dyvnn Store] Environment variable ${name} is missing. ` +
        'Add its value to .env.local and restart the development server.',
    );
  }

  return value.trim();
}

export function getSupabasePublicEnv() {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(
      `[Dyvnn Store] Invalid Supabase public environment: ${z.treeifyError(result.error).properties?.NEXT_PUBLIC_SUPABASE_URL?.errors?.join('; ') ?? result.error.message}`,
    );
  }

  return {
    url: requiredValue(result.data.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: requiredValue(result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  };
}

export function getSupabaseServiceRoleKey() {
  const result = serviceRoleEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    throw new Error(`[Dyvnn Store] Invalid service role environment: ${result.error.message}`);
  }

  return requiredValue(result.data.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
}
