/**
 * Runtime environment variable validation.
 * Import this in Supabase client/server files to fail fast
 * if required env vars are missing.
 */

function getRequiredEnv(key: string): string {
    const value = process.env[key]
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
            `Check your .env.local file.`
        )
    }
    return value
}

export const env = {
    supabaseUrl: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
} as const
