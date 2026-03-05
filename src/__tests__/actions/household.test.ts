import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSignOut = vi.fn()
const mockRpc = vi.fn()

let builderResult: any = { data: null, error: null }

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockIn = vi.fn()
const mockHead = vi.fn()

const mockQueryBuilder: any = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    single: mockSingle,
    in: mockIn,
    head: mockHead,
    then: (resolve: any) => Promise.resolve(builderResult).then(resolve),
}

mockSelect.mockReturnValue(mockQueryBuilder)
mockInsert.mockReturnValue(mockQueryBuilder)
mockUpdate.mockReturnValue(mockQueryBuilder)
mockDelete.mockReturnValue(mockQueryBuilder)
mockEq.mockReturnValue(mockQueryBuilder)
mockIn.mockReturnValue(mockQueryBuilder)
mockHead.mockReturnValue(mockQueryBuilder)
mockSingle.mockImplementation(() => Promise.resolve(builderResult))

const mockFrom = vi.fn(() => mockQueryBuilder)

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getUser: mockGetUser,
            signOut: mockSignOut,
        },
        from: mockFrom,
        rpc: mockRpc,
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
    leaveHousehold,
    deleteHousehold,
    signOut,
} from '@/app/actions/household'
import { redirect } from 'next/navigation'

describe('Household Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        builderResult = { data: { id: 'test-id' }, error: null }
        mockQueryBuilder.then = (resolve: any) => Promise.resolve(builderResult).then(resolve)
    })

    describe('createHousehold', () => {
        it('requires authentication', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } })
            const formData = new FormData()
            formData.append('householdName', 'Apt 4B')
            const result = await createHousehold(formData)
            expect(result).toEqual({ error: 'Not authenticated' })
        })

        it('creates a household with the provided name', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
            const formData = new FormData()
            formData.append('householdName', 'Apt 4B')

            builderResult = { data: { id: 'house-1' }, error: null }

            await createHousehold(formData)

            expect(mockFrom).toHaveBeenCalledWith('households')
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Apt 4B',
                created_by: 'user-1',
            }))
        })

        it('falls back to default name when none provided', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
            const formData = new FormData()
            // No householdName appended

            builderResult = { data: { id: 'house-1' }, error: null }

            await createHousehold(formData)

            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                name: 'My Household',
                created_by: 'user-1',
            }))
        })

        it('adds caller as owner member', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
            const formData = new FormData()
            formData.append('householdName', 'Test')

            builderResult = { data: { id: 'house-1' }, error: null }

            await createHousehold(formData)

            expect(mockFrom).toHaveBeenCalledWith('household_members')
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                household_id: 'house-1',
                user_id: 'user-1',
                role: 'owner',
            }))
        })
    })

    describe('leaveHousehold', () => {
        it('returns error if not authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } })
            const result = await leaveHousehold('house-1')
            expect(result).toEqual({ error: 'Not authenticated' })
        })

        it('returns error if not a member', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
            builderResult = { data: null, error: null }

            const result = await leaveHousehold('house-1')
            expect(result).toEqual({ error: 'Not in this household' })
        })
    })

    describe('deleteHousehold', () => {
        it('returns error if not authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } })
            const result = await deleteHousehold('house-1')
            expect(result).toEqual({ error: 'Not authenticated' })
        })
    })

    describe('signOut', () => {
        it('signs out and redirects to root', async () => {
            await signOut()
            expect(mockSignOut).toHaveBeenCalled()
            expect(redirect).toHaveBeenCalledWith('/')
        })
    })
})
