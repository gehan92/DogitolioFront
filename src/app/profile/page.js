'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Star, User, Pencil, Trash2, Check, X, MessageSquare, Clock } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Avatar, Button, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import clsx from 'clsx'

const EDIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function canEdit(createdAt) {
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={13} strokeWidth={1.5}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, token, loading } = useAuth()
  const router = useRouter()

  const [reviews,    setReviews]    = useState([])
  const [revLoading, setRevLoading] = useState(true)
  const [editId,     setEditId]     = useState(null)
  const [editText,   setEditText]   = useState('')
  const [editRating, setEditRating] = useState(0)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    async function fetchReviews() {
      setRevLoading(true)
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, restaurant_id, restaurants(name, town)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setReviews(data || [])
      setRevLoading(false)
    }
    fetchReviews()
  }, [user])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  function startEdit(review) {
    setEditId(review.id)
    setEditText(review.comment || '')
    setEditRating(review.rating)
  }

  function cancelEdit() {
    setEditId(null)
    setEditText('')
    setEditRating(0)
  }

  async function saveEdit(id) {
    setSaving(true)
    try {
      await api.reviews.update(id, { rating: editRating, comment: editText }, token)
      setReviews(rs => rs.map(r => r.id === id
        ? { ...r, rating: editRating, comment: editText }
        : r
      ))
      cancelEdit()
    } catch (err) {
      alert(err.message)
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this review?')) return
    setDeleting(id)
    try {
      await api.reviews.delete(id, token)
      setReviews(rs => rs.filter(r => r.id !== id))
    } catch (err) {
      alert(err.message)
    } finally { setDeleting(null) }
  }

  if (loading || !user) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* Profile header */}
        <div className="card p-6 mb-5">
          <div className="flex items-center gap-4">
            <Avatar src={profile?.avatar_url} name={profile?.name || user.email} size={64} />
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">{profile?.name || 'User'}</h1>
              <p className="text-sm text-[var(--c-muted)]">{user.email}</p>
              {profile?.role === 'admin' && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">Admin</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/restaurants" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <Star size={16} className="text-brand-600" />
            </div>
            <span className="text-sm font-semibold text-[var(--c-text)]">Browse restaurants</span>
          </Link>
          {profile?.role === 'admin' && (
            <Link href="/admin" className="card p-4 flex items-center gap-3 hover:border-amber-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <User size={16} className="text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-[var(--c-text)]">Admin dashboard</span>
            </Link>
          )}
        </div>

        {/* ── My Reviews */}
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-brand-500" />
            <h2 className="font-display font-bold text-[var(--c-text)]">My Reviews</h2>
            {!revLoading && (
              <span className="ml-auto text-xs text-[var(--c-muted)] bg-gray-100 px-2 py-0.5 rounded-full">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </div>

          {revLoading ? (
            <div className="flex justify-center py-8"><Spinner size={24} /></div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-[var(--c-muted)]">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reviews yet. Visit a restaurant to leave one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => {
                const editable = canEdit(review.created_at)
                const isEditing = editId === review.id
                return (
                  <div key={review.id}
                    className="border border-gray-100 rounded-2xl p-4 hover:border-brand-100 transition-colors">

                    {/* Restaurant name + date */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Link href={`/restaurants/${review.restaurant_id}`}
                          className="font-semibold text-sm text-[var(--c-text)] hover:text-brand-600 transition-colors">
                          {review.restaurants?.name || 'Restaurant'}
                        </Link>
                        {review.restaurants?.town && (
                          <span className="text-xs text-[var(--c-muted)] ml-1">· {review.restaurants.town}</span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--c-muted)] shrink-0 flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(review.created_at)}
                      </span>
                    </div>

                    {/* Rating */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 mb-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setEditRating(n)}>
                            <Star size={18} strokeWidth={1.5}
                              className={clsx('transition-colors', n <= editRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200 fill-gray-200')} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-2"><StarRow rating={review.rating} /></div>
                    )}

                    {/* Comment */}
                    {isEditing ? (
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none mb-2"
                      />
                    ) : (
                      review.comment && (
                        <p className="text-sm text-[var(--c-muted)] leading-relaxed">{review.comment}</p>
                      )
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(review.id)} disabled={saving}
                            className="flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            <Check size={12} /> Save
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">
                            <X size={12} /> Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {editable && (
                            <button onClick={() => startEdit(review)}
                              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors">
                              <Pencil size={12} /> Edit
                            </button>
                          )}
                          {!editable && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={11} /> Edit window closed
                            </span>
                          )}
                          <button onClick={() => handleDelete(review.id)} disabled={deleting === review.id}
                            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors ml-auto disabled:opacity-50">
                            <Trash2 size={12} /> {deleting === review.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="card p-4">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 py-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors">
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
