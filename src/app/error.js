'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-500 mb-6 max-w-sm">{error?.message || 'An unexpected error occurred.'}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-[#FF2D55] text-white text-sm font-semibold hover:bg-[#e0103a] transition-colors"
        >
          Try again
        </button>
        <Link href="/" className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
          Go home
        </Link>
      </div>
    </div>
  )
}
