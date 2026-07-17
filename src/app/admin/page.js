'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter }                      from 'next/navigation'
import Link                               from 'next/link'
import {
  LayoutDashboard, UtensilsCrossed, MessageSquare, Users, Upload,
  Plus, Check, X, Trash2, Shield, Image, FileText, Pencil, Tag,
  Menu, Clock, Home, ChevronRight, ChevronLeft, Zap, ZapOff, History,
  Inbox, Building2, UserCheck, ChevronDown, AlertCircle, Eye, EyeOff, ExternalLink,
  Palette, Moon, Sun, Megaphone, ToggleLeft, ToggleRight,
  Bell, BarChart2, HelpCircle, DollarSign, ClipboardCheck,
  Ticket, ListTodo, Send, ChevronUp, TrendingUp, Play, Search, Paperclip,
} from 'lucide-react'
import { THEMES } from '@/lib/themes'
import { adminListBanners, adminSaveBanner, adminToggleBanner, adminDeleteBanner } from '@/lib/banners'
import Navbar           from '@/components/layout/Navbar'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import { useAuth }      from '@/hooks/useAuth'
import { supabase }     from '@/lib/supabase'
import { api }          from '@/lib/api'
import { buildVenueUrl } from '@/lib/venueUrl'
import clsx             from 'clsx'

const PAGE_SIZE = 12
const REST_PAGE_SIZE = 24

// Sections staff can have access toggled for (admin-only sections excluded)
const STAFF_SECTIONS = [
  'Overview', 'Restaurants', 'Boost', 'Reviews', 'Requests',
  'Menu Items', 'Site Content', 'History', 'Gallery', 'Tasks', 'Tickets', 'Reports',
]

// All nav items — staff sees a filtered subset based on their permissions
const ALL_NAV_ITEMS = [
  // Content
  { key: 'Overview',     label: 'Overview',        icon: LayoutDashboard, adminOnly: false, group: 'Content'    },
  { key: 'Analytics',    label: 'Analytics',       icon: BarChart2,       adminOnly: true,  group: 'Content'    },
  { key: 'Restaurants',  label: 'Restaurants',     icon: UtensilsCrossed, adminOnly: false, group: 'Content'    },
  { key: 'Approval',     label: 'Approval Queue',  icon: ClipboardCheck,  adminOnly: true,  group: 'Content'    },
  { key: 'Menu Items',   label: 'Menu Items',      icon: Tag,             adminOnly: false, group: 'Content'    },
  { key: 'Gallery',      label: 'Gallery',         icon: Image,           adminOnly: false, group: 'Content'    },
  { key: 'Banners',      label: 'Banners',         icon: Megaphone,       adminOnly: true,  group: 'Content'    },
  { key: 'FAQs',         label: 'FAQs',            icon: HelpCircle,      adminOnly: true,  group: 'Content'    },
  // Moderation
  { key: 'Reviews',      label: 'Reviews',         icon: MessageSquare,   adminOnly: false, group: 'Moderation' },
  { key: 'Requests',     label: 'Change Requests', icon: Inbox,           adminOnly: false, group: 'Moderation' },
  { key: 'Boost',        label: 'Boost',           icon: Zap,             adminOnly: false, group: 'Moderation' },
  { key: 'Tickets',      label: 'Support Tickets', icon: Ticket,          adminOnly: false, group: 'Moderation' },
  // Admin
  { key: 'Users',        label: 'Users',           icon: Users,           adminOnly: true,  group: 'Admin'      },
  { key: 'Owners',       label: 'Owners',          icon: Building2,       adminOnly: true,  group: 'Admin'      },
  { key: 'Staff',        label: 'Staff',           icon: UserCheck,       adminOnly: true,  group: 'Admin'      },
  { key: 'Tasks',        label: 'Staff Tasks',     icon: ListTodo,        adminOnly: false, group: 'Admin'      },
  { key: 'Announcements',label: 'Announcements',   icon: Bell,            adminOnly: true,  group: 'Admin'      },
  // Finance
  { key: 'Revenue',      label: 'Revenue',         icon: DollarSign,      adminOnly: true,  group: 'Finance'    },
  // System
  { key: 'Notifications',label: 'Notifications',   icon: Bell,            adminOnly: true,  group: 'System'     },
  { key: 'Site Content', label: 'Site Content',    icon: FileText,        adminOnly: false, group: 'System'     },
  { key: 'Theme',        label: 'Theme',           icon: Palette,         adminOnly: true,  group: 'System'     },
  { key: 'History',      label: 'History',         icon: Clock,           adminOnly: false, group: 'System'     },
  { key: 'Reports',      label: 'Reports',         icon: TrendingUp,      adminOnly: false, group: 'System'     },
]

const STATUS_COLORS = {
  pending:  'bg-amber-50  text-amber-700  border-amber-200',
  approved: 'bg-blue-50   text-blue-700   border-blue-200',
  rejected: 'bg-red-50    text-red-600    border-red-200',
  paid:     'bg-purple-50 text-purple-700 border-purple-200',
  applied:  'bg-green-50  text-green-700  border-green-200',
}

const ROLE_COLORS = {
  admin: 'amber',
  staff: 'blue',
  owner: 'purple',
  user:  'gray',
}

// ── Reusable pagination bar ────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPageChange, loading = false }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--c-border)]">
      <p className="text-xs text-[var(--c-muted)]">
        Page{' '}
        <span className="font-semibold text-[var(--c-text)]">{page}</span>
        {' '}of{' '}
        <span className="font-semibold text-[var(--c-text)]">{totalPages}</span>
        {total > 0 && (
          <span className="ml-1.5 text-[var(--c-dim)]">· {total.toLocaleString()} total</span>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={13} /> Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

function TabSpinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <Spinner size={28} />
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize',
      STATUS_COLORS[status] || 'bg-gray-50 text-gray-600 border-gray-200'
    )}>
      {status}
    </span>
  )
}

