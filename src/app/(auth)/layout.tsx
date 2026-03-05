import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If already logged in, redirect to households
    if (user) {
        redirect('/households')
    }

    return (
        <div className="min-h-dvh bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-6">
            {children}
        </div>
    )
}
