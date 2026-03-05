import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes: redirect to login if not authenticated
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/households') ||
        request.nextUrl.pathname.startsWith('/store') ||
        request.nextUrl.pathname.startsWith('/shop') ||
        request.nextUrl.pathname.startsWith('/activity') ||
        request.nextUrl.pathname.startsWith('/settings')

    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    // Auth routes: redirect to households if already logged in
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup')

    if (isAuthRoute && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/households'
        return NextResponse.redirect(url)
    }

    // Landing page: redirect to households if logged in
    if (user && request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/households'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
