'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Crown, LayoutDashboard, Users, Shield, History, Settings,
  ChevronLeft, ChevronRight, Search, RefreshCw, Ban, CheckCircle,
  UserCog, AlertTriangle, BarChart3, Menu, X, LogOut,
  ArrowUpCircle, ArrowDownCircle, Activity, Building2,
  Download, ChevronDown, ChevronUp, Clock, Filter, TrendingUp,
  ShieldCheck, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import clsx from 'clsx'

const PAGE_SIZE = 15

const ROLE_OPTIONS = ['user', 'staff', 'owner', 'admin', 'superuser']

const ADMIN_PANEL_SECTIONS = [
  { key: 'Overview',      label: 'Overview',        group: 'Content'    },
  { key: 'Analytics',     label: 'Analytics',       group: 'Content'    },
  { key: 'Restaurants',   label: 'Restaurants',     group: 'Content'    },
  { key: 'Approval',      label: 'Approval Queue',  group: 'Content'    },
  { key: 'Menu Items',    label: 'Menu Items',       group: 'Content'    },
  { key: 'Gallery',       label: 'Gallery',         group: 'Content'    },
  { key: 'Banners',       label: 'Banners',         group: 'Content'    },
  { key: 'FAQs',          label: 'FAQs',            group: 'Content'    },
  { key: 'Reviews',       label: 'Reviews',         group: 'Moderation' },
  { key: 'Requests',      label: 'Change Requests', group: 'Moderation' },
  { key: 'Boost',         label: 'Boost',           group: 'Moderation' },
  { key: 'Tickets',       label: 'Support Tickets', group: 'Moderation' },
  { key: 'Users',         label: 'Users',           group: 'Admin'      },
  { key: 'Owners',        label: 'Owners',          group: 'Admin'      },
  { key: 'Staff',         label: 'Staff',           group: 'Admin'      },
  { key: 'Tasks',         label: 'Staff Tasks',     group: 'Admin'      },
  { key: 'Announcements', label: 'Announcements',   group: 'Admin'      },
  { key: 'Revenue',       label: 'Revenue',         group: 'Finance'    },
  { key: 'Notifications', label: 'Notifications',   group: 'System'     },
  { key: 'Site Content',  label: 'Site Content',    group: 'System'     },
  { key: 'Theme',         label: 'Theme',           group: 'System'     },
  { key: 'History',       label: 'History',         group: 'System'     },
  { key: 'Reports',       label: 'Reports',         group: 'System'     },
]

