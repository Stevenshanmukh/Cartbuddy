import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('redirect') || '/households'

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && user) {
            // Create profile if it doesn't exist (Google OAuth users)
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!existingProfile) {
                const displayName =
                    user.user_metadata?.display_name ||
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] ||
                    'User'

                await supabase.from('profiles').insert({
                    id: user.id,
                    name: displayName,
                    avatar_url: user.user_metadata?.avatar_url || null,
                })
            }

            return NextResponse.redirect(`${origin}${redirectTo}`)
        }
    }

    // Auth error — redirect to login
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
