import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinConfirm } from './join-confirm'

interface JoinPageProps {
    params: Promise<{ token: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { token } = await params
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Not logged in — redirect to login with redirect back to join
        redirect(`/login?redirect=/join/${token}`)
    }

    // Look up invite by token
    // Note: The households() join may return null if the user isn't a member yet
    // because households RLS restricts SELECT to members. We handle this gracefully.
    const { data: invite } = await supabase
        .from('invites')
        .select('id, household_id, expires_at, max_uses, use_count, is_active, households(id, name)')
        .eq('token', token)
        .single()

    if (!invite || !invite.is_active) {
        return (
            <div className="min-h-dvh bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invalid Invite Link</h1>
                <p className="text-gray-500 mt-2 text-center">This invite is no longer valid. Ask for a new one.</p>
                <a href="/households" className="mt-6 text-blue-500 font-medium hover:underline">Go to Households</a>
            </div>
        )
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return (
            <div className="min-h-dvh bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invite Expired</h1>
                <p className="text-gray-500 mt-2 text-center">This invite link has expired. Ask for a new one.</p>
                <a href="/households" className="mt-6 text-blue-500 font-medium hover:underline">Go to Households</a>
            </div>
        )
    }

    // Check max uses
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
        return (
            <div className="min-h-dvh bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invite Full</h1>
                <p className="text-gray-500 mt-2 text-center">This invite has reached its maximum uses.</p>
                <a href="/households" className="mt-6 text-blue-500 font-medium hover:underline">Go to Households</a>
            </div>
        )
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', invite.household_id)
        .eq('user_id', user.id)
        .single()

    if (existingMembership) {
        redirect('/households')
    }

    // Get household name — the embedded join may return null due to RLS
    // (user isn't a member yet, so households SELECT policy blocks it)
    const household = (invite as any).households
    const householdName = household?.name || 'a household'

    return <JoinConfirm householdName={householdName} token={token} />
}
