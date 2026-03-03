import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinForm } from './join-form'

interface JoinPageProps {
    params: Promise<{ token: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { token } = await params
    const supabase = await createClient()

    // Check if already authenticated and in a household
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: membership } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .limit(1)
            .single()

        if (membership) {
            redirect('/dashboard')
        }
    }

    // Look up the household to show its name
    const { data: household } = await supabase
        .from('households')
        .select('id, name')
        .eq('invite_code', token)
        .single()

    if (!household) {
        return (
            <div className="min-h-dvh bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invalid Invite Link</h1>
                <p className="text-gray-500 mt-2 text-center">This link is not valid. Ask your roommate for a new one.</p>
                <a href="/" className="mt-6 text-blue-500 font-medium hover:underline">Go Home</a>
            </div>
        )
    }

    return <JoinForm householdName={household.name} householdId={household.id} inviteCode={token} />
}
