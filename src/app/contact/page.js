'use client'
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, ArrowRight } from 'lucide-react'

const contactInfo = [
  {
    icon: Mail,
    label: 'Email Us',
    value: 'hello@digitolio.lk',
    desc: 'We reply within 24 hours',
    href: 'mailto:hello@digitolio.lk',
  },
  {
    icon: Phone,
    label: 'Call Us',
    value: '+94 11 234 5678',
    desc: 'Mon – Fri, 9am – 5pm',
    href: 'tel:+94112345678',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Colombo, Sri Lanka',
    desc: 'Serving all 9 provinces',
    href: null,
  },
  {
    icon: Clock,
    label: 'Office Hours',
    value: 'Mon – Fri',
    desc: '9:00 AM – 5:00 PM',
    href: null,
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setLoading(true)
    // Simulate send (wire up to real email service later)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSent(true)
  }

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO */}
        <section className="relative overflow-hidden px-4 pt-20 pb-24"
          style={{ background: 'linear-gradient(135deg, #FF2D55 0%, #FF4E2A 60%, #FF6035 100%)' }}>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)' }} />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-white/40 bg-white/20 rounded-full px-4 py-1.5 text-xs text-white font-semibold mb-8 uppercase tracking-widest">
              <MessageCircle size={12} />
              Get in Touch
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6">
              Contact Us
            </h1>
            <p className="text-white/90 text-lg leading-relaxed max-w-xl mx-auto">
              Have a question, feedback, or want to list your food place? We&apos;d love to hear from you.
            </p>
          </div>
        </section>

        {/* ── CONTACT CARDS + FORM */}
        <section className="bg-white py-20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10">

              {/* Left — Info */}
              <div>
                <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-3">Reach Us</p>
                <h2 className="font-display text-3xl font-black text-[var(--c-text)] mb-7">
                  We&apos;re here to help
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contactInfo.map(({ icon: Icon, label, value, desc, href }) => {
                    const Inner = (
                      <div className={`flex gap-4 p-5 rounded-2xl border border-[var(--c-border)] bg-[#f9f9f9] transition-all duration-200 ${href ? 'hover:border-[#FF2D55]/30 hover:bg-[#FF2D55]/[0.03] cursor-pointer' : ''}`}>
                        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                          <Icon size={18} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-xs text-[var(--c-muted)] font-semibold mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-[var(--c-text)]">{value}</p>
                          <p className="text-xs text-[var(--c-dim)] mt-0.5">{desc}</p>
                        </div>
                      </div>
                    )
                    return href ? <a key={label} href={href}>{Inner}</a> : <div key={label}>{Inner}</div>
                  })}
                </div>

                {/* CTA */}
                <div className="mt-8 p-6 rounded-2xl bg-[#080808] text-white">
                  <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Own a food place?</p>
                  <h3 className="font-display text-xl font-black mb-2">List your menu on Digitolio</h3>
                  <p className="text-white/40 text-sm mb-5 leading-relaxed">Reach thousands of food lovers across Sri Lanka. It&apos;s free to get started.</p>
                  <a href="mailto:hello@digitolio.lk?subject=List My Place"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                    Get Listed <ArrowRight size={14} />
                  </a>
                </div>
              </div>

              {/* Right — Form */}
              <div className="rounded-3xl border border-[var(--c-border)] bg-[#f9f9f9] p-8">
                {sent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                      <Send size={22} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="font-display text-2xl font-black text-[var(--c-text)] mb-2">Message sent!</h3>
                    <p className="text-[var(--c-muted)] text-sm mb-6">Thanks for reaching out. We&apos;ll get back to you within 24 hours.</p>
                    <button onClick={() => { setSent(false); setForm({ name:'', email:'', subject:'', message:'' }) }}
                      className="text-sm font-semibold text-[#FF2D55] hover:underline">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Send a message</p>
                    <h3 className="font-display text-2xl font-black text-[var(--c-text)] mb-6">We&apos;ll reply fast</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Full Name <span className="text-[#FF2D55]">*</span></label>
                          <input name="name" value={form.name} onChange={handleChange} required
                            placeholder="Your name"
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-white text-sm text-[var(--c-text)] placeholder:text-[var(--c-dim)] outline-none focus:border-[#FF2D55]/50 focus:ring-2 focus:ring-[#FF2D55]/10 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Email <span className="text-[#FF2D55]">*</span></label>
                          <input name="email" type="email" value={form.email} onChange={handleChange} required
                            placeholder="you@email.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-white text-sm text-[var(--c-text)] placeholder:text-[var(--c-dim)] outline-none focus:border-[#FF2D55]/50 focus:ring-2 focus:ring-[#FF2D55]/10 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Subject</label>
                        <input name="subject" value={form.subject} onChange={handleChange}
                          placeholder="What is this about?"
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-white text-sm text-[var(--c-text)] placeholder:text-[var(--c-dim)] outline-none focus:border-[#FF2D55]/50 focus:ring-2 focus:ring-[#FF2D55]/10 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Message <span className="text-[#FF2D55]">*</span></label>
                        <textarea name="message" value={form.message} onChange={handleChange} required rows={5}
                          placeholder="Tell us how we can help..."
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--c-border)] bg-white text-sm text-[var(--c-text)] placeholder:text-[var(--c-dim)] outline-none focus:border-[#FF2D55]/50 focus:ring-2 focus:ring-[#FF2D55]/10 transition-all resize-none" />
                      </div>
                      <button type="submit" disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                        {loading ? (
                          <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" /></svg> Sending...</span>
                        ) : (
                          <><Send size={15} strokeWidth={2} /> Send Message</>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