// ── Main admin / staff workplace page ──────────────────────────────────────
export default function AdminPage() {
  const { user, profile, isAdmin, isStaff, isSuperuser, loading: authLoading, token } = useAuth()
  const router = useRouter()

  // ── Navigation
  const [tab,         setTab]         = useState('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tabsLoaded,  setTabsLoaded]  = useState(new Set(['Overview']))

  // ── Staff permissions (loaded from Supabase directly via RLS)
  const [myPermissions,      setMyPermissions]      = useState(null) // null = not yet loaded
  // ── Admin permissions (superadmin-controlled — loaded for non-superuser admins)
  const [myAdminPermissions, setMyAdminPermissions] = useState(null)

  // ── Global state
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restaurants (paginated table)
  const [restaurants,    setRestaurants]    = useState([])
  const [restPage,       setRestPage]       = useState(1)
  const [restTotal,      setRestTotal]      = useState(0)
  const [restTotalPages, setRestTotalPages] = useState(1)
  const [restsLoading,   setRestsLoading]   = useState(false)
  const [restSearch,     setRestSearch]     = useState('')
  const restSearchTimeout = useRef(null)

  // ── Restaurant options (all, for dropdowns)
  const [restaurantOptions, setRestaurantOptions] = useState([])

  // ── Reviews (paginated)
  const [reviews,        setReviews]        = useState([])
  const [revPage,        setRevPage]        = useState(1)
  const [revTotal,       setRevTotal]       = useState(0)
  const [revTotalPages,  setRevTotalPages]  = useState(1)
  const [revsLoading,    setRevsLoading]    = useState(false)

  // ── Users (paginated + role filter)
  const [users,           setUsers]           = useState([])
  const [usersPage,       setUsersPage]       = useState(1)
  const [usersTotal,      setUsersTotal]      = useState(0)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usrsLoading,     setUsrsLoading]     = useState(false)
  const [usersRoleFilter, setUsersRoleFilter] = useState('')
  const [userRoleCounts,  setUserRoleCounts]  = useState(null) // { total, admin, staff, owner, user }
  const [usersMsg,        setUsersMsg]        = useState('')

  // ── Audit logs (paginated)
  const [auditLogs,      setAuditLogs]      = useState([])
  const [logsPage,       setLogsPage]       = useState(1)
  const [logsTotal,      setLogsTotal]      = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [auditLoading,   setAuditLoading]   = useState(false)

  // ── Change Requests (paginated + status filter)
  const [changeRequests,    setChangeRequests]    = useState([])
  const [crPage,            setCrPage]            = useState(1)
  const [crTotal,           setCrTotal]           = useState(0)
  const [crTotalPages,      setCrTotalPages]      = useState(1)
  const [crLoading,         setCrLoading]         = useState(false)
  const [crStatusFilter,    setCrStatusFilter]    = useState('')
  const [crExpandedId,      setCrExpandedId]      = useState(null)
  const [crExpandedData,    setCrExpandedData]    = useState({})
  const [crActionNote,      setCrActionNote]      = useState('')
  const [crActionLoading,   setCrActionLoading]   = useState(false)

  // ── Owners
  const [owners,       setOwners]       = useState([])
  const [ownersLoading,setOwnersLoading]= useState(false)
  const [ownerForm,    setOwnerForm]    = useState({ owner_id: '', restaurant_id: '' })
  const [ownerMsg,     setOwnerMsg]     = useState('')
  const [ownerSaving,  setOwnerSaving]  = useState(false)
  const [allUsers,     setAllUsers]     = useState([])
  const [assignableStaff, setAssignableStaff] = useState([])

  // ── Staff Management
  const [staffList,       setStaffList]       = useState([])
  const [staffPage,       setStaffPage]       = useState(1)
  const [staffTotal,      setStaffTotal]      = useState(0)
  const [staffTotalPages, setStaffTotalPages] = useState(1)
  const [staffLoading,    setStaffLoading]    = useState(false)
  const [expandedStaffId, setExpandedStaffId] = useState(null)
  const [staffPermsMap,   setStaffPermsMap]   = useState({}) // { staffId: { section: bool } }
  const [staffPermsLoading, setStaffPermsLoading] = useState(false)
  const [staffPermsMsg,   setStaffPermsMsg]   = useState('')
  const [staffRestaurantsMap,     setStaffRestaurantsMap]     = useState({}) // { staffId: Set(restaurantId) }
  const [staffRestaurantsLoading, setStaffRestaurantsLoading] = useState(false)
  const [staffRestaurantsMsg,     setStaffRestaurantsMsg]     = useState('')

  // ── Menu upload
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [pdfFile,            setPdfFile]            = useState(null)
  const [uploading,          setUploading]          = useState(false)
  const [uploadMsg,          setUploadMsg]          = useState('')

  // ── Menu items
  const [miRestaurant, setMiRestaurant] = useState('')
  const [menuItems,    setMenuItems]    = useState([])
  const [miLoading,    setMiLoading]    = useState(false)
  const [miForm, setMiForm] = useState({
    name: '', description: '', price: '', category: '',
    discount_type: '', discount_value: '', photo: null, photo_url: '',
    ingredients: '', portions: [],
  })
  const [miEditId, setMiEditId] = useState(null)
  const [miSaving, setMiSaving] = useState(false)
  const [miMsg,    setMiMsg]    = useState('')
  const [miPhotoPreview, setMiPhotoPreview] = useState('')

  useEffect(() => {
    if (!miForm.photo) { setMiPhotoPreview(''); return }
    const url = URL.createObjectURL(miForm.photo)
    setMiPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [miForm.photo])

  // ── Site Content
  const [scPage,           setScPage]           = useState('home')
  const [scFields,         setScFields]         = useState({})
  const [scOriginalFields, setScOriginalFields] = useState({})
  const [scLoading,        setScLoading]        = useState(false)
  const [scSavingSection,  setScSavingSection]  = useState(null)
  const [scSectionMsg,     setScSectionMsg]     = useState({})
  const [scSavedKeys,      setScSavedKeys]      = useState(new Set())

  // ── Theme
  const [activeTheme,   setActiveTheme]   = useState('warm')
  const [savedThemeKey, setSavedThemeKey] = useState(null)
  const [themeSaving,   setThemeSaving]   = useState(false)
  const [themeMsg,      setThemeMsg]      = useState('')

  // ── Banners
  const BANNER_EMPTY = { title: '', subtitle: '', image_url: '', cta_text: 'Learn More', cta_link: '', placement: 'home', sort_order: 0, is_active: true }
  const [banners,             setBanners]             = useState([])
  const [bannersLoading,      setBannersLoading]      = useState(false)
  const [bannersTableMissing, setBannersTableMissing] = useState(false)
  const [bannerForm,          setBannerForm]          = useState(BANNER_EMPTY)
  const [bannerEditId,        setBannerEditId]        = useState(null)
  const [bannerSaving,        setBannerSaving]        = useState(false)
  const [bannerMsg,           setBannerMsg]           = useState('')

  // ── Analytics
  const [analyticsData,    setAnalyticsData]    = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // ── Approval Queue
  const [pendingRests,        setPendingRests]        = useState([])
  const [pendingRestsLoading, setPendingRestsLoading] = useState(false)
  const [approvalMsg,         setApprovalMsg]         = useState('')

  // ── History tab
  const [historySubTab,      setHistorySubTab]      = useState('audit')
  const [editHistory,        setEditHistory]        = useState([])
  const [editHistoryLoading, setEditHistoryLoading] = useState(false)
  const [editHistoryTotal,   setEditHistoryTotal]   = useState(0)
  const [editHistoryPages,   setEditHistoryPages]   = useState(1)
  const [editHistoryPage,    setEditHistoryPage]    = useState(1)
  const [loginHistory,       setLoginHistory]       = useState([])
  const [loginHistLoading,   setLoginHistLoading]   = useState(false)
  const [loginHistTotal,     setLoginHistTotal]     = useState(0)
  const [loginHistPages,     setLoginHistPages]     = useState(1)
  const [loginHistPage,      setLoginHistPage]      = useState(1)
  const [banHistory,         setBanHistory]         = useState([])
  const [banHistLoading,     setBanHistLoading]     = useState(false)
  const [roleHistory,        setRoleHistory]        = useState([])
  const [roleHistLoading,    setRoleHistLoading]    = useState(false)
  const [availHistory,       setAvailHistory]       = useState([])
  const [availHistLoading,   setAvailHistLoading]   = useState(false)
  const [availHistTotal,     setAvailHistTotal]     = useState(0)
  const [availHistPages,     setAvailHistPages]     = useState(1)
  const [availHistPage,      setAvailHistPage]      = useState(1)

  // ── User activity modal
  const [activityUserId,   setActivityUserId]   = useState(null)
  const [activityUser,     setActivityUser]     = useState(null)
  const [activityData,     setActivityData]     = useState(null)
  const [activityLoading,  setActivityLoading]  = useState(false)

  // ── Staff notes/warnings
  const [staffNotesMap,    setStaffNotesMap]    = useState({})
  const [staffNoteInput,   setStaffNoteInput]   = useState({})
  const [staffWarnsMap,    setStaffWarnsMap]    = useState({})
  const [staffWarnInput,   setStaffWarnInput]   = useState({})
  const [staffWarnSaving,  setStaffWarnSaving]  = useState(false)
  const [staffExtMsg,      setStaffExtMsg]      = useState({})

  // ── Bulk select (Restaurants)
  const [selectedRests,    setSelectedRests]    = useState(new Set())
  const [bulkAction,       setBulkAction]       = useState('')
  const [bulkLoading,      setBulkLoading]      = useState(false)
  const [bulkMsg,          setBulkMsg]          = useState('')

  // ── FAQs
  const [faqs,        setFaqs]        = useState([])
  const [faqsLoading, setFaqsLoading] = useState(false)
  const [faqForm,     setFaqForm]     = useState({ question: '', answer: '', category: 'general', sort_order: 0 })
  const [faqEditId,   setFaqEditId]   = useState(null)
  const [faqSaving,   setFaqSaving]   = useState(false)
  const [faqMsg,      setFaqMsg]      = useState('')

  // ── Gallery
  const [galleryRestId,  setGalleryRestId]  = useState('')
  const [galleryImages,  setGalleryImages]  = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryFile,    setGalleryFile]    = useState(null)
  const [galleryCaption, setGalleryCaption] = useState('')
  const [galleryMsg,     setGalleryMsg]     = useState('')
  const [galleryUploading, setGalleryUploading] = useState(false)

  // ── Staff Tasks
  const [tasks,         setTasks]         = useState([])
  const [tasksLoading,  setTasksLoading]  = useState(false)
  const [tasksTotal,    setTasksTotal]    = useState(0)
  const [tasksPage,     setTasksPage]     = useState(1)
  const [tasksTotalPgs, setTasksTotalPgs] = useState(1)
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState('')
  const [taskForm,      setTaskForm]      = useState({ assigned_to: '', title: '', description: '', priority: 'medium', due_date: '' })
  const [taskSaving,    setTaskSaving]    = useState(false)
  const [taskMsg,       setTaskMsg]       = useState('')

  // ── Announcements
  const [announcements,        setAnnouncements]        = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [annForm,              setAnnForm]              = useState({ title: '', message: '', type: 'info', target: 'all', expires_at: '' })
  const [annEditId,            setAnnEditId]            = useState(null)
  const [annSaving,            setAnnSaving]            = useState(false)
  const [annMsg,               setAnnMsg]               = useState('')

  // ── Support Tickets
  const [tickets,         setTickets]         = useState([])
  const [ticketsLoading,  setTicketsLoading]  = useState(false)
  const [ticketsTotal,    setTicketsTotal]    = useState(0)
  const [ticketsPage,     setTicketsPage]     = useState(1)
  const [ticketsTotalPgs, setTicketsTotalPgs] = useState(1)
  const [ticketFilter,    setTicketFilter]    = useState('')
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('')
  const [ticketAssigneeFilter, setTicketAssigneeFilter] = useState('')
  const [expandedTicket,  setExpandedTicket]  = useState(null)
  const [ticketReply,     setTicketReply]     = useState('')
  const [ticketReplying,  setTicketReplying]  = useState(false)

  // ── Revenue / Payments
  const [payments,        setPayments]        = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsTotal,   setPaymentsTotal]   = useState(0)
  const [paymentsPage,    setPaymentsPage]    = useState(1)
  const [paymentsTotalPgs,setPaymentsTotalPgs]= useState(1)
  const [payForm,         setPayForm]         = useState({ restaurant_id: '', amount: '', plan_type: 'monthly', payment_date: '', notes: '' })
  const [paySaving,       setPaySaving]       = useState(false)
  const [payMsg,          setPayMsg]          = useState('')

  // ── Notifications (admin send panel)
  const [notifForm,    setNotifForm]    = useState({ role: 'all', title: '', message: '', type: 'info' })
  const [notifSaving,  setNotifSaving]  = useState(false)
  const [notifMsg,     setNotifMsg]     = useState('')

  // ── Reports
  const [reportsData,    setReportsData]    = useState(null)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsAllTasks,     setReportsAllTasks]     = useState([])
  const [reportsTasksLoading, setReportsTasksLoading] = useState(false)
  const [reportsStaffSearch,   setReportsStaffSearch]   = useState('')
  const [reportsStaffFilter,   setReportsStaffFilter]   = useState('') // '', 'overdue', 'warned'
  const [reportsTaskSearch,    setReportsTaskSearch]    = useState('')
  const [reportsTaskStatus,    setReportsTaskStatus]    = useState('')
  const [reportsTaskAssignee,  setReportsTaskAssignee]  = useState('')

  const SC_SCHEMAS = {
    home: [
      { section: 'Hero', fields: [
        { key: 'heroBadge',         label: 'Badge Text',        type: 'input'    },
        { key: 'heroHeadline',      label: 'Main Headline',     type: 'textarea' },
        { key: 'heroSubheadline',   label: 'Sub-headline',      type: 'textarea' },
      ]},
      { section: 'Stats Bar', fields: [
        { key: 'stat1Value', label: 'Stat 1 – Value (e.g. 500+)',      type: 'input' },
        { key: 'stat1Label', label: 'Stat 1 – Label (e.g. Food Places)', type: 'input' },
        { key: 'stat2Value', label: 'Stat 2 – Value',                  type: 'input' },
        { key: 'stat2Label', label: 'Stat 2 – Label',                  type: 'input' },
        { key: 'stat3Value', label: 'Stat 3 – Value',                  type: 'input' },
        { key: 'stat3Label', label: 'Stat 3 – Label',                  type: 'input' },
      ]},
      { section: '"Why Us" Section', fields: [
        { key: 'whyTitle',    label: 'Section Title',    type: 'input'    },
        { key: 'whySubtitle', label: 'Section Subtitle', type: 'textarea' },
      ]},
      { section: '"How It Works" Section', fields: [
        { key: 'howTitle',   label: 'Section Title',           type: 'input'    },
        { key: 'step1Title', label: 'Step 1 – Title',          type: 'input'    },
        { key: 'step1Desc',  label: 'Step 1 – Description',    type: 'textarea' },
        { key: 'step2Title', label: 'Step 2 – Title',          type: 'input'    },
        { key: 'step2Desc',  label: 'Step 2 – Description',    type: 'textarea' },
        { key: 'step3Title', label: 'Step 3 – Title',          type: 'input'    },
        { key: 'step3Desc',  label: 'Step 3 – Description',    type: 'textarea' },
      ]},
      { section: 'CTA Banner', fields: [
        { key: 'ctaBannerHeadline',    label: 'Headline',     type: 'input'    },
        { key: 'ctaBannerSubheadline', label: 'Sub-headline', type: 'textarea' },
      ]},
      { section: 'Testimonials', fields: [
        { key: 't1Name',     label: 'Review 1 – Name',     type: 'input'    },
        { key: 't1Location', label: 'Review 1 – Location', type: 'input'    },
        { key: 't1Text',     label: 'Review 1 – Quote',    type: 'textarea' },
        { key: 't2Name',     label: 'Review 2 – Name',     type: 'input'    },
        { key: 't2Location', label: 'Review 2 – Location', type: 'input'    },
        { key: 't2Text',     label: 'Review 2 – Quote',    type: 'textarea' },
        { key: 't3Name',     label: 'Review 3 – Name',     type: 'input'    },
        { key: 't3Location', label: 'Review 3 – Location', type: 'input'    },
        { key: 't3Text',     label: 'Review 3 – Quote',    type: 'textarea' },
      ]},
      { section: 'Footer', fields: [
        { key: 'footerDesc', label: 'Brand Description', type: 'textarea' },
      ]},
    ],
    about: [
      { section: 'Hero', fields: [
        { key: 'headline',    label: 'Page Headline',     type: 'input'    },
        { key: 'subheadline', label: 'Page Sub-headline', type: 'textarea' },
      ]},
      { section: 'Stats', fields: [
        { key: 'stat1Value', label: 'Stat 1 – Value', type: 'input' },
        { key: 'stat1Label', label: 'Stat 1 – Label', type: 'input' },
        { key: 'stat2Value', label: 'Stat 2 – Value', type: 'input' },
        { key: 'stat2Label', label: 'Stat 2 – Label', type: 'input' },
        { key: 'stat3Value', label: 'Stat 3 – Value', type: 'input' },
        { key: 'stat3Label', label: 'Stat 3 – Label', type: 'input' },
        { key: 'stat4Value', label: 'Stat 4 – Value', type: 'input' },
        { key: 'stat4Label', label: 'Stat 4 – Label', type: 'input' },
      ]},
      { section: 'Our Story', fields: [
        { key: 'storyTitle', label: 'Section Title', type: 'input'    },
        { key: 'storyP1',    label: 'Paragraph 1',   type: 'textarea' },
        { key: 'storyP2',    label: 'Paragraph 2',   type: 'textarea' },
      ]},
      { section: 'Our Values', fields: [
        { key: 'value1Title', label: 'Value 1 – Title',       type: 'input'    },
        { key: 'value1Desc',  label: 'Value 1 – Description', type: 'textarea' },
        { key: 'value2Title', label: 'Value 2 – Title',       type: 'input'    },
        { key: 'value2Desc',  label: 'Value 2 – Description', type: 'textarea' },
        { key: 'value3Title', label: 'Value 3 – Title',       type: 'input'    },
        { key: 'value3Desc',  label: 'Value 3 – Description', type: 'textarea' },
        { key: 'value4Title', label: 'Value 4 – Title',       type: 'input'    },
        { key: 'value4Desc',  label: 'Value 4 – Description', type: 'textarea' },
      ]},
      { section: 'CTA Section', fields: [
        { key: 'ctaHeadline', label: 'Headline', type: 'input'    },
        { key: 'ctaSubtitle', label: 'Subtitle', type: 'textarea' },
      ]},
    ],
    contact: [
      { section: 'Hero', fields: [
        { key: 'headline',    label: 'Page Headline',     type: 'input'    },
        { key: 'subheadline', label: 'Page Sub-headline', type: 'textarea' },
      ]},
      { section: 'Contact Info', fields: [
        { key: 'email',    label: 'Email Address', type: 'input' },
        { key: 'phone',    label: 'Phone Number',  type: 'input' },
        { key: 'location', label: 'Location',      type: 'input' },
        { key: 'hours',    label: 'Office Hours',  type: 'input' },
      ]},
    ],
  }

  const SC_DEFAULTS = {
    home: {
      heroBadge:            "Sri Lanka's Food Discovery Platform",
      heroHeadline:         "Find the best food menu near you",
      heroSubheadline:      "Hotels, restaurants, food shops & snack bars — every menu in one place.",
      stat1Value: '500+', stat1Label: 'Food Places',
      stat2Value: '9',    stat2Label: 'Provinces',
      stat3Value: '10K+', stat3Label: 'Reviews',
      whyTitle:    'Everything you need to find great food',
      whySubtitle: 'MealHere makes it easy to discover, explore and review every food place across Sri Lanka.',
      howTitle:    'How MealHere works',
      step1Title:  'Search',    step1Desc:  'Find food menus at hotels, restaurants, food shops and snack bars by name, price or location.',
      step2Title:  'View Menu', step2Desc:  'Browse the full menu with current prices — always up to date and accurate.',
      step3Title:  'Review',    step3Desc:  'Sign in and share your experience to help others find great food nearby.',
      ctaBannerHeadline:    "Ready to explore Sri Lanka's best food?",
      ctaBannerSubheadline: 'Browse menus, discover restaurants and share your experience — all in one place.',
      t1Name: 'Kavindi P.',  t1Location: 'Colombo', t1Text: 'Finally I can check the menu and prices before going to a restaurant. Saved me so many trips!',
      t2Name: 'Rashan F.',   t2Location: 'Galle',   t2Text: 'The PDF menu feature is excellent. I could see the full menu just like holding it in hand.',
      t3Name: 'Thilini S.',  t3Location: 'Kandy',   t3Text: 'Great app for finding local food spots. Discovered so many new places near my home.',
      footerDesc:      "Sri Lanka's food discovery platform. Find menus from hotels, restaurants, food shops and snack bars — all in one place.",
      footerCopyright: '© 2026 MealHere. All rights reserved.',
    },
    about: {
      headline:    'About MealHere',
      subheadline: "We built MealHere to solve a simple problem — finding food menus across Sri Lanka was hard. We made it easy.",
      stat1Value: '500+', stat1Label: 'Food Places Listed',
      stat2Value: '9',    stat2Label: 'Provinces Covered',
      stat3Value: '10K+', stat3Label: 'User Reviews',
      stat4Value: '4',    stat4Label: 'Venue Categories',
      storyTitle: "Sri Lanka's food discovery platform",
      storyP1:    'MealHere started with a simple question: "Where can I find the menu before I go?" We built the answer — a single platform where anyone can discover and explore food menus from hotels, restaurants, food shops and snack bars across every province in Sri Lanka.',
      storyP2:    "Whether you're a tourist looking for a good meal, a local finding a new favourite spot, or a business owner wanting to showcase your menu — MealHere is built for you.",
      value1Title: 'Our Mission',        value1Desc: "To make it effortless for anyone in Sri Lanka to find the right food menu — whether you're at a five-star hotel or a roadside snack bar.",
      value2Title: 'Community First',    value2Desc: 'We empower real customers to share honest reviews, helping others make better food choices every day.',
      value3Title: 'All 9 Provinces',    value3Desc: 'From Colombo to Jaffna, Kandy to Galle — we cover every province so no food place gets left behind.',
      value4Title: 'Trusted & Accurate', value4Desc: 'Menus are kept up to date by restaurant owners and verified by our team, so you always see real prices.',
      ctaHeadline: 'Ready to explore?',
      ctaSubtitle: 'Find the best food menus near you — from hotels to snack bars, all across Sri Lanka.',
    },
    contact: {
      headline:    'Contact Us',
      subheadline: "Have a question, feedback, or want to list your food place? We'd love to hear from you.",
      email:    'hello@mealhere.lk',
      phone:    '+94 11 234 5678',
      location: 'Colombo, Sri Lanka',
      hours:    '9:00 AM – 5:00 PM',
    },
  }

  // ── Boost
  const [boostPlan,       setBoostPlan]       = useState('30')
  const [boostMsg,        setBoostMsg]        = useState('')
  const [historyOpenId,   setHistoryOpenId]   = useState(null)
  const [boostHistoryMap, setBoostHistoryMap] = useState({})
  const [historyLoading,  setHistoryLoading]  = useState(false)

  // ── Auth guard: allow admin or staff
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth'); return }
    if (profile && !isAdmin && !isStaff) router.replace('/')
  }, [user, profile, isAdmin, isStaff, authLoading])

  // ── Initial load
  useEffect(() => {
    if (!token || (!isAdmin && !isStaff)) return
    loadInitial()
  }, [token, isAdmin, isStaff])

  // ── Deep link: /admin?tab=Tasks (used by notification links)
  // /admin?tab=Menu Items&restaurant=<id> also restores the selected
  // restaurant, and that one is kept in the URL (not stripped) so
  // refreshing or reopening the link keeps the same restaurant selected.
  useEffect(() => {
    if (!token || (!isAdmin && !isStaff)) return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const restaurantParam = params.get('restaurant')
    if (!tabParam) return

    navigate(tabParam)
    if (tabParam === 'Menu Items' && restaurantParam) {
      setMiRestaurant(restaurantParam)
      loadMenuItems(restaurantParam)
    } else {
      router.replace('/admin')
    }
  }, [token, isAdmin, isStaff])

  // ── Auto-refresh: Requests and Tasks poll in the background while open,
  // so a new assignment or status change from another user shows up without
  // a manual refresh (mirrors the NotificationBell's poll interval).
  useEffect(() => {
    if (!token) return
    if (tab !== 'Requests' && tab !== 'Tasks') return
    const id = setInterval(() => {
      if (tab === 'Requests') loadChangeRequests(crPage, crStatusFilter, true)
      else if (tab === 'Tasks') loadTasks(tasksPage, taskAssigneeFilter, true)
    }, 30000)
    return () => clearInterval(id)
  }, [token, tab, crPage, crStatusFilter, tasksPage, taskAssigneeFilter])

  // ── Data loaders ────────────────────────────────────────────────────────

  async function loadInitial() {
    setLoading(true)
    try {
      if (isAdmin) {
        const requests = [
          api.admin.stats(token),
          api.restaurants.list({ limit: 5000 }),
        ]
        if (!isSuperuser) requests.push(
          supabase.from('admin_permissions').select('section, can_access').eq('admin_id', profile.id)
        )
        const [statsData, optsData, permsResult] = await Promise.all(requests)
        setStats(statsData)
        setRestaurantOptions(optsData.data || [])
        if (permsResult) {
          const permMap = {}
          ;(permsResult.data || []).forEach(p => { permMap[p.section] = p.can_access })
          setMyAdminPermissions(permMap)
        }
      } else {
        // Staff: load restaurant options + own section permissions from Supabase (RLS allows)
        const [optsData, permsData] = await Promise.all([
          api.restaurants.list({ limit: 5000 }),
          supabase.from('staff_permissions').select('section, can_access').eq('staff_id', profile.id),
        ])
        setRestaurantOptions(optsData.data || [])
        const permMap = {}
        ;(permsData.data || []).forEach(p => { permMap[p.section] = p.can_access })
        setMyPermissions(permMap)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadRestaurants(page = 1, search = restSearch) {
    setRestsLoading(true)
    try {
      const params = { page, limit: REST_PAGE_SIZE, showAll: 1 }
      if (search) params.name = search
      const data = await api.restaurants.list(params)
      setRestaurants(data.data || [])
      setRestTotal(data.total ?? 0)
      setRestTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / REST_PAGE_SIZE))
      setRestPage(page)
    } catch (err) { console.error(err) }
    finally { setRestsLoading(false) }
  }

  function handleRestSearchChange(value) {
    setRestSearch(value)
    clearTimeout(restSearchTimeout.current)
    restSearchTimeout.current = setTimeout(() => loadRestaurants(1, value), 400)
  }

  async function loadReviews(page = 1) {
    setRevsLoading(true)
    try {
      const data = await api.admin.reviews({ page, limit: PAGE_SIZE }, token)
      setReviews(data.data || [])
      setRevTotal(data.total ?? 0)
      setRevTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setRevPage(page)
    } catch (err) { console.error(err) }
    finally { setRevsLoading(false) }
  }

  async function loadUsers(page = 1, roleFilter = usersRoleFilter, fetchCounts = false) {
    setUsrsLoading(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (roleFilter) params.role = roleFilter
      const calls = [api.admin.users(params, token)]
      if (fetchCounts) calls.push(api.admin.userCounts(token))
      const [data, counts] = await Promise.all(calls)
      setUsers(data.data || [])
      setUsersTotal(data.total ?? 0)
      setUsersTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setUsersPage(page)
      if (counts) setUserRoleCounts(counts)
    } catch (err) { console.error(err) }
    finally { setUsrsLoading(false) }
  }

  async function loadAuditLogs(page = 1) {
    setAuditLoading(true)
    try {
      const data = await api.admin.auditLogs({ page, limit: PAGE_SIZE }, token)
      setAuditLogs(data.data || [])
      setLogsTotal(data.total ?? 0)
      setLogsTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setLogsPage(page)
    } catch { setAuditLogs([]) }
    finally { setAuditLoading(false) }
  }

  async function loadChangeRequests(page = 1, statusFilter = crStatusFilter, silent = false) {
    if (!silent) setCrLoading(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (statusFilter) params.status = statusFilter
      const data = await api.admin.changeRequests(params, token)
      setChangeRequests(data.data || [])
      setCrTotal(data.total ?? 0)
      setCrTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setCrPage(page)
    } catch (err) { console.error(err) }
    finally { if (!silent) setCrLoading(false) }
  }

  async function loadOwners() {
    setOwnersLoading(true)
    try {
      const [ownersResult, usersResult] = await Promise.allSettled([
        api.admin.owners(token),
        api.admin.users({ limit: 200, role: 'owner' }, token),
      ])
      if (ownersResult.status === 'fulfilled') setOwners(ownersResult.value.data || [])
      else console.error('Failed to load owner assignments:', ownersResult.reason)
      if (usersResult.status === 'fulfilled') setAllUsers(usersResult.value.data || [])
      else console.error('Failed to load users for dropdown:', usersResult.reason)
    } finally { setOwnersLoading(false) }
  }

  async function loadStaff(page = 1) {
    setStaffLoading(true)
    try {
      const data = await api.admin.staff({ page, limit: PAGE_SIZE }, token)
      setStaffList(data.data || [])
      setStaffTotal(data.total ?? 0)
      setStaffTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setStaffPage(page)
    } catch (err) { console.error(err) }
    finally { setStaffLoading(false) }
  }

  // ── New load functions ──────────────────────────────────────────────────
  async function loadAnalytics() {
    setAnalyticsLoading(true)
    try { const d = await api.analytics.overview(token); setAnalyticsData(d) }
    catch (err) { console.error(err) }
    finally { setAnalyticsLoading(false) }
  }

  async function loadPendingApproval() {
    setPendingRestsLoading(true)
    try {
      const d = await api.restaurants.list({ showAll: true, page: 1, limit: 50 }, token)
      setPendingRests((d.data || []).filter(r => r.is_pending_approval))
    } catch (err) { console.error(err) }
    finally { setPendingRestsLoading(false) }
  }

  async function loadEditHistory(page = 1) {
    setEditHistoryLoading(true)
    try {
      const d = await api.history.restaurantEdits({ page, limit: 20 }, token)
      setEditHistory(d.data || [])
      setEditHistoryTotal(d.total || 0)
      setEditHistoryPage(page)
      setEditHistoryPages(d.totalPages || 1)
    } catch (err) { console.error(err) }
    finally { setEditHistoryLoading(false) }
  }

  async function loadLoginHistory(page = 1) {
    setLoginHistLoading(true)
    try {
      const d = await api.history.logins({ page, limit: 20 }, token)
      setLoginHistory(d.data || [])
      setLoginHistTotal(d.total || 0)
      setLoginHistPage(page)
      setLoginHistPages(d.totalPages || 1)
    } catch (err) { console.error(err) }
    finally { setLoginHistLoading(false) }
  }

  async function loadBanHistory() {
    setBanHistLoading(true)
    try { const d = await api.history.bans({ limit: 50 }, token); setBanHistory(d.data || []) }
    catch (err) { console.error(err) }
    finally { setBanHistLoading(false) }
  }

  async function loadRoleHistory() {
    setRoleHistLoading(true)
    try { const d = await api.history.roleChanges({ limit: 50 }, token); setRoleHistory(d.data || []) }
    catch (err) { console.error(err) }
    finally { setRoleHistLoading(false) }
  }

  async function loadAvailabilityHistory(page = 1) {
    setAvailHistLoading(true)
    try {
      const d = await api.history.availability({ page, limit: 20 }, token)
      setAvailHistory(d.data || [])
      setAvailHistTotal(d.total || 0)
      setAvailHistPage(page)
      setAvailHistPages(d.totalPages || 1)
    } catch (err) { console.error(err) }
    finally { setAvailHistLoading(false) }
  }

  async function loadUserActivity(uid, uName) {
    setActivityUserId(uid)
    setActivityUser(uName)
    setActivityData(null)
    setActivityLoading(true)
    try { const d = await api.admin.userActivity(uid, token); setActivityData(d) }
    catch (err) { console.error(err) }
    finally { setActivityLoading(false) }
  }

  async function loadStaffNotes(staffId) {
    try {
      const d = await api.staffExtended.getMemberNotes(staffId, token)
      setStaffNotesMap(prev => ({ ...prev, [staffId]: d.data || [] }))
    } catch (err) { console.error(err) }
  }

  async function addStaffNote(staffId) {
    const note = staffNoteInput[staffId]?.trim()
    if (!note) return
    try {
      await api.staffExtended.addMemberNote(staffId, { note }, token)
      setStaffNoteInput(prev => ({ ...prev, [staffId]: '' }))
      loadStaffNotes(staffId)
    } catch (err) { console.error(err) }
  }

  async function deleteStaffNote(noteId, staffId) {
    try {
      await api.staffExtended.deleteMemberNote(noteId, token)
      loadStaffNotes(staffId)
    } catch (err) { console.error(err) }
  }

  async function loadStaffWarnings(staffId) {
    try {
      const d = await api.staffExtended.getWarnings(staffId, token)
      setStaffWarnsMap(prev => ({ ...prev, [staffId]: d.data || [] }))
    } catch (err) { console.error(err) }
  }

  async function issueWarning(staffId) {
    const reason = staffWarnInput[staffId]?.trim()
    if (!reason) return
    setStaffWarnSaving(true)
    try {
      await api.staffExtended.issueWarning({ staff_id: staffId, reason }, token)
      setStaffWarnInput(prev => ({ ...prev, [staffId]: '' }))
      setStaffExtMsg(prev => ({ ...prev, [staffId]: '✓ Warning issued' }))
      setTimeout(() => setStaffExtMsg(prev => ({ ...prev, [staffId]: '' })), 3000)
      loadStaffWarnings(staffId)
    } catch (err) {
      setStaffExtMsg(prev => ({ ...prev, [staffId]: 'Error issuing warning' }))
    }
    finally { setStaffWarnSaving(false) }
  }

  async function executeBulkAction() {
    if (!bulkAction || selectedRests.size === 0) return
    const ids = [...selectedRests]
    setBulkLoading(true)
    try {
      await api.restaurants.bulk({ action: bulkAction, ids }, token)
      setBulkMsg(`✓ ${bulkAction} applied to ${ids.length} restaurant(s)`)
      setSelectedRests(new Set())
      setBulkAction('')
      loadRestaurants(restPage)
      setTimeout(() => setBulkMsg(''), 3000)
    } catch (err) {
      setBulkMsg('Error: ' + err.message)
    }
    finally { setBulkLoading(false) }
  }

  async function loadFaqs() {
    setFaqsLoading(true)
    try { const d = await api.faqs.admin({}, token); setFaqs(d.data || []) }
    catch (err) { console.error(err) }
    finally { setFaqsLoading(false) }
  }

  async function loadGallery(restId) {
    if (!restId) return
    setGalleryLoading(true)
    try { const d = await api.gallery.list(restId); setGalleryImages(d.data || []) }
    catch (err) { console.error(err) }
    finally { setGalleryLoading(false) }
  }

  async function loadTasks(page = 1, assigneeFilter = taskAssigneeFilter, silent = false) {
    if (!silent) setTasksLoading(true)
    try {
      const params = { page, limit: 20 }
      if (assigneeFilter) params.assigned_to = assigneeFilter
      const d = await api.staffExtended.getTasks(params, token)
      setTasks(d.data || [])
      setTasksTotal(d.total || 0)
      setTasksPage(page)
      setTasksTotalPgs(d.totalPages || 1)
    } catch (err) { console.error(err) }
    finally { if (!silent) setTasksLoading(false) }
  }

  async function loadAssignableStaff() {
    try {
      const [staffRes, adminRes] = await Promise.allSettled([
        api.admin.users({ limit: 200, role: 'staff' }, token),
        api.admin.users({ limit: 200, role: 'admin' }, token),
      ])
      const list = []
      if (staffRes.status === 'fulfilled') list.push(...(staffRes.value.data || []))
      if (adminRes.status === 'fulfilled') list.push(...(adminRes.value.data || []))
      setAssignableStaff(list)
    } catch (err) { console.error(err) }
  }

  async function loadAnnouncements() {
    setAnnouncementsLoading(true)
    try { const d = await api.announcements.all({}, token); setAnnouncements(d.data || []) }
    catch (err) { console.error(err) }
    finally { setAnnouncementsLoading(false) }
  }

  async function loadTickets(page = 1, status = ticketFilter, priority = ticketPriorityFilter, assignee = ticketAssigneeFilter) {
    setTicketsLoading(true)
    try {
      const params = { page, limit: 20 }
      if (status)   params.status = status
      if (priority) params.priority = priority
      if (assignee) params.assigned_to = assignee
      const d = await api.tickets.list(params, token)
      setTickets(d.data || [])
      setTicketsTotal(d.total || 0)
      setTicketsPage(page)
      setTicketsTotalPgs(d.totalPages || 1)
    } catch (err) { console.error(err) }
    finally { setTicketsLoading(false) }
  }

  async function loadPayments(page = 1) {
    setPaymentsLoading(true)
    try {
      const d = await api.payments.list({ page, limit: 20 }, token)
      setPayments(d.data || [])
      setPaymentsTotal(d.total || 0)
      setPaymentsPage(page)
      setPaymentsTotalPgs(d.totalPages || 1)
    } catch (err) { console.error(err) }
    finally { setPaymentsLoading(false) }
  }

  async function loadReports() {
    setReportsLoading(true)
    try {
      const data = isAdmin
        ? await api.reports.staffPerformance(token)
        : await api.reports.myPerformance(token)
      setReportsData({ type: isAdmin ? 'admin' : 'staff', ...data })
      if (isAdmin) loadReportsTasks()
    } catch (err) { console.error(err) }
    finally { setReportsLoading(false) }
  }

  async function loadReportsTasks() {
    setReportsTasksLoading(true)
    try {
      const d = await api.staffExtended.getTasks({ limit: 200 }, token)
      setReportsAllTasks(d.data || [])
    } catch (err) { console.error(err) }
    finally { setReportsTasksLoading(false) }
  }

  // ── Lazy tab navigation ─────────────────────────────────────────────────
  function navigate(key) {
    setTab(key)
    setSidebarOpen(false)
    if (tabsLoaded.has(key)) return

    setTabsLoaded(prev => new Set([...prev, key]))

    if ((key === 'Restaurants' || key === 'Boost') &&
        !tabsLoaded.has('Restaurants') && !tabsLoaded.has('Boost')) {
      loadRestaurants(1)
    } else if (key === 'Reviews')       { loadReviews(1) }
    else if (key === 'Users')           { loadUsers(1, '', true) }
    else if (key === 'History')         { loadAuditLogs(1); loadEditHistory(1); loadLoginHistory(1); loadBanHistory(); loadRoleHistory(); loadAvailabilityHistory() }
    else if (key === 'Requests')        { loadChangeRequests(1); if (isAdmin) loadAssignableStaff() }
    else if (key === 'Owners')          { loadOwners() }
    else if (key === 'Staff')           { loadStaff(1) }
    else if (key === 'Site Content')    { scLoad(scPage) }
    else if (key === 'Theme')           { loadTheme() }
    else if (key === 'Banners')         { loadBanners() }
    else if (key === 'Analytics')       { loadAnalytics() }
    else if (key === 'Approval')        { loadPendingApproval() }
    else if (key === 'FAQs')           { loadFaqs() }
    else if (key === 'Tasks')           { loadTasks(1); loadAssignableStaff() }
    else if (key === 'Announcements')   { loadAnnouncements() }
    else if (key === 'Tickets')         { loadTickets(1); if (isAdmin) loadAssignableStaff() }
    else if (key === 'Revenue')         { loadPayments(1) }
    else if (key === 'Reports')         { loadReports(); loadAssignableStaff() }
    else if (key === 'Gallery')         { /* user picks restaurant first */ }
    else if (key === 'Notifications')   { /* send panel, no load needed */ }
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleUpload(e) {
    e.preventDefault()
    if (!selectedRestaurant || !pdfFile) return
    setUploading(true); setUploadMsg('')
    try {
      const form = new FormData()
      form.append('menu', pdfFile)
      const result = await api.menus.upload(selectedRestaurant, form, token)
      setUploadMsg(`✓ Menu uploaded — version ${result.version}`)
      setPdfFile(null); setSelectedRestaurant('')
    } catch (err) { setUploadMsg(`Error: ${err.message}`) }
    finally { setUploading(false) }
  }

  async function deleteRestaurant(restaurantId, name) {
    if (!confirm(`Permanently hide "${name}"?\n\nThe restaurant will be removed from all public listings. You can show it again using the visibility toggle.`)) return
    try {
      await api.restaurants.delete(restaurantId, token)
      const targetPage = restaurants.length === 1 && restPage > 1 ? restPage - 1 : restPage
      await loadRestaurants(targetPage)
    } catch (err) { alert(`Failed: ${err.message}`) }
  }

  async function toggleVisibility(r) {
    if (r.is_active && !confirm(`Hide "${r.name}" from the public?\n\nVisitors won't see it in browse or search results. You can show it again any time.`)) return
    try {
      await api.restaurants.update(r.id, { is_active: !r.is_active }, token)
      setRestaurants(rs => rs.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x))
    } catch (err) { alert(`Failed: ${err.message}`) }
  }

  async function deleteReview(reviewId) {
    if (!confirm('Delete this review?')) return
    await api.admin.deleteReview(reviewId, token)
    const targetPage = reviews.length === 1 && revPage > 1 ? revPage - 1 : revPage
    await loadReviews(targetPage)
  }

  async function approveReview(reviewId, approve) {
    await api.admin.patchReview(reviewId, { is_approved: approve }, token)
    setReviews(r => r.map(rev => rev.id === reviewId ? { ...rev, is_approved: approve } : rev))
  }

  async function toggleBan(userId, isBanned) {
    if (!isBanned && !confirm('Ban this user?\n\nThey will be locked out of their account immediately.')) return
    await api.admin.patchUser(userId, { is_banned: !isBanned }, token)
    setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_banned: !isBanned } : usr))
    loadBanHistory()
  }

  async function changeUserRole(userId, newRole) {
    setUsersMsg('')
    try {
      await api.admin.patchUser(userId, { role: newRole }, token)
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, role: newRole } : usr))
      setUsersMsg(`✓ Role updated to "${newRole}"`)
      setTimeout(() => setUsersMsg(''), 3000)
      api.admin.userCounts(token).then(setUserRoleCounts).catch(() => {})
      loadRoleHistory()
    } catch (err) {
      setUsersMsg(`Error: ${err.message}`)
    }
  }

  function changeUsersRoleFilter(role) {
    setUsersRoleFilter(role)
    setUsersPage(1)
    loadUsers(1, role)
  }

  // ── Change Request handlers ──────────────────────────────────────────────

  async function expandChangeRequest(id) {
    if (crExpandedId === id) { setCrExpandedId(null); return }
    setCrExpandedId(id)
    setCrActionNote('')
    if (crExpandedData[id]) return
    try {
      const data = await api.admin.getChangeRequest(id, token)
      setCrExpandedData(m => ({ ...m, [id]: data }))
    } catch (err) { console.error(err) }
  }

  async function handleCrAction(requestId, status) {
    setCrActionLoading(true)
    try {
      await api.admin.patchChangeRequest(requestId, { status, admin_note: crActionNote }, token)
      setCrActionNote('')
      setCrExpandedId(null)
      setCrExpandedData(m => { const n = { ...m }; delete n[requestId]; return n })
      await loadChangeRequests(crPage, crStatusFilter)
      if (isAdmin && stats) {
        const updated = await api.admin.stats(token)
        setStats(updated)
      }
    } catch (err) { alert(`Error: ${err.message}`) }
    finally { setCrActionLoading(false) }
  }

  function changeCrFilter(status) {
    setCrStatusFilter(status)
    setCrPage(1)
    loadChangeRequests(1, status)
  }

  // ── Owner assignment handlers ────────────────────────────────────────────

  async function assignOwner(e) {
    e.preventDefault()
    if (!ownerForm.owner_id || !ownerForm.restaurant_id) return
    setOwnerSaving(true); setOwnerMsg('')
    try {
      await api.admin.assignOwner(ownerForm, token)
      setOwnerForm({ owner_id: '', restaurant_id: '' })
      setOwnerMsg('✓ Owner assigned')
      await loadOwners()
    } catch (err) { setOwnerMsg(`Error: ${err.message}`) }
    finally { setOwnerSaving(false) }
  }

  async function removeOwner(id) {
    if (!confirm('Remove this owner assignment?')) return
    try {
      await api.admin.removeOwner(id, token)
      setOwners(o => o.filter(a => a.id !== id))
    } catch (err) { alert(`Error: ${err.message}`) }
  }

  // ── Staff permission handlers ────────────────────────────────────────────

  async function expandStaff(staffId) {
    if (expandedStaffId === staffId) { setExpandedStaffId(null); return }
    setExpandedStaffId(staffId)
    if (!staffPermsMap[staffId]) {
      setStaffPermsLoading(true)
      try {
        const data = await api.admin.staffPermissions(staffId, token)
        const permMap = {}
        STAFF_SECTIONS.forEach(s => { permMap[s] = true })
        ;(data.data || []).forEach(p => { permMap[p.section] = p.can_access })
        setStaffPermsMap(m => ({ ...m, [staffId]: permMap }))
      } catch (err) { console.error(err) }
      finally { setStaffPermsLoading(false) }
    }
    if (!staffRestaurantsMap[staffId]) {
      setStaffRestaurantsLoading(true)
      try {
        const data = await api.admin.staffRestaurants(staffId, token)
        const ids = new Set((data.data || []).map(a => a.restaurant_id))
        setStaffRestaurantsMap(m => ({ ...m, [staffId]: ids }))
      } catch (err) { console.error(err) }
      finally { setStaffRestaurantsLoading(false) }
    }
    loadStaffNotes(staffId)
    loadStaffWarnings(staffId)
  }

  function toggleStaffPerm(staffId, section) {
    setStaffPermsMap(m => ({
      ...m,
      [staffId]: { ...m[staffId], [section]: !m[staffId][section] },
    }))
  }

  async function saveStaffPermissions(staffId) {
    setStaffPermsLoading(true); setStaffPermsMsg('')
    try {
      const perms = staffPermsMap[staffId] || {}
      const permissions = STAFF_SECTIONS.map(section => ({
        section,
        can_access: perms[section] !== false,
      }))
      await api.admin.updateStaffPermissions(staffId, permissions, token)
      setStaffPermsMsg('✓ Permissions saved')
      setTimeout(() => setStaffPermsMsg(''), 3000)
    } catch (err) { setStaffPermsMsg(`Error: ${err.message}`) }
    finally { setStaffPermsLoading(false) }
  }

  function toggleStaffRestaurant(staffId, restaurantId) {
    setStaffRestaurantsMap(m => {
      const current = new Set(m[staffId] || [])
      if (current.has(restaurantId)) current.delete(restaurantId)
      else current.add(restaurantId)
      return { ...m, [staffId]: current }
    })
  }

  async function saveStaffRestaurants(staffId) {
    setStaffRestaurantsLoading(true); setStaffRestaurantsMsg('')
    try {
      const ids = Array.from(staffRestaurantsMap[staffId] || [])
      await api.admin.updateStaffRestaurants(staffId, ids, token)
      setStaffRestaurantsMsg('✓ Assignments saved')
      setTimeout(() => setStaffRestaurantsMsg(''), 3000)
    } catch (err) { setStaffRestaurantsMsg(`Error: ${err.message}`) }
    finally { setStaffRestaurantsLoading(false) }
  }

  // ── Menu Items handlers ──────────────────────────────────────────────────

  async function loadMenuItems(restaurantId) {
    if (!restaurantId) return
    setMiLoading(true)
    try {
      const data = await api.menuItems.list(restaurantId)
      setMenuItems(data?.data || [])
    } catch { setMenuItems([]) }
    finally { setMiLoading(false) }
  }

  // Selecting a restaurant here also saves it in the URL, so refreshing
  // (or sharing the link) keeps the same restaurant selected instead of
  // resetting the dropdown back to empty.
  function selectMenuRestaurant(restaurantId) {
    setMiRestaurant(restaurantId)
    loadMenuItems(restaurantId)
    miReset()
    const params = new URLSearchParams(window.location.search)
    params.set('tab', 'Menu Items')
    if (restaurantId) params.set('restaurant', restaurantId)
    else params.delete('restaurant')
    router.replace(`/admin?${params.toString()}`)
  }

  function miStartEdit(item) {
    setMiEditId(item.id)
    setMiForm({
      name: item.name, description: item.description || '',
      price: item.price || '', category: item.category || '',
      discount_type: item.discount_type || '', discount_value: item.discount_value || '',
      photo: null,
      ingredients: item.ingredients || '',
      portions: Array.isArray(item.portions) ? item.portions.map(p => ({ size: p.size, price: String(p.price) })) : [],
      photo_url: item.photo_url || '',
    })
    document.getElementById('mi-item-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function miReset() {
    setMiEditId(null)
    setMiForm({ name: '', description: '', price: '', category: '', discount_type: '', discount_value: '', photo: null, photo_url: '', ingredients: '', portions: [] })
    setMiMsg('')
  }

  async function miSave(e) {
    e.preventDefault()
    if (!miRestaurant) return
    setMiSaving(true); setMiMsg('')
    try {
      const fd = new FormData()
      fd.append('name',           miForm.name)
      fd.append('description',    miForm.description)
      fd.append('price',          miForm.price)
      fd.append('category',       miForm.category)
      fd.append('discount_type',  miForm.discount_type)
      fd.append('discount_value', miForm.discount_value)
      fd.append('ingredients',    miForm.ingredients)
      fd.append('portions',       JSON.stringify(
        miForm.portions.filter(p => p.size.trim()).map(p => ({ size: p.size.trim(), price: Number(p.price) || 0 }))
      ))
      if (miForm.photo) fd.append('photo', miForm.photo)

      if (miEditId) {
        const updated = await api.menuItems.update(miEditId, fd, token)
        setMenuItems(items => items.map(i => i.id === miEditId ? updated : i))
        miReset(); setMiMsg('✓ Item updated')
      } else {
        const created = await api.menuItems.create(miRestaurant, fd, token)
        setMenuItems(items => [...items, created])
        miReset(); setMiMsg('✓ Item added')
      }
    } catch (err) { setMiMsg(`Error: ${err.message}`) }
    finally { setMiSaving(false) }
  }

  async function miDelete(id) {
    if (!confirm('Delete this menu item?')) return
    await api.menuItems.delete(id, token)
    setMenuItems(items => items.filter(i => i.id !== id))
  }

  async function miToggleAvailability(item) {
    const next = !(item.is_available ?? true)
    setMenuItems(items => items.map(i => i.id === item.id ? { ...i, is_available: next } : i))
    try {
      await api.menuItems.setAvailability(item.id, next, token)
    } catch (err) {
      setMenuItems(items => items.map(i => i.id === item.id ? { ...i, is_available: !next } : i))
      alert(err.message)
    }
  }

  // ── Theme handlers ───────────────────────────────────────────────────────

  async function loadTheme() {
    try {
      const data = await api.siteContent.get('settings')
      const key = data?.content?.theme || 'warm'
      setActiveTheme(key)
      setSavedThemeKey(key)
    } catch { setActiveTheme('warm'); setSavedThemeKey('warm') }
  }

  async function saveTheme() {
    setThemeSaving(true); setThemeMsg('')
    try {
      await api.siteContent.update('settings', { theme: activeTheme }, token)
      setSavedThemeKey(activeTheme)
      setThemeMsg('✓ Theme applied! Visitors will see it within 60 seconds.')
    } catch (err) { setThemeMsg(`Error: ${err.message}`) }
    finally { setThemeSaving(false) }
  }

  // ── Banner handlers ──────────────────────────────────────────────────────

  async function loadBanners() {
    setBannersLoading(true)
    try {
      const data = await adminListBanners()
      setBanners(data)
      setBannersTableMissing(false)
    } catch (err) {
      console.error(err)
      setBannersTableMissing(true)
    }
    finally { setBannersLoading(false) }
  }

  async function handleBannerSave(e) {
    e.preventDefault()
    if (!bannerForm.title.trim()) { setBannerMsg('Title is required'); return }
    setBannerSaving(true); setBannerMsg('')
    try {
      const payload = { ...bannerForm, sort_order: Number(bannerForm.sort_order) || 0 }
      if (bannerEditId) payload.id = bannerEditId
      await adminSaveBanner(payload)
      setBannerMsg('✓ Banner saved')
      setBannerEditId(null)
      setBannerForm(BANNER_EMPTY)
      await loadBanners()
    } catch (err) { setBannerMsg(`Error: ${err.message}`) }
    finally { setBannerSaving(false) }
  }

  async function handleBannerToggle(id, currentState) {
    try {
      await adminToggleBanner(id, !currentState)
      setBanners(bs => bs.map(b => b.id === id ? { ...b, is_active: !currentState } : b))
    } catch (err) { alert(err.message) }
  }

  async function handleBannerDelete(id) {
    if (!confirm('Delete this banner permanently?')) return
    try {
      await adminDeleteBanner(id)
      setBanners(bs => bs.filter(b => b.id !== id))
    } catch (err) { alert(err.message) }
  }

  function startEditBanner(banner) {
    setBannerEditId(banner.id)
    setBannerForm({
      title:      banner.title      || '',
      subtitle:   banner.subtitle   || '',
      image_url:  banner.image_url  || '',
      cta_text:   banner.cta_text   || '',
      cta_link:   banner.cta_link   || '',
      placement:  banner.placement  || 'home',
      sort_order: banner.sort_order ?? 0,
      is_active:  banner.is_active  ?? true,
    })
    setBannerMsg('')
  }

  function cancelBannerEdit() {
    setBannerEditId(null)
    setBannerForm(BANNER_EMPTY)
    setBannerMsg('')
  }

  // ── Site Content handlers ────────────────────────────────────────────────

  async function scLoad(page) {
    setScLoading(true); setScSectionMsg({})
    try {
      const data = await api.siteContent.get(page)
      const saved = data?.content || {}
      const savedKeys = new Set(Object.keys(saved).filter(k => saved[k] !== '' && saved[k] != null))
      const merged = { ...(SC_DEFAULTS[page] || {}), ...saved }
      setScSavedKeys(savedKeys)
      setScFields(merged)
      setScOriginalFields(merged)
    } catch {
      const defaults = SC_DEFAULTS[page] || {}
      setScSavedKeys(new Set())
      setScFields(defaults)
      setScOriginalFields(defaults)
    }
    finally { setScLoading(false) }
  }

  function scResetField(key) {
    setScFields(f => ({ ...f, [key]: '' }))
    setScSavedKeys(prev => { const next = new Set(prev); next.delete(key); return next })
  }

  async function scSaveSection(sectionName, fields) {
    if (!confirm(`Save the "${sectionName}" section?\n\nThese changes will go live on the ${scPage} page immediately.`)) return
    setScSavingSection(sectionName)
    setScSectionMsg(m => ({ ...m, [sectionName]: '' }))
    try {
      const sectionKeys = fields.map(f => f.key)
      const payload = { ...scOriginalFields }
      sectionKeys.forEach(k => { payload[k] = scFields[k] })
      await api.siteContent.update(scPage, payload, token)
      setScOriginalFields(prev => {
        const next = { ...prev }
        sectionKeys.forEach(k => { next[k] = scFields[k] })
        return next
      })
      setScSavedKeys(prev => {
        const next = new Set(prev)
        sectionKeys.forEach(k => {
          if (scFields[k] !== '' && scFields[k] != null) next.add(k)
          else next.delete(k)
        })
        return next
      })
      setScSectionMsg(m => ({ ...m, [sectionName]: '✓ Saved' }))
      setTimeout(() => setScSectionMsg(m => ({ ...m, [sectionName]: '' })), 3000)
    } catch (err) {
      setScSectionMsg(m => ({ ...m, [sectionName]: `Error: ${err.message}` }))
    }
    finally { setScSavingSection(null) }
  }

  function scCancelSection(fields) {
    setScFields(f => {
      const next = { ...f }
      fields.forEach(({ key }) => { next[key] = scOriginalFields[key] ?? '' })
      return next
    })
  }

  // ── Boost helpers ────────────────────────────────────────────────────────

  function isBoostActive(r) {
    return r.is_boosted && (!r.boost_expires_at || new Date(r.boost_expires_at) > new Date())
  }

  async function quickBoost(restaurantId, enabled, plan) {
    setBoostMsg('')
    try {
      const updated = await api.restaurants.boost(restaurantId, { enabled, plan }, token)
      setRestaurants(rs => rs.map(r => r.id === restaurantId ? { ...r, ...updated } : r))
      setRestaurantOptions(opts => opts.map(r => r.id === restaurantId ? { ...r, ...updated } : r))
      setBoostMsg(enabled ? '✓ Boost activated' : '✓ Boost removed')
      if (historyOpenId === restaurantId) {
        setBoostHistoryMap(m => ({ ...m, [restaurantId]: undefined }))
        loadBoostHistory(restaurantId)
      }
    } catch (err) { setBoostMsg(`Error: ${err.message}`) }
  }

  async function loadBoostHistory(restaurantId) {
    if (historyOpenId === restaurantId) { setHistoryOpenId(null); return }
    setHistoryOpenId(restaurantId)
    if (boostHistoryMap[restaurantId]) return
    setHistoryLoading(true)
    try {
      const result = await api.restaurants.boostHistory(restaurantId, token)
      setBoostHistoryMap(m => ({ ...m, [restaurantId]: result.data || [] }))
    } catch {
      setBoostHistoryMap(m => ({ ...m, [restaurantId]: [] }))
    } finally { setHistoryLoading(false) }
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const boostActiveCount  = restaurantOptions.filter(isBoostActive).length
  const boostExpiredCount = restaurantOptions.filter(r =>
    r.is_boosted && r.boost_expires_at && new Date(r.boost_expires_at) <= new Date()
  ).length

  const pendingRequestsCount = stats?.stats?.pendingRequests ?? 0

  // Build nav items based on role + permissions
  const navItems = isSuperuser
    ? ALL_NAV_ITEMS
    : isAdmin
      ? ALL_NAV_ITEMS.filter(item => {
          if (!myAdminPermissions) return true // still loading → show all
          return myAdminPermissions[item.key] !== false
        })
      : ALL_NAV_ITEMS.filter(item => {
          if (item.adminOnly) return false
          if (!myPermissions) return true // still loading → show all
          return myPermissions[item.key] !== false
        })

  const isWorkplace = isStaff && !isAdmin
  const dashboardTitle = isWorkplace ? 'My Workplace' : 'Admin Panel'

  // ── Early returns ────────────────────────────────────────────────────────

  if (authLoading || loading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  const currentNav = navItems.find(n => n.key === tab) || navItems[0]

  const inputCls = 'w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white'
  const gradientBtn = 'px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90'

  return (
    <>
      <Navbar />

      <div className="flex min-h-[calc(100vh-66px)]">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar */}
        <aside className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 flex flex-col bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out',
          // Fixed (not sticky) on desktop too — a sticky sidebar bound to
          // viewport height detaches and stops tracking once main content
          // scrolls taller than one screen. Fixed keeps it viewport-anchored
          // for the full page, matching main-content offset via lg:ml-64 below.
          'lg:fixed lg:top-[66px] lg:h-[calc(100vh-66px)] lg:translate-x-0 lg:z-10',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )} style={{ boxShadow: '4px 0 24px rgba(0,0,0,.06)' }}>

          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Shield size={17} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[13px] text-gray-900 leading-tight">{dashboardTitle}</p>
              <p className="text-[11px] text-gray-400 truncate">{profile?.name || user?.email}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3">
            {navItems.map(({ key, label, icon: Icon, group }, i) => {
              const active      = tab === key
              const hasBadge    = key === 'Requests' && pendingRequestsCount > 0
              const prevGroup   = i > 0 ? navItems[i - 1].group : null
              const showDivider = group !== prevGroup

              return (
                <div key={key}>
                  {showDivider && (
                    <p className={clsx(
                      'px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400',
                      i === 0 ? 'pt-1' : 'pt-5'
                    )}>
                      {group}
                    </p>
                  )}
                  <button
                    onClick={() => navigate(key)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 mb-0.5',
                      active
                        ? 'text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    )}
                    style={active ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {hasBadge && !active && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shrink-0">
                        {pendingRequestsCount}
                      </span>
                    )}
                    {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
                  </button>
                </div>
              )
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150"
            >
              <Home size={16} className="shrink-0" />
              Back to site
            </Link>
          </div>
        </aside>

        {/* ── Main content — lg:ml-64 reserves space for the now-fixed sidebar */}
        <div className="flex-1 min-w-0 flex flex-col lg:ml-64">

          {/* Mobile top bar */}
          <div
            className="lg:hidden sticky top-[66px] z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              {currentNav && <currentNav.icon size={15} className="text-[#FF2D55]" />}
              <span className="font-bold text-[14px] text-gray-900">{tab}</span>
            </div>
          </div>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-5xl w-full mx-auto">

            <div className="hidden lg:flex items-center gap-2 mb-7">
              {currentNav && <currentNav.icon size={18} className="text-[#FF2D55]" />}
              <h1 className="font-bold text-xl text-gray-900">{currentNav?.label || tab}</h1>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                OVERVIEW
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Overview' && (
              <div className="space-y-6 animate-fade-in">
                {isAdmin && stats ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Restaurants',      value: stats.stats?.restaurants,      icon: UtensilsCrossed },
                        { label: 'Reviews',          value: stats.stats?.reviews,          icon: MessageSquare   },
                        { label: 'Users',            value: stats.stats?.users,            icon: Users           },
                        { label: 'Menus',            value: stats.stats?.menus,            icon: Upload          },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="card p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon size={14} className="text-[#FF2D55]" />
                            <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide">{label}</p>
                          </div>
                          <p className="font-display text-3xl font-black text-[var(--c-text)]">{value ?? '—'}</p>
                        </div>
                      ))}
                    </div>

                    {pendingRequestsCount > 0 && (
                      <button
                        onClick={() => navigate('Requests')}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-left hover:bg-amber-100 transition-colors"
                      >
                        <AlertCircle size={18} className="text-amber-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-amber-800">
                            {pendingRequestsCount} pending change request{pendingRequestsCount > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-amber-600">Click to review and take action</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-amber-500" />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="card p-5">
                        <h3 className="font-semibold text-[var(--c-text)] mb-3">Recent reviews</h3>
                        {stats.recentReviews?.length ? stats.recentReviews.map(r => (
                          <div key={r.id} className="flex items-start gap-2 py-2 border-b border-[var(--c-border)] last:border-0 text-sm">
                            <span className="text-amber-500 font-bold shrink-0">{'★'.repeat(r.rating)}</span>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{r.restaurants?.name}</p>
                              <p className="text-[var(--c-muted)] truncate text-xs">{r.comment || '(no comment)'}</p>
                            </div>
                          </div>
                        )) : <p className="text-sm text-[var(--c-muted)]">No recent reviews</p>}
                      </div>

                      <div className="card p-5">
                        <h3 className="font-semibold text-[var(--c-text)] mb-3">Recent menu uploads</h3>
                        {stats.recentMenus?.length ? stats.recentMenus.map(m => (
                          <div key={m.id} className="flex items-center justify-between py-2 border-b border-[var(--c-border)] last:border-0 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.restaurants?.name}</p>
                              <p className="text-xs text-[var(--c-muted)]">v{m.version} · {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <Badge color="green">Live</Badge>
                          </div>
                        )) : <p className="text-sm text-[var(--c-muted)]">No uploads yet</p>}
                      </div>
                    </div>
                  </>
                ) : (
                  // Staff welcome overview
                  <div className="card p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <Shield size={26} className="text-amber-700" />
                    </div>
                    <h2 className="font-bold text-xl text-[var(--c-text)] mb-1">Welcome, {profile?.name}</h2>
                    <p className="text-[var(--c-muted)] text-sm">
                      You are logged in as <span className="font-semibold text-blue-600">Staff</span>.
                      Use the sidebar to access your permitted sections.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                RESTAURANTS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Restaurants' && (
              <div className="space-y-5 animate-fade-in">

                {/* Menu upload */}
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-[#FF2D55]" /> Upload / replace menu PDF
                  </h3>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Select restaurant</label>
                      <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} required className={inputCls}>
                        <option value="">— Choose restaurant —</option>
                        {restaurantOptions.map(r => <option key={r.id} value={r.id}>{r.name} — {r.town}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">PDF menu file</label>
                      <div className={clsx('border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer', pdfFile ? 'border-[#FF2D55]/40 bg-red-50/30' : 'border-[var(--c-border2)] hover:border-[#FF2D55]/30')}>
                        <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files[0])} className="hidden" id="pdf-upload" required />
                        <label htmlFor="pdf-upload" className="cursor-pointer">
                          {pdfFile ? (
                            <div>
                              <p className="font-semibold text-[#FF2D55]">{pdfFile.name}</p>
                              <p className="text-xs text-[#FF2D55]/70 mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <div>
                              <Upload size={24} className="mx-auto mb-2 text-[var(--c-dim)]" />
                              <p className="text-sm text-[var(--c-muted)]">Click to select PDF (max 20 MB)</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button type="submit" loading={uploading} disabled={!selectedRestaurant || !pdfFile}>
                        <Upload size={15} /> Upload menu
                      </Button>
                      {uploadMsg && <p className={clsx('text-sm font-medium', uploadMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>{uploadMsg}</p>}
                    </div>
                  </form>
                </div>

                {/* Restaurants list */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      All restaurants {restTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({restTotal})</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-dim)] pointer-events-none" />
                        <input
                          type="text"
                          value={restSearch}
                          onChange={e => handleRestSearchChange(e.target.value)}
                          placeholder="Search by name…"
                          className="pl-8 pr-3 py-1.5 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-surface)] outline-none focus:ring-2 focus:ring-[#FF2D55]/30 w-44 sm:w-56"
                        />
                      </div>
                      {isAdmin && (
                        <Link href="/admin/restaurants/new">
                          <Button size="sm" variant="secondary"><Plus size={14} /> Add new</Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Bulk action bar */}
                  {isAdmin && selectedRests.size > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                      <span className="text-xs font-semibold text-blue-700">{selectedRests.size} selected</span>
                      <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white outline-none">
                        <option value="">— Choose action —</option>
                        <option value="activate">Activate all</option>
                        <option value="deactivate">Deactivate all</option>
                        <option value="delete">Delete all</option>
                      </select>
                      <button onClick={executeBulkAction} disabled={!bulkAction || bulkLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {bulkLoading ? 'Working…' : 'Apply'}
                      </button>
                      <button onClick={() => setSelectedRests(new Set())} className="text-xs text-blue-500 hover:underline">Clear</button>
                      {bulkMsg && <p className={clsx('text-xs font-semibold ml-2', bulkMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>{bulkMsg}</p>}
                    </div>
                  )}

                  {restsLoading ? <TabSpinner /> : restaurants.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">
                      {restSearch ? `No restaurants match "${restSearch}".` : 'No restaurants yet.'}
                    </p>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {restaurants.map(r => (
                          <div key={r.id} className={clsx('flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors', !r.is_active && 'opacity-60 bg-gray-50/60')}>
                            {/* Bulk checkbox */}
                            {isAdmin && (
                              <input type="checkbox" checked={selectedRests.has(r.id)}
                                onChange={e => {
                                  setSelectedRests(prev => {
                                    const next = new Set(prev)
                                    e.target.checked ? next.add(r.id) : next.delete(r.id)
                                    return next
                                  })
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-[#FF2D55] shrink-0 cursor-pointer"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <p className="font-medium text-sm text-[var(--c-text)] truncate">{r.name}</p>
                                {!r.is_active && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500 shrink-0">
                                    <EyeOff size={8} /> Hidden
                                  </span>
                                )}
                                {r.is_active && isBoostActive(r) && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                                    <Zap size={8} className="fill-white" /> Boosted
                                  </span>
                                )}
                                {r.is_verified && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                                    <Check size={8} /> Verified
                                  </span>
                                )}
                                {r.is_featured && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">
                                    <Zap size={8} /> Featured
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--c-muted)]">
                                {r.town}, {r.district}
                                {r.updated_at && (
                                  <span className="ml-1.5 text-[var(--c-dim)]">
                                    · updated {new Date(r.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link href={`/admin/restaurants/${r.id}/edit`}>
                                <Button size="sm" variant="secondary" className="text-xs"><Pencil size={12} /> Edit</Button>
                              </Link>
                              {r.is_active && (
                                <Link href={buildVenueUrl(r)}>
                                  <Button size="sm" variant="ghost" className="text-xs">View</Button>
                                </Link>
                              )}
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={async () => { try { await api.restaurants.verify(r.id, { is_verified: !r.is_verified }, token); loadRestaurants(restPage) } catch(e){} }}
                                    title={r.is_verified ? 'Remove verified badge' : 'Mark as verified'}
                                    className={clsx('p-1.5 rounded-lg transition-colors text-xs', r.is_verified ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'hover:bg-blue-50 text-blue-300 hover:text-blue-600')}
                                  >
                                    <Check size={13}/>
                                  </button>
                                  <button
                                    onClick={async () => { try { await api.restaurants.feature(r.id, { is_featured: !r.is_featured }, token); loadRestaurants(restPage) } catch(e){} }}
                                    title={r.is_featured ? 'Remove featured' : 'Mark as featured'}
                                    className={clsx('p-1.5 rounded-lg transition-colors', r.is_featured ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'hover:bg-amber-50 text-amber-300 hover:text-amber-600')}
                                  >
                                    <Zap size={13}/>
                                  </button>
                                  <button
                                    onClick={() => toggleVisibility(r)}
                                    title={r.is_active ? 'Hide from public' : 'Show to public'}
                                    className={clsx('p-1.5 rounded-lg transition-colors', r.is_active ? 'hover:bg-amber-50 text-amber-400 hover:text-amber-600' : 'hover:bg-green-50 text-green-400 hover:text-green-600')}
                                  >
                                    {r.is_active ? <EyeOff size={14}/> : <Eye size={14}/>}
                                  </button>
                                  <button onClick={() => deleteRestaurant(r.id, r.name)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                    title="Delete">
                                    <Trash2 size={14}/>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination page={restPage} totalPages={restTotalPages} total={restTotal} onPageChange={loadRestaurants} loading={restsLoading} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                BOOST
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Boost' && (
              <div className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total restaurants', value: stats?.stats?.restaurants ?? restaurantOptions.length },
                    { label: 'Boosted (active)',   value: boostActiveCount },
                    { label: 'Expired boosts',     value: boostExpiredCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="card p-5">
                      <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide mb-1">{label}</p>
                      <p className="font-display text-3xl font-black text-[var(--c-text)]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="card p-5 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[var(--c-text)] shrink-0">Quick-boost plan:</p>
                  {[{ value: '30', label: '30 days' }, { value: '60', label: '60 days' }, { value: '90', label: '90 days' }].map(p => (
                    <button key={p.value} type="button" onClick={() => setBoostPlan(p.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${boostPlan === p.value ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-amber-400/40'}`}
                      style={boostPlan === p.value ? { background: 'linear-gradient(135deg,#F59E0B,#EF4444)' } : {}}>
                      {p.label}
                    </button>
                  ))}
                  {boostMsg && <p className={`text-sm font-semibold ml-auto ${boostMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{boostMsg}</p>}
                </div>

                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      Manage restaurant boosts {restTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({restTotal})</span>}
                    </h3>
                  </div>
                  {restsLoading ? <TabSpinner /> : restaurants.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">No restaurants found.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {restaurants.map(r => {
                          const active  = isBoostActive(r)
                          const expired = r.is_boosted && r.boost_expires_at && new Date(r.boost_expires_at) <= new Date()
                          return (
                            <Fragment key={r.id}>
                              <div className="flex items-center gap-4 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-medium text-sm text-[var(--c-text)] truncate">{r.name}</p>
                                    {active  && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}><Zap size={8} className="fill-white" /> Featured</span>}
                                    {expired && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400 shrink-0">Expired</span>}
                                  </div>
                                  <p className="text-xs text-[var(--c-muted)]">
                                    {r.town}, {r.district}
                                    {active && r.boost_expires_at && <> · expires {new Date(r.boost_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {active ? (
                                    <button onClick={() => quickBoost(r.id, false, boostPlan)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                                      <ZapOff size={12} /> Remove
                                    </button>
                                  ) : (
                                    <button onClick={() => quickBoost(r.id, true, boostPlan)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                                      <Zap size={12} className="fill-white" /> Boost {boostPlan}d
                                    </button>
                                  )}
                                  <button onClick={() => loadBoostHistory(r.id)} className={clsx('p-1.5 rounded-lg transition-colors', historyOpenId === r.id ? 'bg-amber-50 text-amber-600' : 'hover:bg-surface-secondary text-[var(--c-muted)]')} title="Boost history">
                                    <History size={13} />
                                  </button>
                                  <Link href={`/admin/restaurants/${r.id}/edit`}>
                                    <button className="p-1.5 rounded-lg hover:bg-surface-secondary text-[var(--c-muted)] transition-colors"><Pencil size={13} /></button>
                                  </Link>
                                </div>
                              </div>
                              {historyOpenId === r.id && (
                                <div className="mx-4 mb-3 rounded-xl border border-amber-100 bg-amber-50/50 overflow-hidden">
                                  <div className="px-4 py-2 border-b border-amber-100 flex items-center gap-2">
                                    <History size={12} className="text-amber-600" />
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Boost history — {r.name}</p>
                                  </div>
                                  {historyLoading ? (
                                    <div className="flex justify-center py-6"><Spinner size={20} /></div>
                                  ) : (boostHistoryMap[r.id] || []).length === 0 ? (
                                    <p className="text-xs text-[var(--c-muted)] text-center py-5">No boost history yet.</p>
                                  ) : (
                                    <div className="divide-y divide-amber-100">
                                      {(boostHistoryMap[r.id] || []).map(h => (
                                        <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            {h.action === 'enabled' ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}><Zap size={8} className="fill-white" /> Boosted</span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600"><ZapOff size={8} /> Removed</span>
                                            )}
                                            {h.plan && <span className="text-xs text-amber-700 font-medium">{h.plan} days</span>}
                                            {h.expires_at && h.action === 'enabled' && <span className="text-xs text-[var(--c-muted)]">→ {new Date(h.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                          </div>
                                          <span className="text-[11px] text-[var(--c-dim)] shrink-0">{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Fragment>
                          )
                        })}
                      </div>
                      <Pagination page={restPage} totalPages={restTotalPages} total={restTotal} onPageChange={loadRestaurants} loading={restsLoading} />
                    </>
                  )}
                </div>
                <p className="text-xs text-[var(--c-dim)] text-center">Collect payment from the restaurant owner first, then activate their boost here.</p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                REVIEWS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Reviews' && (
              <div className="card overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-[var(--c-border)]">
                  <h3 className="font-semibold text-[var(--c-text)]">
                    All reviews {revTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({revTotal})</span>}
                  </h3>
                </div>
                {revsLoading ? <TabSpinner /> : reviews.length === 0 ? (
                  <p className="text-sm text-[var(--c-muted)] text-center py-10">No reviews yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-[var(--c-border)]">
                      {reviews.map(r => (
                        <div key={r.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-amber-600">{'★'.repeat(r.rating)}</span>
                                <span className="text-xs text-[var(--c-muted)]">by {r.profiles?.name}</span>
                                <span className="text-xs text-[var(--c-muted)]">→ {r.restaurants?.name}</span>
                                {!r.is_approved && <Badge color="amber" className="text-[10px]">Pending</Badge>}
                              </div>
                              {r.comment && <p className="text-sm text-[var(--c-text)] truncate">{r.comment}</p>}
                              <p className="text-xs text-[var(--c-dim)] mt-0.5">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!r.is_approved ? (
                                <button onClick={() => approveReview(r.id, true)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Approve"><Check size={15} /></button>
                              ) : (
                                <button onClick={() => approveReview(r.id, false)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Unapprove"><X size={15} /></button>
                              )}
                              <button onClick={() => deleteReview(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><Trash2 size={15} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination page={revPage} totalPages={revTotalPages} total={revTotal} onPageChange={loadReviews} loading={revsLoading} />
                  </>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                CHANGE REQUESTS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Requests' && (
              <div className="space-y-4 animate-fade-in">

                {/* Status filter pills */}
                <div className="flex flex-wrap gap-2">
                  {['', 'pending', 'approved', 'rejected', 'paid', 'applied'].map(s => (
                    <button
                      key={s}
                      onClick={() => changeCrFilter(s)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize border',
                        crStatusFilter === s
                          ? 'text-white border-transparent'
                          : 'border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary',
                      )}
                      style={crStatusFilter === s ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
                    >
                      {s === '' ? 'All' : s}
                    </button>
                  ))}
                </div>

                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      Change requests {crTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({crTotal})</span>}
                    </h3>
                  </div>

                  {crLoading ? <TabSpinner /> : changeRequests.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-2">
                      <Inbox size={32} className="text-[var(--c-dim)]" />
                      <p className="text-sm text-[var(--c-muted)]">No change requests{crStatusFilter ? ` with status "${crStatusFilter}"` : ''}.</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {changeRequests.map(cr => (
                          <Fragment key={cr.id}>
                            <div
                              className="px-4 py-3 cursor-pointer hover:bg-surface-secondary transition-colors"
                              onClick={() => expandChangeRequest(cr.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <StatusBadge status={cr.status} />
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{cr.type?.replace(/_/g, ' ')}</span>
                                    <span className={clsx(
                                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                      cr.assignee?.name ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
                                    )}>
                                      {cr.assignee?.name ? `→ ${cr.assignee.name}` : 'Unassigned'}
                                    </span>
                                    {cr.payment_slip_path && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 inline-flex items-center gap-1">
                                        <Paperclip size={10} /> Slip
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-medium text-sm text-[var(--c-text)] mt-1">{cr.title}</p>
                                  <p className="text-xs text-[var(--c-muted)] mt-0.5">
                                    {cr.restaurants?.name}
                                    {cr.profiles?.name && <> · by {cr.profiles.name}</>}
                                    <span className="ml-1.5 text-[var(--c-dim)]">· {new Date(cr.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  </p>
                                </div>
                                <ChevronDown
                                  size={16}
                                  className={clsx('text-[var(--c-muted)] shrink-0 mt-1 transition-transform', crExpandedId === cr.id && 'rotate-180')}
                                />
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {crExpandedId === cr.id && (
                              <div className="mx-4 mb-3 rounded-xl border border-[var(--c-border)] bg-gray-50/60 p-4 space-y-3">

                                {/* Quick link to edit the restaurant */}
                                {cr.restaurants?.id && (
                                  <Link
                                    href={`/admin/restaurants/${cr.restaurants.id}/edit`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                                  >
                                    <ExternalLink size={12} />
                                    Edit {cr.restaurants.name}
                                  </Link>
                                )}

                                <div>
                                  <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide mb-1">Description</p>
                                  <p className="text-sm text-[var(--c-text)] whitespace-pre-wrap">{cr.description}</p>
                                </div>
                                {cr.admin_note && (
                                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                    <p className="text-xs font-semibold text-blue-700 mb-0.5">Admin note</p>
                                    <p className="text-sm text-blue-800">{cr.admin_note}</p>
                                  </div>
                                )}

                                {/* Payment slip — proof of payment uploaded by the owner */}
                                {['approved', 'paid', 'applied'].includes(cr.status) && (
                                  <div>
                                    <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide mb-1">Payment slip</p>
                                    {crExpandedData[cr.id]?.payment_slip_url ? (
                                      <a
                                        href={crExpandedData[cr.id].payment_slip_url}
                                        target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                                      >
                                        <FileText size={12} /> View payment slip
                                      </a>
                                    ) : (
                                      <p className="text-xs text-[var(--c-dim)]">Owner hasn&apos;t uploaded a payment slip yet.</p>
                                    )}
                                  </div>
                                )}

                                {/* Assign to staff (admin only) */}
                                {isAdmin && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Assign to staff</label>
                                    <select
                                      value={cr.assigned_to || ''}
                                      onChange={async e => {
                                        const assigned_to = e.target.value || null
                                        try {
                                          await api.admin.assignChangeRequest(cr.id, assigned_to, token)
                                          await loadChangeRequests(crPage, crStatusFilter)
                                        } catch (err) { alert(`Error: ${err.message}`) }
                                      }}
                                      className={inputCls}
                                    >
                                      <option value="">— Unassigned —</option>
                                      {assignableStaff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                    </select>
                                  </div>
                                )}

                                {/* Status history */}
                                {crExpandedData[cr.id]?.history?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide mb-2">Status history</p>
                                    <div className="space-y-1">
                                      {crExpandedData[cr.id].history.map(h => (
                                        <div key={h.id} className="flex items-center gap-2 text-xs">
                                          <StatusBadge status={h.to_status} />
                                          {h.note && <span className="text-[var(--c-muted)] truncate">{h.note}</span>}
                                          <span className="text-[var(--c-dim)] shrink-0 ml-auto">{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Action note */}
                                {cr.status !== 'applied' && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Note for owner (optional)</label>
                                    <textarea
                                      value={crActionNote}
                                      onChange={e => setCrActionNote(e.target.value)}
                                      placeholder="Explain what was done, what's needed, or why it was rejected…"
                                      rows={3}
                                      className={`${inputCls} resize-none`}
                                    />
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-2">
                                  {cr.status === 'pending' && (
                                    <>
                                      <button disabled={crActionLoading} onClick={() => handleCrAction(cr.id, 'approved')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                                        {crActionLoading ? 'Saving…' : '✓ Approve'}
                                      </button>
                                      <button disabled={crActionLoading} onClick={() => handleCrAction(cr.id, 'rejected')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50">
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {cr.status === 'approved' && (
                                    <button disabled={crActionLoading} onClick={() => handleCrAction(cr.id, 'paid')}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50">
                                      {crActionLoading ? 'Saving…' : 'Mark as Paid'}
                                    </button>
                                  )}
                                  {cr.status === 'paid' && (
                                    <button disabled={crActionLoading} onClick={() => handleCrAction(cr.id, 'applied')}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50">
                                      {crActionLoading ? 'Saving…' : 'Mark as Applied'}
                                    </button>
                                  )}
                                  {cr.status === 'rejected' && (
                                    <button disabled={crActionLoading} onClick={() => handleCrAction(cr.id, 'pending')}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary transition-colors disabled:opacity-50">
                                      Reopen
                                    </button>
                                  )}
                                  {cr.status === 'applied' && (
                                    <span className="text-xs text-green-700 font-semibold py-1.5">Changes have been applied</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Fragment>
                        ))}
                      </div>
                      <Pagination page={crPage} totalPages={crTotalPages} total={crTotal} onPageChange={p => loadChangeRequests(p, crStatusFilter)} loading={crLoading} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                USERS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Users' && (
              <div className="space-y-4 animate-fade-in">
                {/* Role filter pills + feedback */}
                <div className="flex flex-wrap items-center gap-2">
                  {usersMsg && (
                    <p className={clsx(
                      'w-full text-xs font-semibold',
                      usersMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'
                    )}>{usersMsg}</p>
                  )}
                  {[
                    { value: '',          label: 'All',       countKey: 'total'     },
                    { value: 'admin',     label: 'Admin',     countKey: 'admin'     },
                    { value: 'staff',     label: 'Staff',     countKey: 'staff'     },
                    { value: 'owner',     label: 'Owner',     countKey: 'owner'     },
                    { value: 'user',      label: 'User',      countKey: 'user'      },
                  ].map(r => {
                    const isActive = usersRoleFilter === r.value
                    const count    = userRoleCounts?.[r.countKey]
                    return (
                      <button
                        key={r.value}
                        onClick={() => changeUsersRoleFilter(r.value)}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                          isActive
                            ? 'text-white border-transparent'
                            : 'border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary',
                        )}
                        style={isActive ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
                      >
                        {r.label}
                        {count != null && (
                          <span className={clsx(
                            'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                            isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* User activity modal */}
                {activityUserId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setActivityUserId(null); setActivityData(null) }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-[var(--c-text)]">Activity — {activityUser}</h4>
                        <button onClick={() => { setActivityUserId(null); setActivityData(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                          <X size={16}/>
                        </button>
                      </div>
                      {activityLoading ? (
                        <div className="flex justify-center py-8"><Spinner size={24}/></div>
                      ) : !activityData ? (
                        <p className="text-sm text-[var(--c-muted)] text-center py-4">No data.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Reviews', value: activityData.reviewCount ?? 0 },
                              { label: 'Requests', value: activityData.requestCount ?? 0 },
                              { label: 'Logins', value: activityData.profile?.login_count ?? activityData.recentLogins?.length ?? 0 },
                            ].map(s => (
                              <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50">
                                <p className="text-xl font-bold text-[var(--c-text)]">{s.value}</p>
                                <p className="text-xs text-[var(--c-muted)]">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          {activityData.recentLogins?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[var(--c-muted)] mb-2 uppercase tracking-wide">Recent logins</p>
                              <div className="space-y-1">
                                {activityData.recentLogins.slice(0, 5).map((l, i) => (
                                  <p key={i} className="text-xs text-[var(--c-muted)]">
                                    {new Date(l.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    {l.ip_address && <span className="ml-2 text-[var(--c-dim)]">{l.ip_address}</span>}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      {usersRoleFilter ? `${usersRoleFilter.charAt(0).toUpperCase() + usersRoleFilter.slice(1)}s` : 'All users'}
                      {usersTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({usersTotal})</span>}
                    </h3>
                    <button
                      onClick={async () => {
                        try {
                          const d = await api.admin.exportUsers({ role: usersRoleFilter }, token)
                          const rows = [['Name','Email','Role','Banned','Joined'], ...(d.data||[]).map(u => [u.name||'',u.email||'',u.role,u.is_banned?'Yes':'No',u.created_at?.slice(0,10)||''])]
                          const csv = rows.map(r => r.join(',')).join('\n')
                          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='users.csv'; a.click()
                        } catch(e) { console.error(e) }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all"
                    >
                      Export CSV
                    </button>
                  </div>

                  {usrsLoading ? <TabSpinner /> : users.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">No users found.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {users.map(u => (
                          <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar name={u.name || 'User'} size={32} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--c-text)] truncate">{u.name || 'Unnamed'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <Badge color={ROLE_COLORS[u.role] || 'gray'} className="text-[10px]">{u.role}</Badge>
                                  {u.is_banned && <Badge color="red" className="text-[10px]">Banned</Badge>}
                                  {u.suspicious_flag && <Badge color="amber" className="text-[10px]">Flagged</Badge>}
                                  <span className="text-[10px] text-[var(--c-dim)]">
                                    joined {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => loadUserActivity(u.id, u.name || 'User')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all"
                                title="View activity"
                              >
                                Activity
                              </button>
                              {u.id !== user?.id && u.role !== 'superuser' && (
                                <>
                                  <select
                                    value={u.role}
                                    onChange={e => changeUserRole(u.id, e.target.value)}
                                    className="text-xs border border-[var(--c-border)] rounded-lg px-2 py-1.5 bg-white outline-none focus:border-[#FF2D55]/40"
                                  >
                                    {['user', 'owner', 'staff', 'admin'].map(r => (
                                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => toggleBan(u.id, u.is_banned)}
                                    className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', u.is_banned ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100')}
                                  >
                                    {u.is_banned ? 'Unban' : 'Ban'}
                                  </button>
                                  <button
                                    onClick={async () => { try { await api.admin.flagUser(u.id, { suspicious_flag: !u.suspicious_flag }, token); loadUsers(usersPage, usersRoleFilter) } catch(e){} }}
                                    title={u.suspicious_flag ? 'Remove flag' : 'Flag as suspicious'}
                                    className={clsx('p-1.5 rounded-lg transition-colors', u.suspicious_flag ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'hover:bg-amber-50 text-amber-300 hover:text-amber-600')}
                                  >
                                    <AlertCircle size={13}/>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination page={usersPage} totalPages={usersTotalPages} total={usersTotal} onPageChange={p => loadUsers(p, usersRoleFilter)} loading={usrsLoading} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                OWNERS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Owners' && (
              <div className="space-y-5 animate-fade-in">

                {/* Assign owner form */}
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2">
                    <Building2 size={17} className="text-[#FF2D55]" /> Assign restaurant owner
                  </h3>
                  <form onSubmit={assignOwner} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Select user</label>
                        <select
                          value={ownerForm.owner_id}
                          onChange={e => setOwnerForm({ owner_id: e.target.value, restaurant_id: '' })}
                          required className={inputCls}
                        >
                          <option value="">— Choose user —</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Select restaurant</label>
                        {(() => {
                          const linkedIds = new Set(
                            owners
                              .filter(a => a.profiles?.id === ownerForm.owner_id)
                              .map(a => a.restaurants?.id)
                              .filter(Boolean)
                          )
                          const available = restaurantOptions.filter(r => !linkedIds.has(r.id))
                          return (
                            <select value={ownerForm.restaurant_id} onChange={e => setOwnerForm(f => ({ ...f, restaurant_id: e.target.value }))} required className={inputCls}>
                              <option value="">— Choose restaurant —</option>
                              {available.map(r => <option key={r.id} value={r.id}>{r.name} — {r.town}</option>)}
                              {available.length === 0 && ownerForm.owner_id && (
                                <option disabled value="">All restaurants already assigned</option>
                              )}
                            </select>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={ownerSaving} className={gradientBtn} style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                        {ownerSaving ? 'Assigning…' : 'Assign owner'}
                      </button>
                      {ownerMsg && <p className={clsx('text-sm font-medium', ownerMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>{ownerMsg}</p>}
                    </div>
                    <p className="text-xs text-[var(--c-dim)]">
                      The selected user will automatically be promoted to the <strong>owner</strong> role if they are not already.
                    </p>
                  </form>
                </div>

                {/* Owner assignments list */}
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      Current assignments {owners.length > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({owners.length})</span>}
                    </h3>
                  </div>
                  {ownersLoading ? <TabSpinner /> : owners.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">No owner assignments yet.</p>
                  ) : (
                    <div className="divide-y divide-[var(--c-border)]">
                      {owners.map(a => (
                        <div key={a.id} className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-medium text-[var(--c-text)] truncate">{a.profiles?.name}</p>
                              <Badge color="purple" className="text-[10px]">owner</Badge>
                            </div>
                            <p className="text-xs text-[var(--c-muted)]">
                              {a.restaurants?.name} — {a.restaurants?.town}
                              <span className="ml-1.5 text-[var(--c-dim)]">
                                · assigned {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => removeOwner(a.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shrink-0"
                            title="Remove assignment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STAFF
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Staff' && (
              <div className="space-y-5 animate-fade-in">

                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-2 flex items-center gap-2">
                    <UserCheck size={17} className="text-[#FF2D55]" /> Staff members
                  </h3>
                  <p className="text-xs text-[var(--c-muted)] mb-0">
                    Promote any user to <strong>Staff</strong> via the Users tab, then configure their section permissions here.
                  </p>
                </div>

                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      All staff {staffTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({staffTotal})</span>}
                    </h3>
                  </div>

                  {staffLoading ? <TabSpinner /> : staffList.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-2">
                      <UserCheck size={32} className="text-[var(--c-dim)]" />
                      <p className="text-sm text-[var(--c-muted)]">No staff members yet.</p>
                      <p className="text-xs text-[var(--c-dim)]">Go to Users → change a user&apos;s role to Staff.</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {staffList.map(s => (
                          <Fragment key={s.id}>
                            <div
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-secondary transition-colors"
                              onClick={() => expandStaff(s.id)}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar name={s.name || 'Staff'} size={32} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--c-text)] truncate">{s.name || 'Unnamed'}</p>
                                  <p className="text-xs text-[var(--c-muted)]">
                                    joined {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {s.is_banned && <span className="ml-1.5 text-red-500 font-semibold">· Banned</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-[var(--c-muted)]">Permissions</span>
                                <ChevronDown
                                  size={15}
                                  className={clsx('text-[var(--c-muted)] transition-transform', expandedStaffId === s.id && 'rotate-180')}
                                />
                              </div>
                            </div>

                            {/* Permission matrix */}
                            {expandedStaffId === s.id && (
                              <div className="mx-4 mb-3 rounded-xl border border-[var(--c-border)] bg-gray-50/60 p-4">
                                <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide mb-3">
                                  Section access for {s.name}
                                </p>
                                {staffPermsLoading && !staffPermsMap[s.id] ? (
                                  <div className="flex justify-center py-4"><Spinner size={20} /></div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                    {STAFF_SECTIONS.map(section => {
                                      const perms = staffPermsMap[s.id] || {}
                                      const hasAccess = perms[section] !== false
                                      return (
                                        <label key={section} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-[var(--c-border)] cursor-pointer hover:border-[#FF2D55]/30 transition-colors">
                                          <span className="text-sm font-medium text-[var(--c-text)]">{section}</span>
                                          <button
                                            type="button"
                                            onClick={() => toggleStaffPerm(s.id, section)}
                                            className={clsx(
                                              'w-10 h-5 rounded-full transition-all relative shrink-0',
                                              hasAccess ? 'bg-green-500' : 'bg-gray-200'
                                            )}
                                          >
                                            <span className={clsx(
                                              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                                              hasAccess ? 'right-0.5' : 'left-0.5'
                                            )} />
                                          </button>
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => saveStaffPermissions(s.id)}
                                    disabled={staffPermsLoading}
                                    className={gradientBtn}
                                    style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                                  >
                                    {staffPermsLoading ? 'Saving…' : 'Save permissions'}
                                  </button>
                                  {staffPermsMsg && (
                                    <p className={clsx('text-sm font-medium', staffPermsMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>
                                      {staffPermsMsg}
                                    </p>
                                  )}
                                </div>

                                {/* Restaurant assignments */}
                                <div className="mt-4 pt-4 border-t border-[var(--c-border)]">
                                  <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide mb-1">
                                    Restaurant assignments for {s.name}
                                  </p>
                                  <p className="text-xs text-[var(--c-dim)] mb-3">
                                    Only assigned restaurants can be managed by this staff member (e.g. menu availability toggles).
                                  </p>
                                  {staffRestaurantsLoading && !staffRestaurantsMap[s.id] ? (
                                    <div className="flex justify-center py-4"><Spinner size={20} /></div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto pr-1">
                                      {restaurantOptions.map(r => {
                                        const assigned = staffRestaurantsMap[s.id]?.has(r.id)
                                        return (
                                          <label key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-[var(--c-border)] cursor-pointer hover:border-[#FF2D55]/30 transition-colors">
                                            <span className="text-sm font-medium text-[var(--c-text)] truncate">{r.name} — {r.town}</span>
                                            <button
                                              type="button"
                                              onClick={() => toggleStaffRestaurant(s.id, r.id)}
                                              className={clsx(
                                                'w-10 h-5 rounded-full transition-all relative shrink-0',
                                                assigned ? 'bg-green-500' : 'bg-gray-200'
                                              )}
                                            >
                                              <span className={clsx(
                                                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                                                assigned ? 'right-0.5' : 'left-0.5'
                                              )} />
                                            </button>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => saveStaffRestaurants(s.id)}
                                      disabled={staffRestaurantsLoading}
                                      className={gradientBtn}
                                      style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                                    >
                                      {staffRestaurantsLoading ? 'Saving…' : 'Save assignments'}
                                    </button>
                                    {staffRestaurantsMsg && (
                                      <p className={clsx('text-sm font-medium', staffRestaurantsMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>
                                        {staffRestaurantsMsg}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Staff Notes */}
                                <div className="mt-4 pt-4 border-t border-[var(--c-border)]">
                                  <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide mb-2">Internal Notes</p>
                                  <div className="space-y-2 mb-2">
                                    {(staffNotesMap[s.id] || []).length === 0
                                      ? <p className="text-xs text-[var(--c-dim)]">No notes yet.</p>
                                      : (staffNotesMap[s.id] || []).map(n => (
                                        <div key={n.id} className="flex items-start justify-between gap-2 bg-white border border-[var(--c-border)] rounded-lg px-3 py-2">
                                          <p className="text-xs text-[var(--c-text)] flex-1">{n.note}</p>
                                          <button onClick={() => deleteStaffNote(n.id, s.id)} className="text-red-400 hover:text-red-600 shrink-0"><X size={12}/></button>
                                        </div>
                                      ))
                                    }
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      value={staffNoteInput[s.id] || ''}
                                      onChange={e => setStaffNoteInput(prev => ({ ...prev, [s.id]: e.target.value }))}
                                      placeholder="Add a note…"
                                      className="flex-1 text-xs border border-[var(--c-border)] rounded-lg px-3 py-2 outline-none focus:border-[#FF2D55]/40"
                                    />
                                    <button onClick={() => addStaffNote(s.id)}
                                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 transition-colors">
                                      Add
                                    </button>
                                  </div>
                                </div>

                                {/* Staff Warnings */}
                                <div className="mt-4 pt-4 border-t border-[var(--c-border)]">
                                  <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide mb-2">Warnings</p>
                                  <div className="space-y-2 mb-2">
                                    {(staffWarnsMap[s.id] || []).length === 0
                                      ? <p className="text-xs text-[var(--c-dim)]">No warnings issued.</p>
                                      : (staffWarnsMap[s.id] || []).map(w => (
                                        <div key={w.id} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                          <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0"/>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-red-700">{w.reason}</p>
                                            <p className="text-[10px] text-red-400 mt-0.5">{new Date(w.created_at).toLocaleDateString('en-GB')}</p>
                                          </div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      value={staffWarnInput[s.id] || ''}
                                      onChange={e => setStaffWarnInput(prev => ({ ...prev, [s.id]: e.target.value }))}
                                      placeholder="Warning reason…"
                                      className="flex-1 text-xs border border-red-200 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                                    />
                                    <button onClick={() => issueWarning(s.id)} disabled={staffWarnSaving}
                                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                                      Issue
                                    </button>
                                  </div>
                                  {staffExtMsg[s.id] && (
                                    <p className={clsx('text-xs font-semibold mt-1', staffExtMsg[s.id].startsWith('✓') ? 'text-green-700' : 'text-red-600')}>{staffExtMsg[s.id]}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </Fragment>
                        ))}
                      </div>
                      <Pagination page={staffPage} totalPages={staffTotalPages} total={staffTotal} onPageChange={loadStaff} loading={staffLoading} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                MENU ITEMS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Menu Items' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-3 flex items-center gap-2">
                    <Tag size={17} /> Visual Menu Items
                  </h3>
                  <select
                    value={miRestaurant}
                    onChange={e => selectMenuRestaurant(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Select restaurant —</option>
                    {restaurantOptions.map(r => <option key={r.id} value={r.id}>{r.name} — {r.town}</option>)}
                  </select>
                </div>

                {miRestaurant && (
                  <>
                    <div id="mi-item-form" className="card p-5">
                      <h4 className="font-semibold text-[var(--c-text)] mb-4">{miEditId ? 'Edit item' : 'Add new item'}</h4>
                      <form onSubmit={miSave} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Item name *</label>
                            <input value={miForm.name} onChange={e => setMiForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Margherita Pizza" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">
                              Price (LKR){miForm.portions.length === 0 ? ' *' : ' (optional — portions set below)'}
                            </label>
                            <input type="number" step="0.01" value={miForm.price} onChange={e => setMiForm(f => ({ ...f, price: e.target.value }))} required={miForm.portions.length === 0} placeholder="950.00" className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Description</label>
                          <input value={miForm.description} onChange={e => setMiForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Ingredients (optional)</label>
                          <input value={miForm.ingredients} onChange={e => setMiForm(f => ({ ...f, ingredients: e.target.value }))} placeholder="e.g. Chicken, Onion, Garlic, Chili" className={inputCls} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-[var(--c-muted)]">Portion sizes (optional)</label>
                            <button type="button"
                              onClick={() => setMiForm(f => ({ ...f, portions: [...f.portions, { size: '', price: '' }] }))}
                              className="text-xs font-semibold text-[#FF2D55] hover:underline flex items-center gap-1">
                              <Plus size={12} /> Add portion
                            </button>
                          </div>
                          {miForm.portions.length > 0 && (
                            <div className="space-y-2">
                              {miForm.portions.map((p, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input
                                    value={p.size}
                                    onChange={e => setMiForm(f => { const pp = [...f.portions]; pp[i] = { ...pp[i], size: e.target.value }; return { ...f, portions: pp } })}
                                    placeholder="e.g. Half / Large"
                                    className="flex-[3] min-w-0 border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                                  />
                                  <input
                                    type="number"
                                    value={p.price}
                                    onChange={e => setMiForm(f => { const pp = [...f.portions]; pp[i] = { ...pp[i], price: e.target.value }; return { ...f, portions: pp } })}
                                    placeholder="Rs."
                                    className="w-24 shrink-0 border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                                  />
                                  <button type="button"
                                    onClick={() => setMiForm(f => ({ ...f, portions: f.portions.filter((_, j) => j !== i) }))}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Category</label>
                            <select value={miForm.category} onChange={e => setMiForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                              <option value="">— Select —</option>
                              {['Starters','Soups','Salads','Main Course','Rice & Noodles','Kottu','Roti & Hoppers','Grills & BBQ','Seafood','Vegetarian','Sandwiches & Burgers','Pizza & Pasta','Sides','Desserts','Beverages','Juices & Smoothies','Short Eats','Bakery & Pastries','Kids Menu','Specials'].map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Discount type</label>
                            <select value={miForm.discount_type} onChange={e => setMiForm(f => ({ ...f, discount_type: e.target.value }))} className={inputCls}>
                              <option value="">None</option>
                              <option value="percent">Percent (%)</option>
                              <option value="fixed">Fixed (LKR)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Discount value</label>
                            <input type="number" step="0.01" value={miForm.discount_value} onChange={e => setMiForm(f => ({ ...f, discount_value: e.target.value }))} placeholder="e.g. 20" disabled={!miForm.discount_type} className={`${inputCls} disabled:opacity-40`} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Photo (optional)</label>
                          <div className="flex items-center gap-3">
                            {(miPhotoPreview || miForm.photo_url) && (
                              <img
                                src={miPhotoPreview || miForm.photo_url}
                                alt="Preview"
                                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[var(--c-border)]"
                              />
                            )}
                            <input type="file" accept="image/*" onChange={e => setMiForm(f => ({ ...f, photo: e.target.files[0] || null }))} className="w-full text-sm text-[var(--c-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FF2D55]/10 file:text-[#FF2D55] hover:file:bg-[#FF2D55]/20" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <button type="submit" disabled={miSaving} className={gradientBtn} style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                            {miSaving ? 'Saving…' : miEditId ? 'Update item' : 'Add item'}
                          </button>
                          {miEditId && <button type="button" onClick={miReset} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary transition-all">Cancel</button>}
                          {miMsg && <p className={`text-sm font-medium ${miMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{miMsg}</p>}
                        </div>
                      </form>
                    </div>

                    <div className="card overflow-hidden">
                      <div className="p-4 border-b border-[var(--c-border)]">
                        <h4 className="font-semibold text-[var(--c-text)]">Items ({menuItems.length})</h4>
                      </div>
                      {miLoading ? <div className="flex justify-center py-12"><Spinner size={28} /></div>
                        : menuItems.length === 0 ? <p className="text-sm text-[var(--c-muted)] text-center py-8">No items yet</p>
                        : (
                          <div className="divide-y divide-[var(--c-border)]">
                            {menuItems.map(item => {
                              const isAvailable = item.is_available ?? true
                              return (
                              <div key={item.id} className={clsx('flex items-center gap-4 px-4 py-3', !isAvailable && 'opacity-60')}>
                                {item.photo_url ? (
                                  <img src={item.photo_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--c-border)]" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                    <Image size={20} className="text-[var(--c-dim)]" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-[var(--c-text)] truncate">
                                    {item.name}
                                    {!isAvailable && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Sold out</span>}
                                  </p>
                                  <p className="text-xs text-[var(--c-muted)]">
                                    {item.portions?.length > 0
                                      ? item.portions.map(p => `${p.size} Rs.${p.price}`).join(' / ')
                                      : item.price ? `Rs ${Number(item.price).toFixed(2)}` : 'No price'
                                    }
                                    {item.category ? ` · ${item.category}` : ''}
                                    {item.discount_type ? ` · ${item.discount_value}${item.discount_type === 'percent' ? '%' : ' LKR'} OFF` : ''}
                                    {item.ingredients ? ` · ${item.ingredients}` : ''}
                                  </p>
                                </div>
                                <label className="flex items-center gap-2 shrink-0 cursor-pointer" title="Available today">
                                  <span className="text-xs text-[var(--c-muted)] hidden sm:inline">Available</span>
                                  <button
                                    type="button"
                                    onClick={() => miToggleAvailability(item)}
                                    className={clsx(
                                      'w-10 h-5 rounded-full transition-all relative shrink-0',
                                      isAvailable ? 'bg-green-500' : 'bg-gray-200'
                                    )}
                                  >
                                    <span className={clsx(
                                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                                      isAvailable ? 'right-0.5' : 'left-0.5'
                                    )} />
                                  </button>
                                </label>
                                <div className="flex gap-1 shrink-0">
                                  <button onClick={() => miStartEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil size={14} /></button>
                                  <button onClick={() => miDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SITE CONTENT
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Site Content' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2">
                    <FileText size={17} /> Page Content Editor
                  </h3>
                  <div className="flex gap-2 mb-6">
                    {['home', 'about', 'contact'].map(p => (
                      <button key={p} onClick={() => { setScPage(p); scLoad(p) }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${scPage === p ? 'text-white shadow-sm' : 'text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary'}`}
                        style={scPage === p ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}>
                        {p}
                      </button>
                    ))}
                  </div>
                  {scLoading ? <div className="flex justify-center py-8"><Spinner size={24} /></div> : (
                    <div className="space-y-6">
                      {(SC_SCHEMAS[scPage] || []).map(({ section, fields }) => {
                        const isDirty = fields.some(({ key }) => scFields[key] !== scOriginalFields[key])
                        return (
                          <div key={section} className={`rounded-2xl p-4 transition-colors ${isDirty ? 'bg-amber-50/60 border border-amber-200' : 'bg-transparent'}`}>
                            <p className="text-[11px] font-black text-[#FF2D55] uppercase tracking-widest mb-3">{section}</p>
                            <div className="space-y-3 pl-3 border-l-2 border-[var(--c-border)]">
                              {fields.map(({ key, label, type }) => {
                                const isCustomized = scSavedKeys.has(key)
                                const placeholder  = SC_DEFAULTS[scPage]?.[key] || ''
                                return (
                                  <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-semibold text-[var(--c-muted)]">{label}</label>
                                      <div className="flex items-center gap-1.5">
                                        {isCustomized ? (
                                          <>
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                              Customized
                                            </span>
                                            <button type="button" onClick={() => scResetField(key)} className="text-[10px] text-[var(--c-dim)] hover:text-[#FF2D55] transition-colors font-semibold">
                                              Reset
                                            </button>
                                          </>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-[var(--c-dim)] border border-[var(--c-border)]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                                            Default
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {type === 'textarea' ? (
                                      <textarea rows={3} value={scFields[key] || ''} placeholder={placeholder} onChange={e => setScFields(f => ({ ...f, [key]: e.target.value }))} className={`${inputCls} resize-none ${isCustomized ? 'border-green-300 focus:border-green-400' : ''}`} />
                                    ) : (
                                      <input value={scFields[key] || ''} placeholder={placeholder} onChange={e => setScFields(f => ({ ...f, [key]: e.target.value }))} className={`${inputCls} ${isCustomized ? 'border-green-300 focus:border-green-400' : ''}`} />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            {isDirty && (
                              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-200">
                                <button
                                  type="button"
                                  onClick={() => scSaveSection(section, fields)}
                                  disabled={scSavingSection === section}
                                  className={`${gradientBtn} text-xs px-4 py-2`}
                                  style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                                >
                                  {scSavingSection === section ? 'Saving…' : `Save "${section}"`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => scCancelSection(fields)}
                                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--c-muted)] border border-[var(--c-border)] bg-white hover:bg-surface-secondary transition-all"
                                >
                                  Cancel
                                </button>
                                {scSectionMsg[section] && (
                                  <p className={`text-xs font-medium ${scSectionMsg[section].startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                                    {scSectionMsg[section]}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--c-dim)] text-center">Changes appear live on the website immediately after saving.</p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                THEME
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Theme' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">

                  {/* Card header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
                        <Palette size={17} /> Site Theme
                      </h3>
                      <p className="text-xs text-[var(--c-muted)] mt-1 max-w-sm">
                        Click a theme to live-preview it, then click “Apply to Site” to make it permanent for all visitors.
                      </p>
                    </div>
                    {savedThemeKey && savedThemeKey !== activeTheme && (
                      <button
                        onClick={() => {
                          const t = THEMES[savedThemeKey]
                          if (t) {
                            setActiveTheme(savedThemeKey)
                            setThemeMsg('')
                            const root = document.documentElement
                            Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v))
                            if (t.dark) root.classList.add('dark')
                            else root.classList.remove('dark')
                          }
                        }}
                        className="shrink-0 text-xs font-medium text-[var(--c-muted)] hover:text-[var(--c-brand)] px-3 py-1.5 rounded-lg border border-[var(--c-border)] hover:border-[var(--c-brand)] transition-all"
                      >
                        Revert
                      </button>
                    )}
                  </div>

                  {/* Light themes */}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-dim)] mb-3 flex items-center gap-1.5">
                    <Sun size={10} /> Light Themes
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {Object.entries(THEMES).filter(([, t]) => !t.dark).map(([key, theme]) => {
                      const v = theme.vars
                      const isActive = activeTheme === key
                      const isLive   = savedThemeKey === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setActiveTheme(key); setThemeMsg('')
                            const root = document.documentElement
                            Object.entries(v).forEach(([k, val]) => root.style.setProperty(k, val))
                            root.classList.remove('dark')
                          }}
                          className="relative rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none"
                          style={{
                            boxShadow: isActive
                              ? `0 0 0 2.5px ${v['--c-brand']}, 0 8px 28px ${v['--c-brand']}33`
                              : `0 0 0 1.5px ${v['--c-border']}`,
                          }}
                        >
                          {/* header */}
                          <div className="relative h-[46px] overflow-hidden flex flex-col justify-end"
                            style={{ background: `linear-gradient(135deg, ${v['--c-brand']} 0%, ${v['--c-brand-dk']} 100%)` }}>
                            <div className="absolute top-2 left-2.5 flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.5 }} />
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.35 }} />
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.25 }} />
                            </div>
                            <div className="px-2.5 pb-2 flex items-end gap-1.5">
                              <span className="w-8 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.6 }} />
                              <span className="w-5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.35 }} />
                            </div>
                          </div>
                          {/* body */}
                          <div className="px-2 py-2" style={{ background: v['--c-bg'] }}>
                            <div className="rounded-md p-1.5 mb-1.5" style={{ background: v['--c-surface'], border: `1px solid ${v['--c-border']}` }}>
                              <span className="block w-10 h-1.5 rounded-full mb-1" style={{ background: v['--c-brand'], opacity: 0.9 }} />
                              <span className="block w-full h-1 rounded-full mb-0.5" style={{ background: v['--c-text'], opacity: 0.12 }} />
                              <span className="block w-3/4 h-1 rounded-full" style={{ background: v['--c-text'], opacity: 0.08 }} />
                            </div>
                            <div className="flex gap-1">
                              <span className="flex-1 h-4 rounded-md" style={{ background: v['--c-surface2'], border: `1px solid ${v['--c-border']}` }} />
                              <span className="flex-1 h-4 rounded-md" style={{ background: v['--c-surface2'], border: `1px solid ${v['--c-border']}` }} />
                            </div>
                          </div>
                          {/* label */}
                          <div className="flex items-center justify-between px-2 pb-2" style={{ background: v['--c-bg'] }}>
                            <p className="text-[11px] font-bold truncate" style={{ color: v['--c-text'] }}>{theme.label}</p>
                            {isLive && !isActive && (
                              <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: v['--c-brand-lt'], color: v['--c-brand'] }}>live</span>
                            )}
                          </div>
                          {isActive && (
                            <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md"
                              style={{ background: v['--c-surface'] }}>
                              <Check size={11} style={{ color: v['--c-brand'] }} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Dark themes */}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-dim)] mb-3 flex items-center gap-1.5">
                    <Moon size={10} /> Dark Themes
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(THEMES).filter(([, t]) => t.dark).map(([key, theme]) => {
                      const v = theme.vars
                      const isActive = activeTheme === key
                      const isLive   = savedThemeKey === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setActiveTheme(key); setThemeMsg('')
                            const root = document.documentElement
                            Object.entries(v).forEach(([k, val]) => root.style.setProperty(k, val))
                            root.classList.add('dark')
                          }}
                          className="relative rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none"
                          style={{
                            boxShadow: isActive
                              ? `0 0 0 2.5px ${v['--c-brand']}, 0 8px 28px ${v['--c-brand']}33`
                              : `0 0 0 1.5px ${v['--c-border']}`,
                          }}
                        >
                          {/* header */}
                          <div className="relative h-[46px] overflow-hidden flex flex-col justify-end"
                            style={{ background: `linear-gradient(135deg, ${v['--c-brand']} 0%, ${v['--c-brand-dk']} 100%)` }}>
                            <div className="absolute top-2 left-2.5 flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.4 }} />
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.25 }} />
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.15 }} />
                            </div>
                            <div className="px-2.5 pb-2 flex items-end gap-1.5">
                              <span className="w-8 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.5 }} />
                              <span className="w-5 h-1.5 rounded-full" style={{ background: v['--c-surface'], opacity: 0.3 }} />
                            </div>
                          </div>
                          {/* body */}
                          <div className="px-2 py-2" style={{ background: v['--c-bg'] }}>
                            <div className="rounded-md p-1.5 mb-1.5" style={{ background: v['--c-surface'], border: `1px solid ${v['--c-border']}` }}>
                              <span className="block w-10 h-1.5 rounded-full mb-1" style={{ background: v['--c-brand'], opacity: 0.9 }} />
                              <span className="block w-full h-1 rounded-full mb-0.5" style={{ background: v['--c-text'], opacity: 0.15 }} />
                              <span className="block w-3/4 h-1 rounded-full" style={{ background: v['--c-text'], opacity: 0.1 }} />
                            </div>
                            <div className="flex gap-1">
                              <span className="flex-1 h-4 rounded-md" style={{ background: v['--c-surface2'], border: `1px solid ${v['--c-border']}` }} />
                              <span className="flex-1 h-4 rounded-md" style={{ background: v['--c-surface2'], border: `1px solid ${v['--c-border']}` }} />
                            </div>
                          </div>
                          {/* label */}
                          <div className="flex items-center justify-between px-2 pb-2" style={{ background: v['--c-bg'] }}>
                            <p className="text-[11px] font-bold truncate" style={{ color: v['--c-text'] }}>{theme.label}</p>
                            {isLive && !isActive
                              ? <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: v['--c-brand-lt'], color: v['--c-brand'] }}>live</span>
                              : <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#111', color: '#aaa' }}><Moon size={7} />dark</span>
                            }
                          </div>
                          {isActive && (
                            <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md"
                              style={{ background: v['--c-surface'] }}>
                              <Check size={11} style={{ color: v['--c-brand'] }} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-wrap items-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={saveTheme}
                      disabled={themeSaving}
                      className={gradientBtn}
                      style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                    >
                      {themeSaving ? 'Applying…' : 'Apply to Site'}
                    </button>
                    {activeTheme !== savedThemeKey && !themeSaving && (
                      <span className="text-xs text-[var(--c-muted)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Previewing — {THEMES[activeTheme]?.label}
                      </span>
                    )}
                    {themeMsg && (
                      <p className={`text-sm font-medium ${themeMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                        {themeMsg}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[var(--c-dim)] text-center">
                  Theme changes are visible to all visitors within 60 seconds of saving.
                </p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                BANNERS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Banners' && (
              <div className="space-y-5 animate-fade-in">

                {/* ── Create / Edit form ── */}
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2 mb-4">
                    <Megaphone size={16} className="text-[#FF2D55]" />
                    {bannerEditId ? 'Edit Banner' : 'New Banner'}
                  </h3>
                  <form onSubmit={handleBannerSave} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Title <span className="text-[#FF2D55]">*</span></label>
                        <input
                          className={inputCls}
                          placeholder="e.g. Grand Hotel — 20% off this weekend"
                          value={bannerForm.title}
                          onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Subtitle</label>
                        <input
                          className={inputCls}
                          placeholder="Supporting text (optional)"
                          value={bannerForm.subtitle}
                          onChange={e => setBannerForm(f => ({ ...f, subtitle: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Image URL</label>
                        <input
                          className={inputCls}
                          placeholder="https://… (optional)"
                          value={bannerForm.image_url}
                          onChange={e => setBannerForm(f => ({ ...f, image_url: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">CTA Button Text</label>
                        <input
                          className={inputCls}
                          placeholder="e.g. View Menu"
                          value={bannerForm.cta_text}
                          onChange={e => setBannerForm(f => ({ ...f, cta_text: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">CTA Link</label>
                        <input
                          className={inputCls}
                          placeholder="/restaurants/123 or https://…"
                          value={bannerForm.cta_link}
                          onChange={e => setBannerForm(f => ({ ...f, cta_link: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Placement</label>
                        <select
                          className={inputCls}
                          value={bannerForm.placement}
                          onChange={e => setBannerForm(f => ({ ...f, placement: e.target.value }))}
                        >
                          <option value="home">Home page only</option>
                          <option value="listing">Restaurant listing only</option>
                          <option value="all">All pages</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Sort Order</label>
                        <input
                          type="number"
                          className={inputCls}
                          placeholder="0 = first"
                          value={bannerForm.sort_order}
                          onChange={e => setBannerForm(f => ({ ...f, sort_order: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <button
                            type="button"
                            onClick={() => setBannerForm(f => ({ ...f, is_active: !f.is_active }))}
                            className="transition-colors"
                          >
                            {bannerForm.is_active
                              ? <ToggleRight size={28} className="text-[#FF2D55]" />
                              : <ToggleLeft  size={28} className="text-[var(--c-dim)]" />}
                          </button>
                          <span className="text-sm font-semibold text-[var(--c-text)]">
                            {bannerForm.is_active ? 'Active (visible)' : 'Inactive (hidden)'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {bannerMsg && (
                      <p className={`text-sm font-medium ${bannerMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                        {bannerMsg}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={bannerSaving}
                        className={`${gradientBtn} flex items-center gap-2`}
                        style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                      >
                        {bannerSaving ? <Spinner size={14} /> : <Check size={14} />}
                        {bannerEditId ? 'Save Changes' : 'Create Banner'}
                      </button>
                      {bannerEditId && (
                        <button
                          type="button"
                          onClick={cancelBannerEdit}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-[var(--c-surface2)] transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* ── Banner list ── */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
                      <Megaphone size={15} /> All Banners
                      {banners.length > 0 && (
                        <span className="text-xs font-normal text-[var(--c-muted)]">({banners.length})</span>
                      )}
                    </h3>
                    <button
                      onClick={loadBanners}
                      disabled={bannersLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-[var(--c-surface2)] transition-all disabled:opacity-50"
                    >
                      {bannersLoading ? 'Loading…' : 'Refresh'}
                    </button>
                  </div>

                  {bannersLoading ? (
                    <div className="flex justify-center py-12"><Spinner size={24} /></div>
                  ) : banners.length === 0 ? (
                    <div className="py-12 text-center">
                      <Megaphone size={28} className="mx-auto mb-3 text-[var(--c-dim)]" />
                      <p className="text-sm text-[var(--c-muted)]">No banners yet. Create your first one above.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--c-border)]">
                      {banners.map(b => (
                        <div key={b.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--c-surface2)] transition-colors">

                          {/* Thumbnail */}
                          {b.image_url ? (
                            <div className="shrink-0 w-12 h-10 rounded-lg overflow-hidden border border-[var(--c-border)]">
                              <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="shrink-0 w-12 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                              <Megaphone size={16} className="text-white" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--c-text)] truncate">{b.title}</p>
                            {b.subtitle && (
                              <p className="text-xs text-[var(--c-muted)] truncate">{b.subtitle}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-px rounded bg-[var(--c-surface2)] text-[var(--c-muted)]">
                                {b.placement}
                              </span>
                              {b.cta_link && (
                                <span className="text-[10px] text-[var(--c-dim)] truncate max-w-[140px]">
                                  → {b.cta_link}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Sort order */}
                          <span className="text-xs text-[var(--c-dim)] shrink-0 w-6 text-center">#{b.sort_order}</span>

                          {/* Active toggle */}
                          <button
                            onClick={() => handleBannerToggle(b.id, b.is_active)}
                            title={b.is_active ? 'Click to deactivate' : 'Click to activate'}
                            className="shrink-0 transition-colors"
                          >
                            {b.is_active
                              ? <ToggleRight size={26} className="text-[#FF2D55]" />
                              : <ToggleLeft  size={26} className="text-[var(--c-dim)]" />}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => startEditBanner(b)}
                            className="shrink-0 p-1.5 rounded-lg text-[var(--c-dim)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface2)] transition-colors"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleBannerDelete(b.id)}
                            className="shrink-0 p-1.5 rounded-lg text-[var(--c-dim)] hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── SQL setup notice — only shown when banners table is missing ── */}
                {bannersTableMissing && (
                  <div className="card p-4 border-amber-200 bg-amber-50">
                    <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                      <AlertCircle size={13} /> Supabase table required
                    </p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Run this SQL in your Supabase SQL Editor to enable banners:
                    </p>
                    <pre className="mt-2 text-[10px] text-amber-900 bg-amber-100 rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS banners (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  subtitle   text,
  image_url  text,
  cta_text   text DEFAULT 'Learn More',
  cta_link   text,
  placement  text DEFAULT 'home' CHECK (placement IN ('home','listing','all')),
  is_active  boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read"  ON banners FOR SELECT USING (is_active = true);
CREATE POLICY "admin_manage" ON banners FOR ALL   USING (auth.role() = 'authenticated');`}</pre>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                HISTORY
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'History' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><Clock size={17}/> Activity History</h3>

                {/* Sub-tab pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'audit',    label: 'Audit Log'        },
                    { key: 'edits',    label: 'Restaurant Edits' },
                    { key: 'logins',   label: 'Login History'    },
                    { key: 'bans',     label: 'Bans / Unbans'    },
                    { key: 'roles',    label: 'Role Changes'     },
                    { key: 'availability', label: 'Availability' },
                  ].map(st => (
                    <button key={st.key} onClick={() => setHistorySubTab(st.key)}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-xs font-semibold border transition-all',
                        historySubTab === st.key
                          ? 'text-white border-transparent'
                          : 'border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary'
                      )}
                      style={historySubTab === st.key ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
                    >{st.label}</button>
                  ))}
                </div>

                {/* ── Audit Log sub-tab */}
                {historySubTab === 'audit' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => loadAuditLogs(logsPage)} disabled={auditLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                        {auditLoading ? 'Loading…' : 'Refresh'}
                      </button>
                    </div>
                    {auditLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                    : auditLogs.length === 0 ? (
                      <div className="card p-12 text-center"><Clock size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No audit logs yet.</p></div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-[var(--c-border)]">
                          {auditLogs.map(log => {
                            const actionColors = {
                              'menu_item.create': 'bg-green-50 text-green-700', 'menu_item.update': 'bg-blue-50 text-blue-700',
                              'menu_item.delete': 'bg-red-50 text-red-600', 'menu.upload': 'bg-purple-50 text-purple-700',
                              'review.delete': 'bg-red-50 text-red-600', 'review.approve': 'bg-green-50 text-green-700',
                              'review.unapprove': 'bg-amber-50 text-amber-700', 'user.ban': 'bg-red-50 text-red-600',
                              'user.unban': 'bg-green-50 text-green-700', 'user.role_change': 'bg-blue-50 text-blue-700',
                              'site_content.update': 'bg-purple-50 text-purple-700', 'restaurant.boost.enable': 'bg-amber-50 text-amber-700',
                              'restaurant.boost.remove': 'bg-gray-50 text-gray-600', 'restaurant.create': 'bg-green-50 text-green-700',
                              'owner.assign': 'bg-purple-50 text-purple-700', 'change_request.approved': 'bg-blue-50 text-blue-700',
                              'change_request.rejected': 'bg-red-50 text-red-600', 'staff.permissions_update': 'bg-blue-50 text-blue-700',
                              'menu_item.availability': 'bg-amber-50 text-amber-700', 'staff.restaurants_update': 'bg-blue-50 text-blue-700',
                            }
                            const color = actionColors[log.action] || 'bg-gray-50 text-gray-600'
                            return (
                              <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-secondary transition-colors">
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${color}`}>{log.action}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-[var(--c-text)] truncate font-medium">{log.target}</p>
                                  <p className="text-xs text-[var(--c-muted)]">by {log.profiles?.name || 'Admin'}</p>
                                </div>
                                <p className="text-xs text-[var(--c-dim)] shrink-0">
                                  {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                        <Pagination page={logsPage} totalPages={logsTotalPages} total={logsTotal} onPageChange={loadAuditLogs} loading={auditLoading}/>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Restaurant Edits sub-tab */}
                {historySubTab === 'edits' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => loadEditHistory(1)} disabled={editHistoryLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                        {editHistoryLoading ? 'Loading…' : 'Refresh'}
                      </button>
                    </div>
                    {editHistoryLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                    : editHistory.length === 0 ? (
                      <div className="card p-12 text-center"><History size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No restaurant edits recorded yet.</p></div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-[var(--c-border)]">
                          {editHistory.map(e => (
                            <div key={e.id} className="px-4 py-3 hover:bg-surface-secondary transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[var(--c-text)] truncate">{e.restaurants?.name || 'Unknown restaurant'}</p>
                                  <p className="text-xs text-[var(--c-muted)] mt-0.5">
                                    Field: <span className="font-semibold text-[var(--c-text)]">{e.field_name}</span>
                                  </p>
                                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded line-through max-w-[180px] truncate">{e.old_value || '—'}</span>
                                    <span className="text-[var(--c-dim)]">→</span>
                                    <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded max-w-[180px] truncate">{e.new_value || '—'}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-[var(--c-dim)]">{new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                  <p className="text-xs text-[var(--c-muted)] mt-0.5">by {e.profiles?.name || 'Admin'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Pagination page={editHistoryPage} totalPages={editHistoryPages} total={editHistoryTotal} onPageChange={loadEditHistory} loading={editHistoryLoading}/>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Login History sub-tab */}
                {historySubTab === 'logins' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => loadLoginHistory(1)} disabled={loginHistLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                        {loginHistLoading ? 'Loading…' : 'Refresh'}
                      </button>
                    </div>
                    {loginHistLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                    : loginHistory.length === 0 ? (
                      <div className="card p-12 text-center"><Users size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No login events recorded.</p></div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-[var(--c-border)]">
                          {loginHistory.map(l => (
                            <div key={l.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-secondary transition-colors">
                              <Avatar name={l.profiles?.name || '?'} size={32}/>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--c-text)] truncate">{l.profiles?.name || 'Unknown'}</p>
                                <p className="text-xs text-[var(--c-muted)]">{l.ip_address || 'IP unknown'} · {l.user_agent?.split(' ')[0] || ''}</p>
                              </div>
                              <p className="text-xs text-[var(--c-dim)] shrink-0">
                                {new Date(l.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                        <Pagination page={loginHistPage} totalPages={loginHistPages} total={loginHistTotal} onPageChange={loadLoginHistory} loading={loginHistLoading}/>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Ban History sub-tab */}
                {historySubTab === 'bans' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={loadBanHistory} disabled={banHistLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                        {banHistLoading ? 'Loading…' : 'Refresh'}
                      </button>
                    </div>
                    {banHistLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                    : banHistory.length === 0 ? (
                      <div className="card p-12 text-center"><Shield size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No ban/unban events recorded.</p></div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-[var(--c-border)]">
                          {banHistory.map(b => (
                            <div key={b.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-secondary transition-colors">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${b.action === 'user.ban' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                {b.action === 'user.ban' ? 'BAN' : 'UNBAN'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--c-text)] truncate">{b.target}</p>
                                <p className="text-xs text-[var(--c-muted)]">by {b.profiles?.name || 'Admin'}</p>
                              </div>
                              <p className="text-xs text-[var(--c-dim)] shrink-0">
                                {new Date(b.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Role Changes sub-tab */}
                {historySubTab === 'roles' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={loadRoleHistory} disabled={roleHistLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                        {roleHistLoading ? 'Loading…' : 'Refresh'}
                      </button>
                    </div>
                    {roleHistLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                    : roleHistory.length === 0 ? (
                      <div className="card p-12 text-center"><UserCheck size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No role changes recorded.</p></div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-[var(--c-border)]">
                          {roleHistory.map(r => (
                            <div key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-secondary transition-colors">
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 bg-blue-50 text-blue-700">ROLE</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--c-text)] truncate">{r.target}</p>
                                <p className="text-xs text-[var(--c-muted)]">by {r.profiles?.name || 'Admin'} · {r.meta ? JSON.stringify(r.meta) : ''}</p>
                              </div>
                              <p className="text-xs text-[var(--c-dim)] shrink-0">
                                {new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Availability sub-tab */}
                {historySubTab === 'availability' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => loadAvailabilityHistory(availHistPage)} disabled={availHistLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                        {availHistLoading ? 'Loading…' : 'Refresh'}
                      </button>
                    </div>
                    {availHistLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                    : availHistory.length === 0 ? (
                      <div className="card p-12 text-center"><Tag size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No availability changes recorded.</p></div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-[var(--c-border)]">
                          {availHistory.map(a => {
                            const madeAvailable = a.meta?.is_available !== false
                            return (
                              <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-secondary transition-colors">
                                <span className={clsx(
                                  'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0',
                                  madeAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                )}>
                                  {madeAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--c-text)] truncate">
                                    {a.target}{a.restaurant?.name ? ` · ${a.restaurant.name}` : ''}
                                  </p>
                                  <p className="text-xs text-[var(--c-muted)]">by {a.profiles?.name || 'Unknown'}</p>
                                </div>
                                <p className="text-xs text-[var(--c-dim)] shrink-0">
                                  {new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                        <Pagination page={availHistPage} totalPages={availHistPages} total={availHistTotal} onPageChange={loadAvailabilityHistory} loading={availHistLoading}/>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ANALYTICS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Analytics' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><BarChart2 size={17}/> Analytics Dashboard</h3>
                  <button onClick={loadAnalytics} disabled={analyticsLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                    {analyticsLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
                {analyticsLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div> : !analyticsData ? (
                  <div className="card p-12 text-center"><BarChart2 size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">Click Refresh to load analytics.</p></div>
                ) : (
                  <div className="space-y-6">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Restaurants', value: analyticsData.restaurants?.total, sub: `${analyticsData.restaurants?.active} active`, color: 'text-blue-600' },
                        { label: 'Total Users', value: analyticsData.users?.total, sub: `${analyticsData.users?.new30d} new this month`, color: 'text-green-600' },
                        { label: 'Total Reviews', value: analyticsData.reviews?.total, sub: `Avg rating ${analyticsData.reviews?.avgRating}★`, color: 'text-amber-600' },
                        { label: 'Boosted', value: analyticsData.restaurants?.boosted, sub: `${analyticsData.tickets?.open} open tickets`, color: 'text-purple-600' },
                      ].map(c => (
                        <div key={c.label} className="card p-5">
                          <p className="text-xs text-[var(--c-muted)] mb-1">{c.label}</p>
                          <p className={`text-3xl font-bold ${c.color}`}>{c.value ?? 0}</p>
                          <p className="text-xs text-[var(--c-dim)] mt-1">{c.sub}</p>
                        </div>
                      ))}
                    </div>
                    {/* User roles */}
                    <div className="card p-5">
                      <h4 className="font-semibold text-sm mb-4 text-[var(--c-text)]">User Role Distribution</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {Object.entries(analyticsData.users?.roles || {}).map(([role, count]) => (
                          <div key={role} className="text-center p-3 rounded-xl bg-surface-secondary">
                            <p className="text-xl font-bold text-[var(--c-text)]">{count}</p>
                            <p className="text-xs text-[var(--c-muted)] capitalize">{role}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Top rated */}
                    {analyticsData.topRated?.length > 0 && (
                      <div className="card overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--c-border)]">
                          <h4 className="font-semibold text-sm text-[var(--c-text)]">Top Rated Restaurants</h4>
                        </div>
                        <div className="divide-y divide-[var(--c-border)]">
                          {analyticsData.topRated.map((r, i) => (
                            <div key={r.restaurant_id} className="flex items-center gap-4 px-4 py-3">
                              <span className="text-lg font-bold text-[var(--c-dim)] w-6">#{i+1}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[var(--c-text)]">{r.restaurants?.name}</p>
                                <p className="text-xs text-[var(--c-muted)]">{r.restaurants?.town}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-amber-500">{Number(r.avg_rating).toFixed(1)}★</p>
                                <p className="text-xs text-[var(--c-muted)]">{r.review_count} reviews</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Monthly charts (text-based) */}
                    {analyticsData.charts?.monthlyRestaurants?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="font-semibold text-sm mb-4 text-[var(--c-text)]">New Restaurants (Last 6 Months)</h4>
                        <div className="flex items-end gap-2 h-24">
                          {analyticsData.charts.monthlyRestaurants.map(m => {
                            const max = Math.max(...analyticsData.charts.monthlyRestaurants.map(x => x.count))
                            const pct = max > 0 ? (m.count / max) * 100 : 0
                            return (
                              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-[var(--c-muted)]">{m.count}</span>
                                <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: `${Math.max(pct, 4)}%` }}/>
                                <span className="text-[9px] text-[var(--c-dim)]">{m.month.slice(5)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                APPROVAL QUEUE
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Approval' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><ClipboardCheck size={17}/> Approval Queue</h3>
                  <button onClick={loadPendingApproval} disabled={pendingRestsLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">Refresh</button>
                </div>
                {approvalMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{approvalMsg}</p>}
                {pendingRestsLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                : pendingRests.length === 0 ? (
                  <div className="card p-12 text-center"><ClipboardCheck size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No restaurants pending approval.</p></div>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-[var(--c-border)]">
                      {pendingRests.map(r => (
                        <div key={r.id} className="flex items-center gap-4 px-4 py-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[var(--c-text)]">{r.name}</p>
                            <p className="text-xs text-[var(--c-muted)]">{r.town}, {r.district} · {r.category}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              try {
                                await api.restaurants.approve(r.id, { approved: true }, token)
                                setApprovalMsg(`✓ ${r.name} approved`)
                                setPendingRests(prev => prev.filter(x => x.id !== r.id))
                              } catch (err) { setApprovalMsg(`Error: ${err.message}`) }
                            }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-all">Approve</button>
                            <button onClick={async () => {
                              try {
                                await api.restaurants.approve(r.id, { approved: false }, token)
                                setApprovalMsg(`✗ ${r.name} rejected`)
                                setPendingRests(prev => prev.filter(x => x.id !== r.id))
                              } catch (err) { setApprovalMsg(`Error: ${err.message}`) }
                            }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                GALLERY
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Gallery' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><Image size={17}/> Gallery Management</h3>
                <div className="card p-4 space-y-3">
                  <label className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide">Select Restaurant</label>
                  <select value={galleryRestId} onChange={e => { setGalleryRestId(e.target.value); loadGallery(e.target.value) }}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                    <option value="">— choose restaurant —</option>
                    {restaurantOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {galleryMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{galleryMsg}</p>}
                {galleryRestId && (
                  <div className="card p-4 space-y-3">
                    <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide">Upload Image</p>
                    <div className="flex gap-3 flex-wrap">
                      <input type="file" accept="image/*" onChange={e => setGalleryFile(e.target.files[0])} className="text-sm text-[var(--c-muted)]"/>
                      <input value={galleryCaption} onChange={e => setGalleryCaption(e.target.value)} placeholder="Caption (optional)"
                        className="flex-1 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                      <Button size="sm" loading={galleryUploading} onClick={async () => {
                        if (!galleryFile) return
                        setGalleryUploading(true); setGalleryMsg('')
                        try {
                          const form = new FormData()
                          form.append('image', galleryFile)
                          if (galleryCaption) form.append('caption', galleryCaption)
                          await api.gallery.upload(galleryRestId, form, token)
                          setGalleryMsg('✓ Image uploaded')
                          setGalleryFile(null); setGalleryCaption('')
                          loadGallery(galleryRestId)
                        } catch (err) { setGalleryMsg(`Error: ${err.message}`) }
                        finally { setGalleryUploading(false) }
                      }}>Upload</Button>
                    </div>
                  </div>
                )}
                {galleryLoading ? <div className="flex justify-center py-8"><Spinner size={24}/></div>
                : galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {galleryImages.map(img => (
                      <div key={img.id} className="card overflow-hidden group relative">
                        <img src={img.image_url} alt={img.caption || ''} className="w-full h-32 object-cover"/>
                        {img.caption && <p className="text-xs text-[var(--c-muted)] px-2 py-1">{img.caption}</p>}
                        <button onClick={async () => {
                          if (!confirm('Delete this image?')) return
                          try { await api.gallery.delete(img.id, token); setGalleryMsg('Deleted'); loadGallery(galleryRestId) }
                          catch (err) { setGalleryMsg(`Error: ${err.message}`) }
                        }} className="absolute top-2 right-2 p-1 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                FAQs
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'FAQs' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><HelpCircle size={17}/> FAQ Management</h3>
                  <button onClick={loadFaqs} disabled={faqsLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">Refresh</button>
                </div>
                {faqMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{faqMsg}</p>}
                {/* FAQ Form */}
                <div className="card p-5 space-y-3">
                  <h4 className="font-semibold text-sm text-[var(--c-text)]">{faqEditId ? 'Edit FAQ' : 'Add New FAQ'}</h4>
                  <input value={faqForm.question} onChange={e => setFaqForm(p => ({...p, question: e.target.value}))} placeholder="Question"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                  <textarea value={faqForm.answer} onChange={e => setFaqForm(p => ({...p, answer: e.target.value}))} placeholder="Answer" rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] resize-none"/>
                  <div className="flex gap-3">
                    <input value={faqForm.category} onChange={e => setFaqForm(p => ({...p, category: e.target.value}))} placeholder="Category"
                      className="flex-1 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    <input type="number" value={faqForm.sort_order} onChange={e => setFaqForm(p => ({...p, sort_order: +e.target.value}))} placeholder="Order"
                      className="w-24 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    <Button size="sm" loading={faqSaving} onClick={async () => {
                      setFaqSaving(true); setFaqMsg('')
                      try {
                        if (faqEditId) await api.faqs.update(faqEditId, faqForm, token)
                        else await api.faqs.create(faqForm, token)
                        setFaqMsg(faqEditId ? '✓ FAQ updated' : '✓ FAQ created')
                        setFaqForm({ question: '', answer: '', category: 'general', sort_order: 0 })
                        setFaqEditId(null)
                        loadFaqs()
                      } catch (err) { setFaqMsg(`Error: ${err.message}`) }
                      finally { setFaqSaving(false) }
                    }}>{faqEditId ? 'Update' : 'Add FAQ'}</Button>
                    {faqEditId && <button onClick={() => { setFaqEditId(null); setFaqForm({ question: '', answer: '', category: 'general', sort_order: 0 }) }}
                      className="px-3 py-2 rounded-xl text-sm border border-[var(--c-border)] text-[var(--c-muted)]">Cancel</button>}
                  </div>
                </div>
                {faqsLoading ? <div className="flex justify-center py-8"><Spinner size={24}/></div>
                : faqs.length === 0 ? <div className="card p-10 text-center text-[var(--c-muted)] text-sm">No FAQs yet.</div>
                : (
                  <div className="card overflow-hidden divide-y divide-[var(--c-border)]">
                    {faqs.map(faq => (
                      <div key={faq.id} className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-[var(--c-text)]">{faq.question}</p>
                            <p className="text-xs text-[var(--c-muted)] mt-1 line-clamp-2">{faq.answer}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-surface-secondary px-2 py-0.5 rounded-full text-[var(--c-muted)]">{faq.category}</span>
                              {!faq.is_active && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Hidden</span>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => { setFaqEditId(faq.id); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category, sort_order: faq.sort_order }) }}
                              className="p-1.5 rounded-lg text-[var(--c-muted)] hover:bg-surface-secondary"><Pencil size={13}/></button>
                            <button onClick={async () => {
                              await api.faqs.update(faq.id, { is_active: !faq.is_active }, token)
                              loadFaqs()
                            }} className="p-1.5 rounded-lg text-[var(--c-muted)] hover:bg-surface-secondary">{faq.is_active ? <EyeOff size={13}/> : <Eye size={13}/>}</button>
                            <button onClick={async () => {
                              if (!confirm('Delete FAQ?')) return
                              await api.faqs.delete(faq.id, token); loadFaqs()
                            }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STAFF TASKS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Tasks' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><ListTodo size={17}/> Staff Tasks</h3>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <select
                        value={taskAssigneeFilter}
                        onChange={e => { setTaskAssigneeFilter(e.target.value); loadTasks(1, e.target.value) }}
                        className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"
                      >
                        <option value="">All staff</option>
                        {assignableStaff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                      </select>
                    )}
                    <button onClick={() => loadTasks(1)} disabled={tasksLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">Refresh</button>
                  </div>
                </div>
                {taskMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{taskMsg}</p>}
                {isAdmin && (
                  <div className="card p-5 space-y-3">
                    <h4 className="font-semibold text-sm text-[var(--c-text)]">Assign New Task</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select value={taskForm.assigned_to} onChange={e => setTaskForm(p => ({...p, assigned_to: e.target.value}))}
                        className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                        <option value="">— assign to —</option>
                        {assignableStaff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                      </select>
                      <input value={taskForm.title} onChange={e => setTaskForm(p => ({...p, title: e.target.value}))} placeholder="Task title"
                        className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                      <select value={taskForm.priority} onChange={e => setTaskForm(p => ({...p, priority: e.target.value}))}
                        className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                        {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({...p, due_date: e.target.value}))}
                        className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    </div>
                    <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({...p, description: e.target.value}))} placeholder="Description (optional)" rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] resize-none"/>
                    <Button size="sm" loading={taskSaving} onClick={async () => {
                      if (!taskForm.assigned_to || !taskForm.title) { setTaskMsg('assigned_to and title required'); return }
                      setTaskSaving(true); setTaskMsg('')
                      try {
                        await api.staffExtended.createTask(taskForm, token)
                        setTaskMsg('✓ Task assigned')
                        setTaskForm({ assigned_to: '', title: '', description: '', priority: 'medium', due_date: '' })
                        loadTasks(1)
                      } catch (err) { setTaskMsg(`Error: ${err.message}`) }
                      finally { setTaskSaving(false) }
                    }}>Assign Task</Button>
                  </div>
                )}
                {tasksLoading ? <div className="flex justify-center py-8"><Spinner size={24}/></div>
                : tasks.length === 0 ? <div className="card p-10 text-center text-[var(--c-muted)] text-sm">No tasks.</div>
                : (
                  <div className="card overflow-hidden divide-y divide-[var(--c-border)]">
                    {tasks.map(t => {
                      const pc = { low: 'text-gray-500', medium: 'text-blue-600', high: 'text-amber-600', urgent: 'text-red-600' }
                      const sc = { pending: 'bg-amber-50 text-amber-700', in_progress: 'bg-blue-50 text-blue-700', done: 'bg-green-50 text-green-700', cancelled: 'bg-gray-50 text-gray-500' }
                      return (
                        <div key={t.id} className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-[var(--c-text)]">{t.title}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${sc[t.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{t.status}</span>
                                <span className={`text-[10px] font-semibold ${pc[t.priority]}`}>{t.priority}</span>
                              </div>
                              {t.description && <p className="text-xs text-[var(--c-muted)] mt-1">{t.description}</p>}
                              <p className="text-xs text-[var(--c-dim)] mt-1">Assigned to: {t.profiles?.name || 'Unknown'} {t.due_date && `· Due: ${t.due_date}`}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              {t.status === 'pending' && <button onClick={async () => {
                                await api.staffExtended.updateTask(t.id, { status: 'in_progress' }, token); loadTasks(tasksPage)
                              }} title="Mark in progress" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Play size={13}/></button>}
                              {t.status !== 'done' && <button onClick={async () => {
                                await api.staffExtended.updateTask(t.id, { status: 'done' }, token); loadTasks(tasksPage)
                              }} title="Mark done" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><Check size={13}/></button>}
                              {isAdmin && <button onClick={async () => {
                                await api.staffExtended.deleteTask(t.id, token); loadTasks(tasksPage)
                              }} title="Delete task" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Pagination page={tasksPage} totalPages={tasksTotalPgs} total={tasksTotal} onPageChange={loadTasks} loading={tasksLoading}/>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ANNOUNCEMENTS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Announcements' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><Bell size={17}/> System Announcements</h3>
                  <button onClick={loadAnnouncements} disabled={announcementsLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">Refresh</button>
                </div>
                {annMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{annMsg}</p>}
                <div className="card p-5 space-y-3">
                  <h4 className="font-semibold text-sm text-[var(--c-text)]">{annEditId ? 'Edit Announcement' : 'New Announcement'}</h4>
                  <input value={annForm.title} onChange={e => setAnnForm(p => ({...p, title: e.target.value}))} placeholder="Title"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                  <textarea value={annForm.message} onChange={e => setAnnForm(p => ({...p, message: e.target.value}))} placeholder="Message" rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] resize-none"/>
                  <div className="flex gap-3 flex-wrap">
                    <select value={annForm.type} onChange={e => setAnnForm(p => ({...p, type: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      {['info','warning','success','error'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={annForm.target} onChange={e => setAnnForm(p => ({...p, target: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      {['all','admin','staff','owner'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="datetime-local" value={annForm.expires_at} onChange={e => setAnnForm(p => ({...p, expires_at: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    <Button size="sm" loading={annSaving} onClick={async () => {
                      setAnnSaving(true); setAnnMsg('')
                      try {
                        if (annEditId) await api.announcements.update(annEditId, annForm, token)
                        else await api.announcements.create(annForm, token)
                        setAnnMsg(annEditId ? '✓ Updated' : '✓ Announcement created')
                        setAnnForm({ title: '', message: '', type: 'info', target: 'all', expires_at: '' }); setAnnEditId(null)
                        loadAnnouncements()
                      } catch (err) { setAnnMsg(`Error: ${err.message}`) }
                      finally { setAnnSaving(false) }
                    }}>{annEditId ? 'Update' : 'Create'}</Button>
                    {annEditId && <button onClick={() => { setAnnEditId(null); setAnnForm({ title: '', message: '', type: 'info', target: 'all', expires_at: '' }) }}
                      className="px-3 py-2 rounded-xl text-sm border border-[var(--c-border)] text-[var(--c-muted)]">Cancel</button>}
                  </div>
                </div>
                {announcementsLoading ? <div className="flex justify-center py-8"><Spinner size={24}/></div>
                : announcements.length === 0 ? <div className="card p-10 text-center text-[var(--c-muted)] text-sm">No announcements.</div>
                : (
                  <div className="card overflow-hidden divide-y divide-[var(--c-border)]">
                    {announcements.map(a => {
                      const tc = { info: 'bg-blue-50 text-blue-700', warning: 'bg-amber-50 text-amber-700', success: 'bg-green-50 text-green-700', error: 'bg-red-50 text-red-600' }
                      return (
                        <div key={a.id} className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-[var(--c-text)]">{a.title}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc[a.type]}`}>{a.type}</span>
                                <span className="text-[10px] bg-surface-secondary text-[var(--c-muted)] px-2 py-0.5 rounded-full">{a.target}</span>
                                {!a.is_active && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                              </div>
                              <p className="text-xs text-[var(--c-muted)] mt-1">{a.message}</p>
                              {a.expires_at && <p className="text-[10px] text-[var(--c-dim)] mt-1">Expires: {new Date(a.expires_at).toLocaleDateString()}</p>}
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => { setAnnEditId(a.id); setAnnForm({ title: a.title, message: a.message, type: a.type, target: a.target, expires_at: a.expires_at || '' }) }}
                                className="p-1.5 rounded-lg text-[var(--c-muted)] hover:bg-surface-secondary"><Pencil size={13}/></button>
                              <button onClick={async () => { await api.announcements.update(a.id, { is_active: !a.is_active }, token); loadAnnouncements() }}
                                className="p-1.5 rounded-lg text-[var(--c-muted)] hover:bg-surface-secondary">{a.is_active ? <EyeOff size={13}/> : <Eye size={13}/>}</button>
                              <button onClick={async () => { if (!confirm('Delete?')) return; await api.announcements.delete(a.id, token); loadAnnouncements() }}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SUPPORT TICKETS
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Tickets' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><Ticket size={17}/> Support Tickets {ticketsTotal > 0 && <span className="text-[var(--c-muted)] font-normal text-base">({ticketsTotal})</span>}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <select value={ticketFilter} onChange={e => { setTicketFilter(e.target.value); loadTickets(1, e.target.value, ticketPriorityFilter, ticketAssigneeFilter) }}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      <option value="">All Statuses</option>
                      {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={ticketPriorityFilter} onChange={e => { setTicketPriorityFilter(e.target.value); loadTickets(1, ticketFilter, e.target.value, ticketAssigneeFilter) }}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      <option value="">All Priorities</option>
                      {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {isAdmin && (
                      <select value={ticketAssigneeFilter} onChange={e => { setTicketAssigneeFilter(e.target.value); loadTickets(1, ticketFilter, ticketPriorityFilter, e.target.value) }}
                        className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                        <option value="">All Assignees</option>
                        <option value="unassigned">Unassigned</option>
                        {assignableStaff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    )}
                    <button onClick={() => loadTickets(1)} disabled={ticketsLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">Refresh</button>
                  </div>
                </div>
                {ticketsLoading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
                : tickets.length === 0 ? <div className="card p-12 text-center"><Ticket size={32} className="mx-auto mb-3 text-[var(--c-dim)]"/><p className="text-[var(--c-muted)] text-sm">No tickets.</p></div>
                : (
                  <div className="card overflow-hidden divide-y divide-[var(--c-border)]">
                    {tickets.map(t => {
                      const sc = { open: 'bg-red-50 text-red-600', in_progress: 'bg-blue-50 text-blue-700', resolved: 'bg-green-50 text-green-700', closed: 'bg-gray-50 text-gray-500' }
                      const pc = { low: 'bg-gray-50 text-gray-500', medium: 'bg-blue-50 text-blue-700', high: 'bg-amber-50 text-amber-700', urgent: 'bg-red-50 text-red-600' }
                      const isExp = expandedTicket?.id === t.id
                      return (
                        <div key={t.id}>
                          <div className="flex items-center gap-4 px-4 py-4 cursor-pointer hover:bg-surface-secondary" onClick={async () => {
                            if (isExp) { setExpandedTicket(null); return }
                            const d = await api.tickets.get(t.id, token)
                            setExpandedTicket(d)
                          }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-[var(--c-text)]">{t.subject}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc[t.status] || 'bg-gray-50 text-gray-600'}`}>{t.status}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pc[t.priority] || 'bg-gray-50 text-gray-600'}`}>{t.priority}</span>
                                {t.assignee?.name && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600">→ {t.assignee.name}</span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--c-muted)] mt-0.5">by {t.profiles?.name || 'Unknown'} · {new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                            {isExp ? <ChevronUp size={16} className="text-[var(--c-dim)]"/> : <ChevronDown size={16} className="text-[var(--c-dim)]"/>}
                          </div>
                          {isExp && expandedTicket && (
                            <div className="px-4 pb-4 border-t border-[var(--c-border)] bg-surface-secondary space-y-3 pt-3">
                              <div className="flex gap-2 flex-wrap">
                                {['open','in_progress','resolved','closed'].map(s => (
                                  <button key={s} onClick={async () => {
                                    await api.tickets.update(t.id, { status: s }, token)
                                    setExpandedTicket(p => ({...p, status: s}))
                                    loadTickets(ticketsPage)
                                  }} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${expandedTicket.status === s ? 'bg-[var(--c-primary)] text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}>{s}</button>
                                ))}
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {['low','medium','high','urgent'].map(p => (
                                  <button key={p} onClick={async () => {
                                    await api.tickets.update(t.id, { priority: p }, token)
                                    setExpandedTicket(prev => ({...prev, priority: p}))
                                    loadTickets(ticketsPage)
                                  }} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${expandedTicket.priority === p ? 'bg-[var(--c-primary)] text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}>{p}</button>
                                ))}
                              </div>
                              {isAdmin && (
                                <div>
                                  <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Assign to staff</label>
                                  <select
                                    value={expandedTicket.assigned_to || ''}
                                    onChange={async e => {
                                      const assigned_to = e.target.value || null
                                      await api.tickets.update(t.id, { assigned_to }, token)
                                      const assignee = assignableStaff.find(u => u.id === assigned_to) || null
                                      setExpandedTicket(prev => ({...prev, assigned_to, assignee}))
                                      loadTickets(ticketsPage)
                                    }}
                                    className={inputCls}
                                  >
                                    <option value="">— Unassigned —</option>
                                    {assignableStaff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                  </select>
                                </div>
                              )}
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(expandedTicket.messages || []).map(m => (
                                  <div key={m.id} className={`p-3 rounded-xl text-sm ${m.is_staff ? 'bg-blue-50 text-blue-900 ml-8' : 'bg-white border border-[var(--c-border)] mr-8'}`}>
                                    <p className="text-[10px] text-[var(--c-muted)] mb-1">{m.profiles?.name} · {new Date(m.created_at).toLocaleString()}</p>
                                    {m.message}
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input value={ticketReply} onChange={e => setTicketReply(e.target.value)} placeholder="Type reply…"
                                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                                <Button size="sm" loading={ticketReplying} onClick={async () => {
                                  if (!ticketReply.trim()) return
                                  setTicketReplying(true)
                                  try {
                                    await api.tickets.reply(t.id, { message: ticketReply }, token)
                                    setTicketReply('')
                                    const d = await api.tickets.get(t.id, token)
                                    setExpandedTicket(d)
                                  } catch (err) { console.error(err) }
                                  finally { setTicketReplying(false) }
                                }}><Send size={13}/></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <Pagination page={ticketsPage} totalPages={ticketsTotalPgs} total={ticketsTotal} onPageChange={loadTickets} loading={ticketsLoading}/>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                REVENUE TRACKER
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Revenue' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><DollarSign size={17}/> Revenue Tracker</h3>
                  <button onClick={() => loadPayments(1)} disabled={paymentsLoading} className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">Refresh</button>
                </div>
                {payMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{payMsg}</p>}
                <div className="card p-5 space-y-3">
                  <h4 className="font-semibold text-sm text-[var(--c-text)]">Record Payment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={payForm.restaurant_id} onChange={e => setPayForm(p => ({...p, restaurant_id: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      <option value="">— select restaurant —</option>
                      {restaurantOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({...p, amount: e.target.value}))} placeholder="Amount (LKR)"
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    <select value={payForm.plan_type} onChange={e => setPayForm(p => ({...p, plan_type: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      {['monthly','annual','boost_30','boost_60','boost_90'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" value={payForm.payment_date} onChange={e => setPayForm(p => ({...p, payment_date: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    <input value={payForm.notes} onChange={e => setPayForm(p => ({...p, notes: e.target.value}))} placeholder="Notes (optional)"
                      className="sm:col-span-2 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                  </div>
                  <Button size="sm" loading={paySaving} onClick={async () => {
                    if (!payForm.restaurant_id || !payForm.amount) { setPayMsg('restaurant and amount required'); return }
                    setPaySaving(true); setPayMsg('')
                    try {
                      await api.payments.create(payForm, token)
                      setPayMsg('✓ Payment recorded')
                      setPayForm({ restaurant_id: '', amount: '', plan_type: 'monthly', payment_date: '', notes: '' })
                      loadPayments(1)
                    } catch (err) { setPayMsg(`Error: ${err.message}`) }
                    finally { setPaySaving(false) }
                  }}>Record Payment</Button>
                </div>
                {paymentsLoading ? <div className="flex justify-center py-8"><Spinner size={24}/></div>
                : payments.length === 0 ? <div className="card p-10 text-center text-[var(--c-muted)] text-sm">No payments recorded yet.</div>
                : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-[var(--c-border)]">
                      {payments.map(p => (
                        <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[var(--c-text)]">{p.restaurants?.name}</p>
                            <p className="text-xs text-[var(--c-muted)]">{p.plan_type} · {p.payment_date} {p.notes && `· ${p.notes}`}</p>
                          </div>
                          <p className="font-bold text-green-600 text-sm shrink-0">LKR {Number(p.amount).toLocaleString()}</p>
                          <button onClick={async () => {
                            if (!confirm('Delete payment?')) return
                            await api.payments.delete(p.id, token); loadPayments(paymentsPage)
                          }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={13}/></button>
                        </div>
                      ))}
                    </div>
                    <Pagination page={paymentsPage} totalPages={paymentsTotalPgs} total={paymentsTotal} onPageChange={loadPayments} loading={paymentsLoading}/>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                NOTIFICATIONS (Send Panel)
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'Notifications' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2"><Bell size={17}/> Send Notifications</h3>
                {notifMsg && <p className="text-sm px-4 py-2 rounded-xl bg-green-50 text-green-700">{notifMsg}</p>}
                <div className="card p-5 space-y-4">
                  <p className="text-xs text-[var(--c-muted)]">Send a notification to all users of a specific role, or to a specific user by selecting them below.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={notifForm.role} onChange={e => setNotifForm(p => ({...p, role: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      {['user','owner','staff','admin'].map(r => <option key={r} value={r}>{r} (all)</option>)}
                    </select>
                    <select value={notifForm.type} onChange={e => setNotifForm(p => ({...p, type: e.target.value}))}
                      className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]">
                      {['info','success','warning','error'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={notifForm.title} onChange={e => setNotifForm(p => ({...p, title: e.target.value}))} placeholder="Notification title"
                      className="sm:col-span-2 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"/>
                    <textarea value={notifForm.message} onChange={e => setNotifForm(p => ({...p, message: e.target.value}))} placeholder="Message" rows={3}
                      className="sm:col-span-2 px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] resize-none"/>
                  </div>
                  <Button loading={notifSaving} onClick={async () => {
                    if (!notifForm.title || !notifForm.message) { setNotifMsg('title and message required'); return }
                    setNotifSaving(true); setNotifMsg('')
                    try {
                      await api.notifications.send({ role: notifForm.role, title: notifForm.title, message: notifForm.message, type: notifForm.type }, token)
                      setNotifMsg(`✓ Notification sent to all ${notifForm.role}s`)
                      setNotifForm({ role: 'user', title: '', message: '', type: 'info' })
                    } catch (err) { setNotifMsg(`Error: ${err.message}`) }
                    finally { setNotifSaving(false) }
                  }}>Send Notification</Button>
                </div>
              </div>
            )}

            {/* ── REPORTS ──────────────────────────────────────────────── */}
            {tab === 'Reports' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-extrabold" style={{ color: 'var(--c-text)' }}>
                      {reportsData?.type === 'admin' ? 'Staff Performance' : 'My Performance'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-dim)' }}>
                      {reportsData?.type === 'admin' ? 'Task completion stats for each staff member' : 'Your task activity and completion rate'}
                    </p>
                  </div>
                  <button onClick={loadReports}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--c-border)] hover:bg-[var(--c-surface2)] transition-all"
                    style={{ color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
                    <TrendingUp size={13} /> Refresh
                  </button>
                </div>

                {reportsLoading ? (
                  <div className="flex justify-center items-center py-20"><Spinner size={28} /></div>
                ) : !reportsData ? (
                  <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No report data available.</div>
                ) : reportsData.type === 'admin' ? (
                  /* ── Admin view: separate, independently searchable tables ── */
                  <div className="space-y-8">

                    {/* ── TABLE 1: Staff Performance ── */}
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <p className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>Staff Performance</p>
                        <div className="flex items-center gap-2">
                          <input
                            value={reportsStaffSearch}
                            onChange={e => setReportsStaffSearch(e.target.value)}
                            placeholder="Search staff name…"
                            className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] w-44"
                          />
                          <select
                            value={reportsStaffFilter}
                            onChange={e => setReportsStaffFilter(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"
                          >
                            <option value="">All staff</option>
                            <option value="overdue">Has overdue tasks</option>
                            <option value="warned">Has warnings</option>
                          </select>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
                        {(() => {
                          const rows = (reportsData.data || []).filter(s => {
                            if (reportsStaffSearch && !(s.name || '').toLowerCase().includes(reportsStaffSearch.toLowerCase())) return false
                            if (reportsStaffFilter === 'overdue' && s.tasks.overdue === 0) return false
                            if (reportsStaffFilter === 'warned' && s.warnings === 0) return false
                            return true
                          })
                          return rows.length === 0 ? (
                            <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No staff members match.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[var(--c-border)]" style={{ background: 'var(--c-surface2)' }}>
                                    {['Staff Member','Total','Done','Active','Pending','Overdue','Rate','Warnings'].map(h => (
                                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-dim)' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map(s => (
                                    <tr key={s.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface2)] transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2D55] to-[#FF6035] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                            {(s.name || '?')[0].toUpperCase()}
                                          </div>
                                          <div>
                                            <p className="text-[12px] font-semibold leading-none" style={{ color: 'var(--c-text)' }}>{s.name || 'Unnamed'}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-dim)' }}>
                                              Since {s.joined ? new Date(s.joined).toLocaleDateString() : '—'}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--c-text)' }}>{s.tasks.total}</td>
                                      <td className="px-4 py-3">
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{s.tasks.done}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.tasks.in_progress}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{s.tasks.pending}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full', s.tasks.overdue > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}>{s.tasks.overdue}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 min-w-[48px]">
                                            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FF2D55] to-[#FF6035]" style={{ width: `${s.completionRate}%` }} />
                                          </div>
                                          <span className="text-[11px] font-bold shrink-0" style={{ color: 'var(--c-text)' }}>{s.completionRate}%</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full', s.warnings > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400')}>{s.warnings}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* ── TABLE 2: All Tasks ── */}
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <p className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>All Tasks</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            value={reportsTaskSearch}
                            onChange={e => setReportsTaskSearch(e.target.value)}
                            placeholder="Search task title…"
                            className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)] w-44"
                          />
                          <select
                            value={reportsTaskStatus}
                            onChange={e => setReportsTaskStatus(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"
                          >
                            <option value="">All statuses</option>
                            {['pending','in_progress','done','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                          </select>
                          <select
                            value={reportsTaskAssignee}
                            onChange={e => setReportsTaskAssignee(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-[var(--c-border)] text-sm bg-[var(--c-bg)] text-[var(--c-text)]"
                          >
                            <option value="">All staff</option>
                            {assignableStaff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
                        {reportsTasksLoading ? (
                          <div className="flex justify-center items-center py-16"><Spinner size={22} /></div>
                        ) : (() => {
                          const sc = { pending: 'bg-amber-50 text-amber-700', in_progress: 'bg-blue-50 text-blue-700', done: 'bg-green-50 text-green-700', cancelled: 'bg-gray-50 text-gray-500' }
                          const pc = { low: 'text-gray-500', medium: 'text-blue-600', high: 'text-amber-600', urgent: 'text-red-600' }
                          const rows = reportsAllTasks.filter(t => {
                            if (reportsTaskSearch && !t.title.toLowerCase().includes(reportsTaskSearch.toLowerCase())) return false
                            if (reportsTaskStatus && t.status !== reportsTaskStatus) return false
                            if (reportsTaskAssignee && t.profiles?.id !== reportsTaskAssignee) return false
                            return true
                          })
                          return rows.length === 0 ? (
                            <div className="py-16 text-center text-sm" style={{ color: 'var(--c-dim)' }}>No tasks match.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[var(--c-border)]" style={{ background: 'var(--c-surface2)' }}>
                                    {['Title','Assigned To','Status','Priority','Due Date','Created'].map(h => (
                                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-dim)' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map(t => (
                                    <tr key={t.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface2)] transition-colors">
                                      <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--c-text)' }}>{t.title}</td>
                                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--c-muted)' }}>{t.profiles?.name || 'Unknown'}</td>
                                      <td className="px-4 py-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${sc[t.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{t.status}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`text-[11px] font-semibold ${pc[t.priority]}`}>{t.priority}</span>
                                      </td>
                                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--c-dim)' }}>{t.due_date || '—'}</td>
                                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--c-dim)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                  </div>
                ) : (
                  /* ── Staff view: own performance */
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label: 'Total Tasks',    value: reportsData.stats?.total,          color: '#7c3aed' },
                        { label: 'Completed',      value: reportsData.stats?.done,           color: '#16a34a' },
                        { label: 'In Progress',    value: reportsData.stats?.in_progress,    color: '#2563eb' },
                        { label: 'Pending',        value: reportsData.stats?.pending,        color: '#d97706' },
                        { label: 'Overdue',        value: reportsData.stats?.overdue,        color: '#dc2626' },
                        { label: 'Completion Rate',value: `${reportsData.stats?.completionRate ?? 0}%`, color: '#FF2D55' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-2xl border border-[var(--c-border)] p-4" style={{ background: 'var(--c-surface)' }}>
                          <p className="text-2xl font-extrabold" style={{ color }}>{value ?? '—'}</p>
                          <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--c-dim)' }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {reportsData.stats?.total > 0 && (
                      <div className="rounded-2xl border border-[var(--c-border)] p-5" style={{ background: 'var(--c-surface)' }}>
                        <p className="text-[12px] font-bold mb-3" style={{ color: 'var(--c-muted)' }}>Completion Progress</p>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-3 rounded-full bg-gradient-to-r from-[#FF2D55] to-[#FF6035] transition-all"
                            style={{ width: `${reportsData.stats?.completionRate ?? 0}%` }} />
                        </div>
                        <p className="text-[11px] mt-2" style={{ color: 'var(--c-dim)' }}>
                          {reportsData.stats?.done} of {reportsData.stats?.total} tasks completed
                        </p>
                      </div>
                    )}

                    {reportsData.tasks?.length > 0 && (
                      <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden" style={{ background: 'var(--c-surface)' }}>
                        <div className="px-5 py-4 border-b border-[var(--c-border)]">
                          <p className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>Recent Tasks</p>
                        </div>
                        <div className="divide-y divide-[var(--c-border)]">
                          {reportsData.tasks.map(t => (
                            <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                              <span className={clsx('w-2 h-2 rounded-full shrink-0',
                                t.status === 'done' ? 'bg-green-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-400'
                              )} />
                              <p className="flex-1 text-[12px] font-medium truncate" style={{ color: 'var(--c-text)' }}>{t.title}</p>
                              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize',
                                t.status === 'done' ? 'bg-green-100 text-green-700'
                                : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                              )}>{t.status.replace('_', ' ')}</span>
                              {t.due_date && (
                                <span className="text-[10px] shrink-0" style={{ color: 'var(--c-dim)' }}>
                                  Due {new Date(t.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="h-20 lg:h-8" />
          </main>
        </div>
      </div>
    </>
  )
}
