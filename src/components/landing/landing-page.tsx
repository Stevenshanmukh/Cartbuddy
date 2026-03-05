'use client'

import Link from 'next/link'

export function LandingPage() {
    return (
        <div className="min-h-dvh bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-6">
            {/* Logo & Branding */}
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25">
                    <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    CartBuddy
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Shop together, in real time
                </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-sm space-y-3">
                <Link
                    href="/signup"
                    className="block w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] transition-all duration-200 text-lg text-center"
                >
                    Get Started
                </Link>
                <Link
                    href="/login"
                    className="block w-full py-4 px-6 bg-white text-gray-700 font-semibold rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 text-lg text-center"
                >
                    Sign In
                </Link>
            </div>

            {/* Features */}
            <div className="mt-12 max-w-sm w-full space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Multiple households — like Splitwise groups
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Real-time collaborative shopping lists
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Works offline • Invite your roommates
                </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-400 mt-12">
                Free forever • Open source
            </p>
        </div>
    )
}
