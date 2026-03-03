import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignInAnonymously = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()

let builderResult: any = { data: null, error: null }

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockQueryBuilder = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    single: mockSingle,
    then: (resolve: any) => Promise.resolve(builderResult).then(resolve),
}

mockSelect.mockReturnValue(mockQueryBuilder)
mockInsert.mockReturnValue(mockQueryBuilder)
mockUpdate.mockReturnValue(mockQueryBuilder)
mockDelete.mockReturnValue(mockQueryBuilder)
mockEq.mockReturnValue(mockQueryBuilder)
// 'single' terminates the chain, so it just returns the Promise
mockSingle.mockImplementation(() => Promise.resolve(builderResult))

const mockFrom = vi.fn(() => mockQueryBuilder)

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            signInAnonymously: mockSignInAnonymously,
            signOut: mockSignOut,
            getUser: mockGetUser,
        },
        from: mockFrom,
    }),
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

import {
    createHousehold,
    joinHousehold,
    leaveHousehold,
    deleteHousehold,
    regenerateInviteCode,
} from '@/app/actions/household'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

describe('Household Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        builderResult = { data: { id: 'test-id' }, error: null }
    })

    describe('createHousehold', () => {
        it('requires a name', async () => {
            const formData = new FormData()
            const result = await createHousehold(formData)
            expect(result).toEqual({ error: 'Name is required' })
        })

        it('creates a household successfully', async () => {
            const formData = new FormData()
            formData.append('name', 'Steve')
            formData.append('householdName', 'Apt 4B')

            mockSignInAnonymously.mockResolvedValue({
                data: { user: { id: 'user-1' } },
                error: null,
            })
            builderResult = { data: { id: 'house-1' }, error: null }

            await createHousehold(formData)

            expect(mockSignInAnonymously).toHaveBeenCalled()

            // Profile insert
            expect(mockFrom).toHaveBeenCalledWith('profiles')
            expect(mockInsert).toHaveBeenCalledWith({ id: 'user-1', name: 'Steve' })

            // Household insert
            expect(mockFrom).toHaveBeenCalledWith('households')
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Apt 4B',
                created_by: 'user-1',
            }))

            // Membership insert
            expect(mockFrom).toHaveBeenCalledWith('household_members')
            expect(mockInsert).toHaveBeenCalledWith({
                household_id: 'house-1',
                user_id: 'user-1',
                role: 'owner',
            })

            expect(redirect).toHaveBeenCalledWith('/dashboard')
        })

        it('uses default household name if not provided', async () => {
            const formData = new FormData()
            formData.append('name', 'Steve')

            mockSignInAnonymously.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
            builderResult = { data: { id: '1' }, error: null }

            await createHousehold(formData)

            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                name: 'My Household',
                created_by: '1',
            }))
        })
    })

    describe('joinHousehold', () => {
        it('requires a name', async () => {
            const formData = new FormData()
            const result = await joinHousehold('code', formData)
            expect(result).toEqual({ error: 'Name is required' })
        })

        it('returns error for invalid invite code', async () => {
            const formData = new FormData()
            formData.append('name', 'Steve')

            builderResult = { data: null, error: { message: 'Not found' } }

            const result = await joinHousehold('bad-code', formData)
            expect(result).toEqual({ error: 'Invalid or expired invite link.' })
        })

        it('joins household successfully', async () => {
            const formData = new FormData()
            formData.append('name', 'Steve')

            // Household lookup
            builderResult = { data: { id: 'house-1', name: 'Apt 4B' }, error: null }

            // Auth
            mockSignInAnonymously.mockResolvedValue({
                data: { user: { id: 'user-2' } },
                error: null,
            })

            await joinHousehold('valid-code', formData)

            // Membership
            expect(mockFrom).toHaveBeenCalledWith('household_members')
            expect(mockInsert).toHaveBeenCalledWith({
                household_id: 'house-1',
                user_id: 'user-2',
                role: 'member',
            })

            // Activity log
            expect(mockFrom).toHaveBeenCalledWith('activity_logs')
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                action: 'member_joined',
            }))

            expect(redirect).toHaveBeenCalledWith('/dashboard')
        })

        it('returns specific error for duplicate membership', async () => {
            const formData = new FormData()
            formData.append('name', 'Steve')

            // Set initial lookup result
            builderResult = { data: { id: 'house-1' }, error: null }

            mockSignInAnonymously.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

            // We need `insert` to fail for the membership table. We intercept `then` to check context.
            // A simpler way: just override `.then` to return the error when we are doing the membership insert.
            mockQueryBuilder.then = (resolve: any) => {
                const insertCalls = mockInsert.mock.calls
                const lastInsert = insertCalls[insertCalls.length - 1]?.[0]
                if (lastInsert && 'role' in lastInsert) {
                    return Promise.resolve({ error: { code: '23505' } }).then(resolve)
                }
                return Promise.resolve({ error: null }).then(resolve)
            }

            const result = await joinHousehold('code', formData)
            expect(result).toEqual({ error: 'You are already a member of this household.' })
        })
    })

    describe('leaveHousehold', () => {
        it('returns error if not authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } })
            const result = await leaveHousehold()
            expect(result).toEqual({ error: 'Not authenticated' })
        })

        it('allows regular member to leave', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } })

            // Lookup membership
            builderResult = { data: { id: 'mem-1', household_id: 'house-1', role: 'member' }, error: null }

            await leaveHousehold()

            expect(mockFrom).toHaveBeenCalledWith('household_members')
            expect(mockDelete).toHaveBeenCalled()
            expect(mockSignOut).toHaveBeenCalled()
            expect(redirect).toHaveBeenCalledWith('/')
        })

        it('prevents owner from leaving if other members exist', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            // Lookup membership
            builderResult = { data: { id: 'mem-1', household_id: 'house-1', role: 'owner' }, error: null }

            // Because count is returned by eq directly, we'll override then for eq
            mockQueryBuilder.then = (resolve: any) => {
                const selectCalls = mockSelect.mock.calls
                const lastSelect = selectCalls[selectCalls.length - 1]
                if (lastSelect?.[1]?.count === 'exact') {
                    return Promise.resolve({ count: 2, error: null }).then(resolve)
                }
                return Promise.resolve(builderResult).then(resolve)
            }

            const result = await leaveHousehold()

            expect(result).toEqual({
                error: 'Transfer ownership before leaving. You are the household owner.',
            })
            expect(mockDelete).not.toHaveBeenCalled()
        })

        it('deletes household if last owner leaves', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            // Lookup membership
            builderResult = { data: { id: 'mem-1', household_id: 'house-1', role: 'owner' }, error: null }

            mockQueryBuilder.then = (resolve: any) => {
                const selectCalls = mockSelect.mock.calls
                const lastSelect = selectCalls[selectCalls.length - 1]
                if (lastSelect?.[1]?.count === 'exact') {
                    return Promise.resolve({ count: 1, error: null }).then(resolve)
                }
                return Promise.resolve(builderResult).then(resolve)
            }

            await leaveHousehold()

            expect(mockFrom).toHaveBeenCalledWith('households')
            expect(mockEq).toHaveBeenCalledWith('id', 'house-1')
            expect(redirect).toHaveBeenCalledWith('/')
        })
    })
})
