'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'

export function EmailConfirmedBanner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (searchParams.get('confirmed') !== '1') return
    setShow(true)
    router.replace('/', { scroll: false })
    const timer = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(timer)
  }, [searchParams])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white shadow-xl border border-green-100 max-w-[min(92vw,380px)]">
      <CheckCircle2 size={18} className="text-green-600 shrink-0" />
      <p className="text-sm font-semibold text-gray-800">Email confirmed! Welcome to MealHere.</p>
      <button onClick={() => setShow(false)} className="ml-1 text-gray-300 hover:text-gray-500 shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}