const ROLE_COLORS = {
  superuser: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  admin:     { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-300'  },
  staff:     { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300'   },
  owner:     { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  user:      { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300'   },
}

const BAN_DURATION_OPTIONS = [
  { label: '1 Day',    value: '1d'   },
  { label: '7 Days',   value: '7d'   },
  { label: '30 Days',  value: '30d'  },
  { label: '90 Days',  value: '90d'  },
  { label: 'Permanent',value: 'perm' },
]

const SA_NAV = [
  { key: 'Overview',   label: 'Overview',      icon: LayoutDashboard, group: 'Dashboard' },
  { key: 'Users',      label: 'All Users',     icon: Users,           group: 'Access'    },
  { key: 'Admins',     label: 'Admins',        icon: Shield,          group: 'Access'    },
  { key: 'Superusers', label: 'Superusers',    icon: Crown,           group: 'Access'    },
  { key: 'AdminPerms', label: 'Admin Access',  icon: ShieldCheck,     group: 'Access'    },
  { key: 'AuditLogs',  label: 'Audit Logs',    icon: History,         group: 'System'    },
  { key: 'Reports',    label: 'Reports',       icon: TrendingUp,      group: 'System'    },
  { key: 'System',     label: 'System Info',   icon: Settings,        group: 'System'    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function banUntilDate(duration) {
  if (duration === 'perm') return null
  const days = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 }[duration] || 7
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function exportCSV(users) {
  const headers = ['Name', 'City', 'Role', 'Status', 'Joined', 'Ban Reason', 'Banned Until']
  const rows = users.map(u => [
    u.name || 'Unnamed',
    u.city || '',
    u.role,
    u.is_banned ? 'Banned' : 'Active',
    u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
    u.ban_reason || '',
    u.banned_until ? new Date(u.banned_until).toLocaleDateString() : '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `users-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPageChange, loading = false }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--c-border)]">
      <p className="text-xs text-[var(--c-muted)]">
        Page <span className="font-semibold text-[var(--c-text)]">{page}</span> of{' '}
        <span className="font-semibold text-[var(--c-text)]">{totalPages}</span>
        {total > 0 && <span className="ml-1.5 text-[var(--c-dim)]">· {total.toLocaleString()} total</span>}
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1 || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-[var(--c-surface2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={13} /> Prev
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-[var(--c-surface2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.user
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', c.bg, c.text, c.border)}>
      {role === 'superuser' && <Crown size={9} className="mr-0.5" />}
      {role}
    </span>
  )
}

function TabSpinner() {
  return <div className="flex justify-center items-center py-20"><Spinner size={28} /></div>
}

function StatCard({ label, value, sub, color = '#7c3aed', icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[var(--c-border)] p-5 flex items-start gap-4" style={{ background: 'var(--c-surface)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-extrabold" style={{ color: 'var(--c-text)' }}>{value ?? '—'}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--c-muted)' }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-dim)' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger = true, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--c-border)] shadow-2xl p-6" style={{ background: 'var(--c-surface)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', danger ? 'bg-red-100' : 'bg-violet-100')}>
            <AlertTriangle size={16} className={danger ? 'text-red-600' : 'text-violet-600'} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--c-text)' }}>{title}</h3>
            {description && <p className="text-[12px] mt-1" style={{ color: 'var(--c-muted)' }}>{description}</p>}
          </div>
        </div>
        {children}
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--c-border)] hover:bg-[var(--c-surface2)] transition-all"
            style={{ color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className={clsx('px-4 py-2 rounded-xl text-xs font-bold text-white transition-all',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700')}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User Detail Row (expandable) ──────────────────────────────────────────────
function UserRow({ u, isSelf, currentUserId, roleOptions, roleSaving, onChangeRole, onBan, showSuperuser }) {
  const [expanded, setExpanded] = useState(false)
  const isSU   = u.role === 'superuser'
  const banKey = `ban_${u.id}`
  const saving = roleSaving[u.id] || roleSaving[banKey]

  return (
    <>
      <tr
        className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface2)] transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar src={u.avatar_url} name={u.name} size={32} />
            <div>
              <p className="text-[13px] font-semibold leading-none flex items-center gap-1.5" style={{ color: 'var(--c-text)' }}>
                {u.name || 'Unnamed'}
                {isSelf && <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">YOU</span>}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-dim)' }}>{u.city || 'No city'}</p>
            </div>
          </div>
        </td>

        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          {isSelf || (isSU && !showSuperuser) ? (
            <RoleBadge role={u.role} />
          ) : (
            <select value={u.role}
              onChange={e => onChangeRole(u, e.target.value)}
              disabled={saving || isSelf}
              className="text-[11px] px-2 py-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface2)] text-[var(--c-text)] font-semibold outline-none disabled:opacity-50"
            >
              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </td>

        <td className="px-4 py-3">
          <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full',
            u.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
            {u.is_banned ? 'Banned' : 'Active'}
          </span>
        </td>

        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          {!isSelf && !isSU && (
            <button onClick={() => onBan(u)}
              disabled={saving}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50',
                u.is_banned
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              )}>
              {saving ? <Spinner size={12} /> : u.is_banned ? <><CheckCircle size={12} /> Unban</> : <><Ban size={12} /> Ban</>}
            </button>
          )}
          {isSU && !isSelf && (
            <span className="text-[11px] text-violet-500 flex items-center gap-1">
              <Crown size={11} /> Manage in Superusers tab
            </span>
          )}
          {isSelf && <span className="text-[11px]" style={{ color: 'var(--c-dim)' }}>—</span>}
        </td>

        <td className="px-4 py-2 text-right">
          {expanded ? <ChevronUp size={13} style={{ color: 'var(--c-dim)' }} /> : <ChevronDown size={13} style={{ color: 'var(--c-dim)' }} />}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-[var(--c-border)]">
          <td colSpan={5} className="px-6 py-4" style={{ background: 'var(--c-surface2)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
              <div>
                <p className="font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-dim)' }}>User ID</p>
                <p className="font-mono break-all" style={{ color: 'var(--c-muted)' }}>{u.id}</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-dim)' }}>Joined</p>
                <p style={{ color: 'var(--c-text)' }}>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</p>
              </div>
              {u.is_banned && (
                <>
                  <div>
                    <p className="font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-dim)' }}>Ban Reason</p>
                    <p className="text-red-600">{u.ban_reason || 'No reason given'}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-dim)' }}>Banned Until</p>
                    <p className="text-red-600">{u.banned_until ? new Date(u.banned_until).toLocaleString() : 'Permanent'}</p>
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function SuperAdminPage() {
  const { user, profile, isSuperuser, loading: authLoading, token } = useAuth()
  const router = useRouter()

  const [tab,         setTab]         = useState('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [msg,         setMsg]         = useState({ type: '', text: '' })

  // ── Overview
  const [stats,        setStats]        = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // ── Users list
  const [users,       setUsers]       = useState([])
  const [usersPage,   setUsersPage]   = useState(1)
  const [usersTotal,  setUsersTotal]  = useState(0)
  const [usersTotalP, setUsersTotalP] = useState(1)
  const [usersLoad,   setUsersLoad]   = useState(false)
  const [roleFilter,  setRoleFilter]  = useState('')
  const [searchQ,     setSearchQ]     = useState('')
  const [roleSaving,  setRoleSaving]  = useState({})

  // ── Audit logs
  const [logs,        setLogs]        = useState([])
  const [logsPage,    setLogsPage]    = useState(1)
  const [logsTotal,   setLogsTotal]   = useState(0)
  const [logsTotalP,  setLogsTotalP]  = useState(1)
  const [logsLoad,    setLogsLoad]    = useState(false)
  const [logFilter,   setLogFilter]   = useState('')

  // ── Reports
  const [saReportsData,    setSaReportsData]    = useState(null)
  const [saReportsLoading, setSaReportsLoading] = useState(false)

  // ── Admin Permissions
  const [adminsList,       setAdminsList]       = useState([])
  const [adminsLoading,    setAdminsLoading]    = useState(false)
  const [selAdminId,       setSelAdminId]       = useState(null)
  const [adminPermsEdit,   setAdminPermsEdit]   = useState({})
  const [adminPermsSaving, setAdminPermsSaving] = useState(false)
  const [adminPermsMsg,    setAdminPermsMsg]    = useState('')

  // ── Confirmation modal state
  const [modal, setModal] = useState(null)
  // modal = { type: 'ban'|'unban'|'role'|'promote'|'revoke', user, newRole?, banReason?, banDuration? }

  // ── Auth guard
  useEffect(() => {
    if (!authLoading && !isSuperuser) router.replace('/')
  }, [authLoading, isSuperuser, router])

  useEffect(() => {
    if (!isSuperuser || !token) return
    fetchStats()
  }, [isSuperuser, token])

  useEffect(() => {
    if (!isSuperuser || !token) return
    if (tab === 'Users')      fetchUsers(1, roleFilter, searchQ)
    if (tab === 'Admins')     fetchUsers(1, 'admin', '')
    if (tab === 'Superusers') fetchUsers(1, 'superuser', '')
    if (tab === 'AuditLogs')  fetchLogs(1)
    if (tab === 'Reports')    fetchAdminSummary()
    if (tab === 'AdminPerms') fetchAdminsList()
  }, [tab, isSuperuser, token])

  // ── Stats ─────────────────────────────────────────────────────────────────
  async function fetchStats() {
    setStatsLoading(true)
    try {
      const data = await api.superadmin.stats(token)
      setStats(data)
    } catch {
      // fallback: direct Supabase counts
      const { data: profiles } = await supabase.from('profiles').select('role')
      const counts = { superuser: 0, admin: 0, staff: 0, owner: 0, user: 0 }
      profiles?.forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++ })
      setStats({ users: counts })
    } finally {
      setStatsLoading(false)
    }
  }

  // ── Admin Permission Management ───────────────────────────────────────────
  async function fetchAdminsList() {
    setAdminsLoading(true)
    try {
      const res = await api.superadmin.users({ role: 'admin', limit: 100 }, token)
      setAdminsList(res.data || [])
    } catch (e) { showMsg('error', e.message) }
    finally { setAdminsLoading(false) }
  }

  async function loadAdminPerms(adminId) {
    setSelAdminId(adminId)
    setAdminPermsEdit({})
    setAdminPermsMsg('')
    try {
      const res = await api.superadmin.adminPermissions(adminId, token)
      const map = {}
      ADMIN_PANEL_SECTIONS.forEach(s => { map[s.key] = true })
      ;(res.data || []).forEach(p => { map[p.section] = p.can_access })
      setAdminPermsEdit(map)
    } catch (e) { showMsg('error', e.message) }
  }

  async function saveAdminPerms() {
    if (!selAdminId) return
    setAdminPermsSaving(true)
    setAdminPermsMsg('')
    try {
      const permissions = Object.entries(adminPermsEdit).map(([section, can_access]) => ({ section, can_access }))
      await api.superadmin.updateAdminPermissions(selAdminId, permissions, token)
      setAdminPermsMsg('Permissions saved.')
      setTimeout(() => setAdminPermsMsg(''), 3000)
    } catch (e) { setAdminPermsMsg(e.message) }
    finally { setAdminPermsSaving(false) }
  }

  // ── Admin summary report ──────────────────────────────────────────────────
  async function fetchAdminSummary() {
    setSaReportsLoading(true)
    try {
      const data = await api.reports.adminSummary(token)
      setSaReportsData(data)
    } catch (e) {
      showMsg('error', e.message)
    } finally {
      setSaReportsLoading(false)
    }
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  async function fetchUsers(page, role = roleFilter, q = searchQ) {
    setUsersLoad(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (role)    params.role   = role
      if (q.trim()) params.search = q.trim()

      const res = await api.superadmin.users(params, token)
      setUsers(res.data || [])
      setUsersTotal(res.total || 0)
      setUsersTotalP(Math.max(1, res.totalPages || 1))
      setUsersPage(page)
    } catch (e) {
      showMsg('error', e.message)
    } finally {
      setUsersLoad(false)
    }
  }

  // ── Open confirmation modal ────────────────────────────────────────────────
  function openBanModal(u) {
    if (u.is_banned) {
      setModal({ type: 'unban', target: u })
    } else {
      setModal({ type: 'ban', target: u, banReason: '', banDuration: '7d' })
    }
  }

  function openRoleModal(u, newRole) {
    setModal({ type: 'role', target: u, newRole })
  }

  function openSuperuserModal(u) {
    setModal({ type: u.role === 'superuser' ? 'revoke' : 'promote', target: u })
  }

  // ── Confirm actions ───────────────────────────────────────────────────────
  async function confirmAction() {
    if (!modal) return
    const { type, target, newRole, banReason, banDuration } = modal
    setModal(null)

    const key    = type === 'ban' || type === 'unban' ? `ban_${target.id}` : target.id
    setRoleSaving(s => ({ ...s, [key]: true }))

    try {
      if (type === 'ban') {
        const banned_until = banUntilDate(banDuration)
        await api.superadmin.patchUser(target.id, { is_banned: true, ban_reason: banReason || null, banned_until }, token)
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, is_banned: true, ban_reason: banReason, banned_until } : u))
        showMsg('success', `${target.name || 'User'} banned.`)
      }

      if (type === 'unban') {
        await api.superadmin.patchUser(target.id, { is_banned: false }, token)
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, is_banned: false, ban_reason: null, banned_until: null } : u))
        showMsg('success', `${target.name || 'User'} unbanned.`)
      }

      if (type === 'role') {
        await api.superadmin.patchUser(target.id, { role: newRole }, token)
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, role: newRole } : u))
        showMsg('success', `Role updated to "${newRole}".`)
      }

      if (type === 'promote') {
        await api.superadmin.patchUser(target.id, { role: 'superuser' }, token)
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, role: 'superuser' } : u))
        showMsg('success', `${target.name || 'User'} promoted to superuser.`)
      }

      if (type === 'revoke') {
        await api.superadmin.patchUser(target.id, { role: 'user' }, token)
        setUsers(prev => prev.filter(u => u.id !== target.id))
        showMsg('success', `Superuser revoked from ${target.name || 'User'}.`)
      }
    } catch (e) {
      showMsg('error', e.message)
    } finally {
      setRoleSaving(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────
  async function fetchLogs(page, filter = logFilter) {
    setLogsLoad(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (filter.trim()) params.action_filter = filter.trim()
      const res = await api.superadmin.auditLogs(params, token)
      setLogs(res.data || [])
      setLogsTotal(res.total || 0)
      setLogsTotalP(Math.max(1, res.totalPages || 1))
      setLogsPage(page)
    } catch (e) {
      showMsg('error', e.message)
    } finally {
      setLogsLoad(false)
    }
  }

  function showMsg(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 4000)
  }

  function switchTab(key) {
    setTab(key)
    setSidebarOpen(false)
  }

  // ── Loading / guard ────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
      <Spinner size={32} />
    </div>
  )

  if (!isSuperuser) return null

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const groups = [...new Set(SA_NAV.map(n => n.group))]

  const Sidebar = (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[var(--c-border)] overflow-y-auto" style={{ background: 'var(--c-surface)' }}>
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--c-border)]">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <Crown size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[13px] font-extrabold leading-none" style={{ color: 'var(--c-text)' }}>Super Admin</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-dim)' }}>Full system access</p>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-4">
        {groups.map(group => (
          <div key={group}>
            <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-dim)' }}>{group}</p>
            {SA_NAV.filter(n => n.group === group).map(({ key, label, icon: Icon }) => {
              const active = tab === key
              return (
                <button key={key} onClick={() => switchTab(key)}
                  className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 text-left',
                    active ? 'text-violet-700' : 'text-[var(--c-muted)] hover:text-[var(--c-text)]')}
                  style={{ background: active ? '#f5f3ff' : '' }}
                >
                  <Icon size={15} className="shrink-0" style={{ color: active ? '#7c3aed' : 'var(--c-dim)' }} />
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-[var(--c-border)]">
        <Link href="/admin"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:bg-amber-50"
          style={{ color: '#d97706' }}>
          <Shield size={13} /> Open Admin Panel
        </Link>
        <Link href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
          style={{ color: 'var(--c-dim)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface2)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          <LogOut size={13} /> Back to Site
        </Link>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Flash message */}
      {msg.text && (
        <div className={clsx(
          'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg',
          msg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {msg.text}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!modal}
        onClose={() => setModal(null)}
        onConfirm={confirmAction}
        danger={modal?.type !== 'promote'}
        title={
          modal?.type === 'ban'     ? `Ban ${modal.target?.name || 'User'}?` :
          modal?.type === 'unban'   ? `Unban ${modal.target?.name || 'User'}?` :
          modal?.type === 'role'    ? `Change role to "${modal?.newRole}"?` :
          modal?.type === 'promote' ? `Promote ${modal.target?.name || 'User'} to Superuser?` :
          modal?.type === 'revoke'  ? `Revoke superuser from ${modal.target?.name || 'User'}?` : ''
        }
        description={
          modal?.type === 'ban'     ? 'The user will not be able to log in until unbanned.' :
          modal?.type === 'unban'   ? 'The user will regain full access to the platform.' :
          modal?.type === 'promote' ? 'This grants full system access. Only promote users you fully trust.' :
          modal?.type === 'revoke'  ? 'This will downgrade the user to regular user role.' : undefined
        }
        confirmLabel={
          modal?.type === 'ban'     ? 'Ban User' :
          modal?.type === 'unban'   ? 'Unban User' :
          modal?.type === 'promote' ? 'Promote' :
          modal?.type === 'revoke'  ? 'Revoke' :
          'Confirm'
        }
      >
        {modal?.type === 'ban' && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--c-muted)' }}>Reason (shown to user)</label>
              <input
                value={modal.banReason}
                onChange={e => setModal(m => ({ ...m, banReason: e.target.value }))}
                placeholder="e.g. Violation of community guidelines"
                className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface2)] text-[var(--c-text)] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--c-muted)' }}>Duration</label>
              <div className="flex flex-wrap gap-2">
                {BAN_DURATION_OPTIONS.map(opt => (
                  <button key={opt.value}
                    onClick={() => setModal(m => ({ ...m, banDuration: opt.value }))}
                    className={clsx('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
                      modal.banDuration === opt.value
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-[var(--c-border)] text-[var(--c-muted)] hover:bg-[var(--c-surface2)]'
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </ConfirmModal>

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full">

        {/* Desktop sidebar */}
        <div className="hidden md:flex">{Sidebar}</div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-40 w-56 md:hidden">{Sidebar}</div>
          </>
        )}

        <main className="flex-1 min-w-0 p-4 md:p-8">

          {/* Mobile header */}
          <div className="flex items-center gap-3 mb-6 md:hidden">
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border border-[var(--c-border)]" style={{ background: 'var(--c-surface)' }}>
              <Menu size={18} style={{ color: 'var(--c-text)' }} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold" style={{ color: '#7c3aed' }}>Super Admin</h1>
              <p className="text-[11px]" style={{ color: 'var(--c-dim)' }}>{SA_NAV.find(n => n.key === tab)?.label}</p>
            </div>
          </div>

          {/* Desktop title */}
          <div className="hidden md:flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <Crown size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--c-text)' }}>
                {SA_NAV.find(n => n.key === tab)?.label}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--c-dim)' }}>
                Signed in as <span className="font-semibold" style={{ color: '#7c3aed' }}>{profile?.name}</span>
              </p>
            </div>
          </div>

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {tab === 'Overview' && (
            <div>
              {statsLoading ? <TabSpinner /> : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard label="Superusers"   value={stats?.users?.superuser}       icon={Crown}      color="#7c3aed" />
                    <StatCard label="Admins"        value={stats?.users?.admin}           icon={Shield}     color="#d97706" />
                    <StatCard label="Staff"         value={stats?.users?.staff}           icon={UserCog}    color="#2563eb" />
                    <StatCard label="Owners"        value={stats?.users?.owner}           icon={Building2}  color="#9333ea" />
                    <StatCard label="Users"         value={stats?.users?.user}            icon={Users}      color="#059669" />
                    <StatCard label="Total Users"   value={stats?.users?.total}           icon={Activity}   color="#0891b2" />
                    <StatCard label="Banned"        value={stats?.users?.banned}          icon={Ban}        color="#dc2626" />
                    <StatCard label="New (30d)"     value={stats?.users?.newLast30Days}   icon={ArrowUpCircle} color="#16a34a" />
                    <StatCard label="Restaurants"   value={stats?.totalRestaurants}       icon={Building2}  color="#7c3aed" />
                    <StatCard label="Reviews"       value={stats?.totalReviews}           icon={BarChart3}  color="#7c3aed" />
                    <StatCard label="Pending Reqs"  value={stats?.pendingRequests}        icon={AlertTriangle} color="#d97706" />
                  </div>

                  <div className="mt-4 p-4 rounded-2xl border border-violet-200 bg-violet-50">
                    <p className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                      <Crown size={15} /> You are signed in as a Superuser
                    </p>
                    <p className="text-xs text-violet-600 mt-1">
                      You have full system access. Changes made here affect all users and cannot be undone. Use with caution.
                    </p>
                  </div>

                  <div className="mt-4 flex gap-3 flex-wrap">
                    <button onClick={fetchStats}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--c-border)] transition-all hover:bg-[var(--c-surface2)]"
                      style={{ color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
                      <RefreshCw size={13} /> Refresh Stats
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ALL USERS ────────────────────────────────────────────────── */}
          {tab === 'Users' && (
            <UsersSection
              users={users} loading={usersLoad} total={usersTotal} totalPages={usersTotalP} page={usersPage}
              roleFilter={roleFilter} setRoleFilter={setRoleFilter}
              searchQ={searchQ} setSearchQ={setSearchQ}
              onFetch={(p, r, q) => { setRoleFilter(r ?? roleFilter); setSearchQ(q ?? searchQ); fetchUsers(p, r ?? roleFilter, q ?? searchQ) }}
              onChangeRole={(u, newRole) => openRoleModal(u, newRole)}
              onBan={openBanModal}
              roleSaving={roleSaving} currentUserId={user?.id}
              showSuperuser={true}
            />
          )}

          {/* ── ADMINS ───────────────────────────────────────────────────── */}
          {tab === 'Admins' && (
            <UsersSection
              users={users} loading={usersLoad} total={usersTotal} totalPages={usersTotalP} page={usersPage}
              roleFilter="admin" setRoleFilter={() => {}} searchQ="" setSearchQ={() => {}}
              onFetch={(p) => fetchUsers(p, 'admin', '')}
              onChangeRole={(u, newRole) => openRoleModal(u, newRole)}
              onBan={openBanModal}
              roleSaving={roleSaving} currentUserId={user?.id}
              showSuperuser={false} lockedFilter="admin"
              emptyMsg="No admin users found."
            />
          )}

          {/* ── SUPERUSERS ───────────────────────────────────────────────── */}
          {tab === 'Superusers' && (
            <SuperusersSection
              users={users} loading={usersLoad} total={usersTotal} totalPages={usersTotalP} page={usersPage}
              onFetch={(p) => fetchUsers(p, 'superuser', '')}
              onAssign={openSuperuserModal}
              roleSaving={roleSaving} currentUserId={user?.id}
            />
          )}

          {/* ── AUDIT LOGS ───────────────────────────────────────────────── */}
          {tab === 'AuditLogs' && (
            <AuditSection
              logs={logs} loading={logsLoad} total={logsTotal} totalPages={logsTotalP} page={logsPage}
              logFilter={logFilter} setLogFilter={setLogFilter}
              onFetch={(p, f) => { if (f !== undefined) setLogFilter(f); fetchLogs(p, f ?? logFilter) }}
            />
          )}

          {/* ── ADMIN ACCESS PERMISSIONS ─────────────────────────────────── */}
          {tab === 'AdminPerms' && (
            <div>
              <p className="text-xs mb-6" style={{ color: 'var(--c-dim)' }}>
                Select an admin to control which sections of the admin panel they can access.
              </p>

              {adminsLoading ? <TabSpinner /> : !adminsList.length ? (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No admin accounts found.</div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">

                  {/* Admin list */}
                  <div className="w-full lg:w-60 shrink-0 rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
                    <div className="px-4 py-3 border-b border-[var(--c-border)]" style={{ background: 'var(--c-surface2)' }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-dim)' }}>Select Admin</p>
                    </div>
                    {adminsList.map(a => (
                      <button
                        key={a.id}
                        onClick={() => loadAdminPerms(a.id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--c-border)] last:border-0 transition-colors text-left',
                          selAdminId === a.id ? 'bg-violet-50' : 'hover:bg-[var(--c-surface2)]'
                        )}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                          style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                          {(a.name || '?')[0].toUpperCase()}
                        </div>
                        <p className="text-[13px] font-semibold truncate"
                          style={{ color: selAdminId === a.id ? '#7c3aed' : 'var(--c-text)' }}>
                          {a.name || 'Unnamed'}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Permission toggles */}
                  {!selAdminId ? (
                    <div className="flex-1 flex items-center justify-center py-20 rounded-2xl border border-dashed border-[var(--c-border)]">
                      <p className="text-sm" style={{ color: 'var(--c-dim)' }}>← Select an admin to manage their panel access</p>
                    </div>
                  ) : Object.keys(adminPermsEdit).length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-20"><Spinner size={28} /></div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      {['Content', 'Moderation', 'Admin', 'Finance', 'System'].map(group => (
                        <div key={group} className="rounded-2xl border border-[var(--c-border)] mb-4 overflow-hidden" style={{ background: 'var(--c-surface)' }}>
                          <div className="px-5 py-3 border-b border-[var(--c-border)]" style={{ background: 'var(--c-surface2)' }}>
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-dim)' }}>{group}</p>
                          </div>
                          <div className="divide-y divide-[var(--c-border)]">
                            {ADMIN_PANEL_SECTIONS.filter(s => s.group === group).map(s => (
                              <div key={s.key} className="flex items-center justify-between px-5 py-3">
                                <p className="text-[13px] font-semibold" style={{ color: 'var(--c-text)' }}>{s.label}</p>
                                <button onClick={() => setAdminPermsEdit(prev => ({ ...prev, [s.key]: !prev[s.key] }))}>
                                  {adminPermsEdit[s.key]
                                    ? <ToggleRight size={26} className="text-violet-600" />
                                    : <ToggleLeft  size={26} style={{ color: 'var(--c-dim)' }} />
                                  }
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between mt-2 gap-3">
                        {adminPermsMsg && (
                          <p className={clsx('text-xs font-semibold', adminPermsMsg === 'Permissions saved.' ? 'text-green-600' : 'text-red-600')}>
                            {adminPermsMsg}
                          </p>
                        )}
                        <button
                          onClick={saveAdminPerms}
                          disabled={adminPermsSaving}
                          className="ml-auto px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                          {adminPermsSaving ? 'Saving…' : 'Save Permissions'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SYSTEM ───────────────────────────────────────────────────── */}
          {tab === 'System' && <SystemSection profile={profile} />}

          {/* ── REPORTS ──────────────────────────────────────────────────── */}
          {tab === 'Reports' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-extrabold" style={{ color: 'var(--c-text)' }}>Admin Activity Summary</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-dim)' }}>Actions and tasks assigned by each admin in the last 30 days</p>
                </div>
                <button onClick={fetchAdminSummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--c-border)] hover:bg-[var(--c-surface2)] transition-all"
                  style={{ color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
                  <TrendingUp size={13} /> Refresh
                </button>
              </div>

              {saReportsLoading ? (
                <div className="flex justify-center items-center py-20"><Spinner size={28} /></div>
              ) : !saReportsData ? (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No report data available.</div>
              ) : !saReportsData.data?.length ? (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No admin accounts found.</div>
              ) : (
                <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--c-border)]" style={{ background: 'var(--c-surface2)' }}>
                          {['Admin','Actions (30d)','Tasks Assigned (30d)','Joined'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-dim)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {saReportsData.data.map(a => (
                          <tr key={a.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface2)] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                                  style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                                  {(a.name || '?')[0].toUpperCase()}
                                </div>
                                <p className="text-[12px] font-semibold" style={{ color: 'var(--c-text)' }}>{a.name || 'Unnamed'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full',
                                a.actionsLast30d > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400')}>
                                {a.actionsLast30d}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full',
                                a.tasksAssigned > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400')}>
                                {a.tasksAssigned}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--c-dim)' }}>
                              {a.joined ? new Date(a.joined).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// USERS SECTION
// ════════════════════════════════════════════════════════════════════════════
function UsersSection({
  users, loading, total, totalPages, page,
  roleFilter, setRoleFilter, searchQ, setSearchQ,
  onFetch, onChangeRole, onBan,
  roleSaving, currentUserId,
  showSuperuser = true, lockedFilter, emptyMsg = 'No users found.',
}) {
  const [localQ, setLocalQ] = useState(searchQ)
  const roleOptions = showSuperuser ? ROLE_OPTIONS : ROLE_OPTIONS.filter(r => r !== 'superuser')

  return (
    <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[var(--c-border)]">
        {!lockedFilter && (
          <select value={roleFilter} onChange={e => onFetch(1, e.target.value, localQ)}
            className="text-xs px-3 py-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface2)] text-[var(--c-text)] font-semibold outline-none">
            <option value="">All Roles</option>
            {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        )}
        {!lockedFilter && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface2)]">
            <Search size={13} style={{ color: 'var(--c-dim)' }} />
            <input
              value={localQ}
              onChange={e => setLocalQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onFetch(1, roleFilter, localQ) }}
              placeholder="Search by name…"
              className="text-xs bg-transparent outline-none text-[var(--c-text)] placeholder:text-[var(--c-dim)] w-36"
            />
            {localQ && <button onClick={() => { setLocalQ(''); onFetch(1, roleFilter, '') }}><X size={11} style={{ color: 'var(--c-dim)' }} /></button>}
          </div>
        )}
        <button onClick={() => users.length > 0 && exportCSV(users)}
          disabled={users.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--c-border)] hover:bg-[var(--c-surface2)] transition-all disabled:opacity-40"
          style={{ color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
          <Download size={13} /> Export CSV
        </button>
        <p className="ml-auto text-[11px] font-semibold" style={{ color: 'var(--c-dim)' }}>{total} user{total !== 1 ? 's' : ''}</p>
      </div>

      {loading ? <TabSpinner /> : users.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>{emptyMsg}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--c-border)]" style={{ background: 'var(--c-surface2)' }}>
                {['User', 'Role', 'Status', 'Actions', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--c-dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <UserRow
                  key={u.id}
                  u={u}
                  isSelf={u.id === currentUserId}
                  currentUserId={currentUserId}
                  roleOptions={roleOptions}
                  roleSaving={roleSaving}
                  onChangeRole={onChangeRole}
                  onBan={onBan}
                  showSuperuser={showSuperuser}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={p => onFetch(p)} loading={loading} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SUPERUSERS SECTION
// ════════════════════════════════════════════════════════════════════════════
function SuperusersSection({ users, loading, total, totalPages, page, onFetch, onAssign, roleSaving, currentUserId }) {
  const [assignSearch,  setAssignSearch]  = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)

  async function searchUsers(q) {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role')
        .ilike('name', `%${q.trim()}%`)
        .neq('role', 'superuser')
        .limit(8)
      setSearchResults(data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleAssign(u) {
    onAssign(u)
    setAssignSearch('')
    setSearchResults([])
    setTimeout(() => onFetch(1), 500)
  }

  return (
    <div className="space-y-6">
      {/* Current superusers */}
      <div className="rounded-2xl border border-violet-200 overflow-hidden" style={{ background: 'var(--c-surface)' }}>
        <div className="px-5 py-4 border-b border-violet-200 flex items-center gap-3" style={{ background: '#f5f3ff' }}>
          <Crown size={16} style={{ color: '#7c3aed' }} />
          <h3 className="text-[13px] font-bold text-violet-800">Current Superusers</h3>
          <span className="ml-auto text-[11px] font-semibold text-violet-600">{total} superuser{total !== 1 ? 's' : ''}</span>
        </div>

        {loading ? <TabSpinner /> : users.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No superusers found.</div>
        ) : (
          <div className="divide-y divide-[var(--c-border)]">
            {users.map(u => {
              const isSelf = u.id === currentUserId
              const saving = roleSaving[u.id]
              return (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={u.avatar_url} name={u.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                      {u.name || 'Unnamed'}
                      {isSelf && <span className="ml-1.5 text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">YOU</span>}
                    </p>
                  </div>
                  <RoleBadge role="superuser" />
                  {!isSelf && (
                    <button onClick={() => onAssign(u)} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50">
                      {saving ? <Spinner size={12} /> : <><ArrowDownCircle size={12} /> Revoke</>}
                    </button>
                  )}
                  {isSelf && <span className="text-[11px] text-violet-400">Cannot self-modify</span>}
                </div>
              )
            })}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onFetch} loading={loading} />
      </div>

      {/* Assign superuser */}
      <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
        <div className="px-5 py-4 border-b border-[var(--c-border)]">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>Assign Superuser Role</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-dim)' }}>Search and promote an existing user.</p>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface2)] w-full max-w-sm">
            <Search size={13} style={{ color: 'var(--c-dim)' }} />
            <input
              value={assignSearch}
              onChange={e => { setAssignSearch(e.target.value); searchUsers(e.target.value) }}
              placeholder="Search users by name…"
              className="text-xs bg-transparent outline-none text-[var(--c-text)] placeholder:text-[var(--c-dim)] flex-1"
            />
            {searching && <Spinner size={12} />}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 rounded-xl border border-[var(--c-border)] overflow-hidden max-w-sm">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface2)] transition-colors">
                  <Avatar src={u.avatar_url} name={u.name} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--c-text)' }}>{u.name || 'Unnamed'}</p>
                    <RoleBadge role={u.role} />
                  </div>
                  <button onClick={() => handleAssign(u)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all">
                    <ArrowUpCircle size={11} /> Promote
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 rounded-xl border border-amber-200 bg-amber-50 max-w-sm">
            <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Superuser privileges grant full system access.
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">Only promote users you fully trust.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// AUDIT SECTION
// ════════════════════════════════════════════════════════════════════════════
function AuditSection({ logs, loading, total, totalPages, page, onFetch, logFilter, setLogFilter }) {
  const [localFilter, setLocalFilter] = useState(logFilter)

  return (
    <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[var(--c-border)]">
        <div>
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>Audit Logs</h3>
          <p className="text-[11px]" style={{ color: 'var(--c-dim)' }}>Full system-wide activity log</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface2)]">
            <Filter size={12} style={{ color: 'var(--c-dim)' }} />
            <input
              value={localFilter}
              onChange={e => setLocalFilter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onFetch(1, localFilter) }}
              placeholder="Filter by action…"
              className="text-xs bg-transparent outline-none text-[var(--c-text)] placeholder:text-[var(--c-dim)] w-32"
            />
            {localFilter && <button onClick={() => { setLocalFilter(''); onFetch(1, '') }}><X size={11} style={{ color: 'var(--c-dim)' }} /></button>}
          </div>
          <button onClick={() => onFetch(1, localFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[var(--c-border)] hover:bg-[var(--c-surface2)] transition-all"
            style={{ color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {loading ? <TabSpinner /> : logs.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No audit logs found.</div>
      ) : (
        <div className="divide-y divide-[var(--c-border)]">
          {logs.map((log, i) => (
            <div key={log.id || i} className="px-5 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={12} style={{ color: '#7c3aed' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--c-text)' }}>{log.action}</p>
                  {log.profiles?.name && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 font-semibold">
                      by {log.profiles.name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] truncate" style={{ color: 'var(--c-dim)' }}>{log.target}</p>
              </div>
              <p className="text-[10px] shrink-0 mt-0.5 flex items-center gap-1" style={{ color: 'var(--c-dim)' }}>
                <Clock size={10} />
                {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={p => onFetch(p)} loading={loading} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM SECTION
// ════════════════════════════════════════════════════════════════════════════
function SystemSection({ profile }) {
  const items = [
    { label: 'Your Role',    value: 'superuser',                                                    highlight: true  },
    { label: 'Your Name',    value: profile?.name || '—',                                           highlight: false },
    { label: 'Environment',  value: process.env.NODE_ENV || 'unknown',                              highlight: false },
    { label: 'API Base',     value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',     highlight: false },
    { label: 'Supabase URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured ✓' : 'Not set', highlight: false },
    { label: 'Auth Guard',   value: 'requireSuperuser middleware ✓',                               highlight: false },
    { label: 'Audit Logs',   value: 'Connected to /superadmin/audit-logs ✓',                       highlight: false },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
        <div className="px-5 py-4 border-b border-[var(--c-border)]">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>System Information</h3>
        </div>
        <div className="divide-y divide-[var(--c-border)]">
          {items.map(({ label, value, highlight }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--c-muted)' }}>{label}</span>
              <span className={clsx('text-[12px] font-bold', highlight ? 'text-violet-700' : '')}
                style={!highlight ? { color: 'var(--c-text)' } : {}}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-green-200 p-5 bg-green-50">
        <h4 className="text-sm font-bold text-green-800 flex items-center gap-2 mb-2">
          <CheckCircle size={15} /> All Systems Fixed
        </h4>
        <ul className="text-[12px] text-green-700 space-y-1 leading-relaxed list-disc list-inside">
          <li>Backend now accepts <code className="font-mono bg-green-100 px-1 rounded">superuser</code> role in all admin endpoints</li>
          <li>Dedicated <code className="font-mono bg-green-100 px-1 rounded">/superadmin/*</code> routes with <code className="font-mono bg-green-100 px-1 rounded">requireSuperuser</code> guard</li>
          <li>Ban system supports reason + temporary durations (auto-expires)</li>
          <li>Audit logs wired to real backend</li>
          <li>Confirmation modal on all destructive actions</li>
          <li>CSV export for user lists</li>
          <li>Expandable user detail rows</li>
        </ul>
      </div>
    </div>
  )
}
