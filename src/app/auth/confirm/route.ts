import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const redirectTo = searchParams.get('redirect') || '/households'

    if (token_hash && type) {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error && user) {
            // Create profile if it doesn't exist
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!existingProfile) {
                const displayName =
                    user.user_metadata?.display_name ||
                    user.email?.split('@')[0] ||
                    'User'

                await supabase.from('profiles').insert({
                    id: user.id,
                    name: displayName,
                })
            }

            return NextResponse.redirect(`${origin}${redirectTo}`)
        }
    }

    return NextResponse.redirect(`${origin}/login?error=verification_failed`)
}
