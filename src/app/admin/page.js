'use client'
import { useState, useEffect, Fragment } from 'react'
import { useRouter }                      from 'next/navigation'
import Link                               from 'next/link'
import {
  LayoutDashboard, UtensilsCrossed, MessageSquare, Users, Upload,
  Plus, Check, X, Trash2, Shield, Image, FileText, Pencil, Tag,
  Menu, Clock, Home, ChevronRight, ChevronLeft, Zap, ZapOff, History,
  Inbox, Building2, UserCheck, ChevronDown, AlertCircle, Eye, EyeOff, ExternalLink,
  Palette, Moon, Sun, Megaphone, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { THEMES } from '@/lib/themes'
import { adminListBanners, adminSaveBanner, adminToggleBanner, adminDeleteBanner } from '@/lib/banners'
import Navbar           from '@/components/layout/Navbar'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import { useAuth }      from '@/hooks/useAuth'
import { supabase }     from '@/lib/supabase'
import { api }          from '@/lib/api'
import clsx             from 'clsx'

const PAGE_SIZE = 12

// Sections staff can have access toggled for (admin-only sections excluded)
const STAFF_SECTIONS = [
  'Overview', 'Restaurants', 'Boost', 'Reviews',
  'Menu Items', 'Site Content', 'History',
]

// All nav items — staff sees a filtered subset based on their permissions
const ALL_NAV_ITEMS = [
  // Content — primary entities and their direct tools
  { key: 'Overview',     label: 'Overview',        icon: LayoutDashboard, adminOnly: false, group: 'Content'    },
  { key: 'Restaurants',  label: 'Restaurants',     icon: UtensilsCrossed, adminOnly: false, group: 'Content'    },
  { key: 'Menu Items',   label: 'Menu Items',      icon: Tag,             adminOnly: false, group: 'Content'    },
  { key: 'Banners',      label: 'Banners',         icon: Megaphone,       adminOnly: true,  group: 'Content'    },
  // Moderation — things that need regular review or action
  { key: 'Reviews',      label: 'Reviews',         icon: MessageSquare,   adminOnly: false, group: 'Moderation' },
  { key: 'Requests',     label: 'Change Requests', icon: Inbox,           adminOnly: true,  group: 'Moderation' },
  { key: 'Boost',        label: 'Boost',           icon: Zap,             adminOnly: false, group: 'Moderation' },
  // Admin — people and access management
  { key: 'Users',        label: 'Users',           icon: Users,           adminOnly: true,  group: 'Admin'      },
  { key: 'Owners',       label: 'Owners',          icon: Building2,       adminOnly: true,  group: 'Admin'      },
  { key: 'Staff',        label: 'Staff',           icon: UserCheck,       adminOnly: true,  group: 'Admin'      },
  // System — configuration and audit trail
  { key: 'Site Content', label: 'Site Content',    icon: FileText,        adminOnly: false, group: 'System'     },
  { key: 'Theme',        label: 'Theme',           icon: Palette,         adminOnly: true,  group: 'System'     },
  { key: 'History',      label: 'History',         icon: Clock,           adminOnly: false, group: 'System'     },
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
  const { user, profile, isAdmin, isStaff, loading: authLoading, token } = useAuth()
  const router = useRouter()

  // ── Navigation
  const [tab,         setTab]         = useState('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tabsLoaded,  setTabsLoaded]  = useState(new Set(['Overview']))

  // ── Staff permissions (loaded from Supabase directly via RLS)
  const [myPermissions, setMyPermissions] = useState(null) // null = not yet loaded

  // ── Global state
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restaurants (paginated table)
  const [restaurants,    setRestaurants]    = useState([])
  const [restPage,       setRestPage]       = useState(1)
  const [restTotal,      setRestTotal]      = useState(0)
  const [restTotalPages, setRestTotalPages] = useState(1)
  const [restsLoading,   setRestsLoading]   = useState(false)

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
    discount_type: '', discount_value: '', photo: null,
    ingredients: '', portions: [],
  })
  const [miEditId, setMiEditId] = useState(null)
  const [miSaving, setMiSaving] = useState(false)
  const [miMsg,    setMiMsg]    = useState('')

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
  const [banners,        setBanners]        = useState([])
  const [bannersLoading, setBannersLoading] = useState(false)
  const [bannerForm,     setBannerForm]     = useState(BANNER_EMPTY)
  const [bannerEditId,   setBannerEditId]   = useState(null)
  const [bannerSaving,   setBannerSaving]   = useState(false)
  const [bannerMsg,      setBannerMsg]      = useState('')

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
      whySubtitle: 'MealHear makes it easy to discover, explore and review every food place across Sri Lanka.',
      howTitle:    'How MealHear works',
      step1Title:  'Search',    step1Desc:  'Find food menus at hotels, restaurants, food shops and snack bars by name, price or location.',
      step2Title:  'View Menu', step2Desc:  'Browse the full menu with current prices — always up to date and accurate.',
      step3Title:  'Review',    step3Desc:  'Sign in and share your experience to help others find great food nearby.',
      ctaBannerHeadline:    "Ready to explore Sri Lanka's best food?",
      ctaBannerSubheadline: 'Browse menus, discover restaurants and share your experience — all in one place.',
      t1Name: 'Kavindi P.',  t1Location: 'Colombo', t1Text: 'Finally I can check the menu and prices before going to a restaurant. Saved me so many trips!',
      t2Name: 'Rashan F.',   t2Location: 'Galle',   t2Text: 'The PDF menu feature is excellent. I could see the full menu just like holding it in hand.',
      t3Name: 'Thilini S.',  t3Location: 'Kandy',   t3Text: 'Great app for finding local food spots. Discovered so many new places near my home.',
      footerDesc:      "Sri Lanka's food discovery platform. Find menus from hotels, restaurants, food shops and snack bars — all in one place.",
      footerCopyright: '© 2026 MealHear. All rights reserved.',
    },
    about: {
      headline:    'About MealHear',
      subheadline: "We built MealHear to solve a simple problem — finding food menus across Sri Lanka was hard. We made it easy.",
      stat1Value: '500+', stat1Label: 'Food Places Listed',
      stat2Value: '9',    stat2Label: 'Provinces Covered',
      stat3Value: '10K+', stat3Label: 'User Reviews',
      stat4Value: '4',    stat4Label: 'Venue Categories',
      storyTitle: "Sri Lanka's food discovery platform",
      storyP1:    'MealHear started with a simple question: "Where can I find the menu before I go?" We built the answer — a single platform where anyone can discover and explore food menus from hotels, restaurants, food shops and snack bars across every province in Sri Lanka.',
      storyP2:    "Whether you're a tourist looking for a good meal, a local finding a new favourite spot, or a business owner wanting to showcase your menu — MealHear is built for you.",
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
      email:    'hello@digitolio.lk',
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

  // ── Data loaders ────────────────────────────────────────────────────────

  async function loadInitial() {
    setLoading(true)
    try {
      if (isAdmin) {
        const [statsData, optsData] = await Promise.all([
          api.admin.stats(token),
          api.restaurants.list({ limit: 200 }),
        ])
        setStats(statsData)
        setRestaurantOptions(optsData.data || [])
      } else {
        // Staff: load restaurant options + own section permissions from Supabase (RLS allows)
        const [optsData, permsData] = await Promise.all([
          api.restaurants.list({ limit: 200 }),
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

  async function loadRestaurants(page = 1) {
    setRestsLoading(true)
    try {
      const data = await api.restaurants.list({ page, limit: PAGE_SIZE, showAll: 1 })
      setRestaurants(data.data || [])
      setRestTotal(data.total ?? 0)
      setRestTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setRestPage(page)
    } catch (err) { console.error(err) }
    finally { setRestsLoading(false) }
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

  async function loadChangeRequests(page = 1, statusFilter = crStatusFilter) {
    setCrLoading(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (statusFilter) params.status = statusFilter
      const data = await api.admin.changeRequests(params, token)
      setChangeRequests(data.data || [])
      setCrTotal(data.total ?? 0)
      setCrTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setCrPage(page)
    } catch (err) { console.error(err) }
    finally { setCrLoading(false) }
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

  // ── Lazy tab navigation ─────────────────────────────────────────────────
  function navigate(key) {
    setTab(key)
    setSidebarOpen(false)
    if (tabsLoaded.has(key)) return

    setTabsLoaded(prev => new Set([...prev, key]))

    if ((key === 'Restaurants' || key === 'Boost') &&
        !tabsLoaded.has('Restaurants') && !tabsLoaded.has('Boost')) {
      loadRestaurants(1)
    } else if (key === 'Reviews')  { loadReviews(1) }
    else if (key === 'Users')      { loadUsers(1, '', true) }
    else if (key === 'History')    { loadAuditLogs(1) }
    else if (key === 'Requests')   { loadChangeRequests(1) }
    else if (key === 'Owners')       { loadOwners() }
    else if (key === 'Staff')        { loadStaff(1) }
    else if (key === 'Site Content') { scLoad(scPage) }
    else if (key === 'Theme')        { loadTheme() }
    else if (key === 'Banners')      { loadBanners() }
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
  }

  async function changeUserRole(userId, newRole) {
    setUsersMsg('')
    try {
      await api.admin.patchUser(userId, { role: newRole }, token)
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, role: newRole } : usr))
      setUsersMsg(`✓ Role updated to "${newRole}"`)
      setTimeout(() => setUsersMsg(''), 3000)
      api.admin.userCounts(token).then(setUserRoleCounts).catch(() => {})
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
    if (staffPermsMap[staffId]) return
    setStaffPermsLoading(true)
    try {
      const data = await api.admin.staffPermissions(staffId, token)
      const permMap = {}
      // Default all sections to true if no record exists
      STAFF_SECTIONS.forEach(s => { permMap[s] = true })
      ;(data.data || []).forEach(p => { permMap[p.section] = p.can_access })
      setStaffPermsMap(m => ({ ...m, [staffId]: permMap }))
    } catch (err) { console.error(err) }
    finally { setStaffPermsLoading(false) }
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

  function miStartEdit(item) {
    setMiEditId(item.id)
    setMiForm({
      name: item.name, description: item.description || '',
      price: item.price || '', category: item.category || '',
      discount_type: item.discount_type || '', discount_value: item.discount_value || '',
      photo: null,
      ingredients: item.ingredients || '',
      portions: Array.isArray(item.portions) ? item.portions.map(p => ({ size: p.size, price: String(p.price) })) : [],
    })
  }

  function miReset() {
    setMiEditId(null)
    setMiForm({ name: '', description: '', price: '', category: '', discount_type: '', discount_value: '', photo: null, ingredients: '', portions: [] })
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
    } catch (err) { console.error(err) }
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
  const navItems = isAdmin
    ? ALL_NAV_ITEMS
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
          'lg:sticky lg:top-[66px] lg:h-[calc(100vh-66px)] lg:translate-x-0 lg:z-10',
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

        {/* ── Main content */}
        <div className="flex-1 min-w-0 flex flex-col">

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
                  <div className="flex items-center justify-between p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      All restaurants {restTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({restTotal})</span>}
                    </h3>
                    {isAdmin && (
                      <Link href="/admin/restaurants/new">
                        <Button size="sm" variant="secondary"><Plus size={14} /> Add new</Button>
                      </Link>
                    )}
                  </div>
                  {restsLoading ? <TabSpinner /> : restaurants.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">No restaurants yet.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {restaurants.map(r => (
                          <div key={r.id} className={clsx('flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors', !r.is_active && 'opacity-60 bg-gray-50/60')}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="font-medium text-sm text-[var(--c-text)] truncate">{r.name}</p>
                                {!r.is_active && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500 shrink-0">
                                    <EyeOff size={8} /> Hidden
                                  </span>
                                )}
                                {r.is_active && isBoostActive(r) && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                                    <Zap size={8} className="fill-white" /> Featured
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
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <Link href={`/admin/restaurants/${r.id}/edit`}>
                                <Button size="sm" variant="secondary" className="text-xs"><Pencil size={12} /> Edit</Button>
                              </Link>
                              {r.is_active && (
                                <Link href={`/restaurants/${r.id}`}>
                                  <Button size="sm" variant="ghost" className="text-xs">View</Button>
                                </Link>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => toggleVisibility(r)}
                                  title={r.is_active ? 'Hide from public' : 'Show to public'}
                                  className={clsx('p-1.5 rounded-lg transition-colors', r.is_active ? 'hover:bg-amber-50 text-amber-400 hover:text-amber-600' : 'hover:bg-green-50 text-green-400 hover:text-green-600')}
                                >
                                  {r.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              )}
                              {isAdmin && (
                                <button onClick={() => deleteRestaurant(r.id, r.name)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                  title="Permanently hide">
                                  <Trash2 size={14} />
                                </button>
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
                    { value: '',       label: 'All',   countKey: 'total' },
                    { value: 'admin',  label: 'Admin', countKey: 'admin' },
                    { value: 'staff',  label: 'Staff', countKey: 'staff' },
                    { value: 'owner',  label: 'Owner', countKey: 'owner' },
                    { value: 'user',   label: 'User',  countKey: 'user'  },
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

                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      {usersRoleFilter ? `${usersRoleFilter.charAt(0).toUpperCase() + usersRoleFilter.slice(1)}s` : 'All users'}
                      {usersTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({usersTotal})</span>}
                    </h3>
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
                                  <span className="text-[10px] text-[var(--c-dim)]">
                                    joined {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Role change — prevent changing own role */}
                              {u.id !== user?.id && (
                                <select
                                  value={u.role}
                                  onChange={e => changeUserRole(u.id, e.target.value)}
                                  className="text-xs border border-[var(--c-border)] rounded-lg px-2 py-1.5 bg-white outline-none focus:border-[#FF2D55]/40"
                                >
                                  {['user', 'owner', 'staff', 'admin'].map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                  ))}
                                </select>
                              )}
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => toggleBan(u.id, u.is_banned)}
                                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', u.is_banned ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100')}
                                >
                                  {u.is_banned ? 'Unban' : 'Ban'}
                                </button>
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
                    onChange={e => { setMiRestaurant(e.target.value); loadMenuItems(e.target.value); miReset() }}
                    className={inputCls}
                  >
                    <option value="">— Select restaurant —</option>
                    {restaurantOptions.map(r => <option key={r.id} value={r.id}>{r.name} — {r.town}</option>)}
                  </select>
                </div>

                {miRestaurant && (
                  <>
                    <div className="card p-5">
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
                                    className={`${inputCls} flex-1`}
                                  />
                                  <input
                                    type="number"
                                    value={p.price}
                                    onChange={e => setMiForm(f => { const pp = [...f.portions]; pp[i] = { ...pp[i], price: e.target.value }; return { ...f, portions: pp } })}
                                    placeholder="Rs."
                                    className={`${inputCls} w-28`}
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
                          <input type="file" accept="image/*" onChange={e => setMiForm(f => ({ ...f, photo: e.target.files[0] }))} className="w-full text-sm text-[var(--c-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FF2D55]/10 file:text-[#FF2D55] hover:file:bg-[#FF2D55]/20" />
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
                            {menuItems.map(item => (
                              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                                {item.photo_url ? (
                                  <img src={item.photo_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--c-border)]" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                    <Image size={20} className="text-[var(--c-dim)]" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-[var(--c-text)] truncate">{item.name}</p>
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
                                <div className="flex gap-1 shrink-0">
                                  <button onClick={() => miStartEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil size={14} /></button>
                                  <button onClick={() => miDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))}
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

                {/* ── SQL setup notice ── */}
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
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                HISTORY
            ═══════════════════════════════════════════════════════════ */}
            {tab === 'History' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
                    <Clock size={17} /> Activity History
                    {logsTotal > 0 && <span className="font-normal text-[var(--c-muted)] text-base">({logsTotal})</span>}
                  </h3>
                  <button onClick={() => loadAuditLogs(logsPage)} disabled={auditLoading}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50">
                    {auditLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {auditLoading ? (
                  <div className="flex justify-center py-16"><Spinner size={28} /></div>
                ) : auditLogs.length === 0 ? (
                  <div className="card p-12 text-center">
                    <Clock size={32} className="mx-auto mb-3 text-[var(--c-dim)]" />
                    <p className="text-[var(--c-muted)] text-sm">No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-[var(--c-border)]">
                      {auditLogs.map(log => {
                        const actionColors = {
                          'menu_item.create':           'bg-green-50 text-green-700',
                          'menu_item.update':           'bg-blue-50 text-blue-700',
                          'menu_item.delete':           'bg-red-50 text-red-600',
                          'menu.upload':                'bg-purple-50 text-purple-700',
                          'review.delete':              'bg-red-50 text-red-600',
                          'review.approve':             'bg-green-50 text-green-700',
                          'review.unapprove':           'bg-amber-50 text-amber-700',
                          'user.ban':                   'bg-red-50 text-red-600',
                          'user.unban':                 'bg-green-50 text-green-700',
                          'user.role_change':           'bg-blue-50 text-blue-700',
                          'site_content.update':        'bg-purple-50 text-purple-700',
                          'restaurant.boost.enable':    'bg-amber-50 text-amber-700',
                          'restaurant.boost.remove':    'bg-gray-50 text-gray-600',
                          'restaurant.create':          'bg-green-50 text-green-700',
                          'owner.assign':               'bg-purple-50 text-purple-700',
                          'change_request.approved':    'bg-blue-50 text-blue-700',
                          'change_request.rejected':    'bg-red-50 text-red-600',
                          'change_request.paid':        'bg-purple-50 text-purple-700',
                          'change_request.applied':     'bg-green-50 text-green-700',
                          'staff.permissions_update':   'bg-blue-50 text-blue-700',
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
                    <Pagination page={logsPage} totalPages={logsTotalPages} total={logsTotal} onPageChange={loadAuditLogs} loading={auditLoading} />
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
