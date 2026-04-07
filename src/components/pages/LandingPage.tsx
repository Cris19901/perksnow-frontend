import { useState } from 'react';
import { Button } from '../ui/button';
import {
  TrendingUp, Users, Zap, Shield, Play, Star,
  ArrowRight, Check, ChevronDown, ChevronUp,
  Smartphone, Wallet, Gift,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const PLANS = [
  {
    name: 'Daily',
    price: '₦300',
    period: '/day',
    highlight: false,
    perks: ['Earn up to ₦150/day', 'Post & reel upload', 'Withdraw earnings', '24h access'],
  },
  {
    name: 'Starter',
    price: '₦1,500',
    period: '/15 days',
    highlight: false,
    perks: ['Earn up to ₦150/day', 'Post & reel upload', 'Withdraw earnings', '15-day access'],
  },
  {
    name: 'Basic',
    price: '₦2,500',
    period: '/month',
    highlight: false,
    perks: ['Earn up to ₦150/day', 'Post & reel upload', 'Withdraw earnings', '30-day access'],
  },
  {
    name: 'Pro',
    price: '₦4,500',
    period: '/month',
    highlight: true,
    perks: ['Earn up to ₦300/day', 'Priority feed visibility', 'Withdraw earnings', '30-day access', 'Pro badge'],
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: <Smartphone className="w-6 h-6" />,
    title: 'Sign Up & Subscribe',
    body: 'Create your free account in 60 seconds. Pick a plan that fits you — from ₦300/day to ₦4,500/month.',
  },
  {
    step: '02',
    icon: <Play className="w-6 h-6" />,
    title: 'Scroll, Post & Engage',
    body: 'Watch reels, like posts, follow creators, and drop comments. Every genuine action earns you points.',
  },
  {
    step: '03',
    icon: <Wallet className="w-6 h-6" />,
    title: 'Convert Points to Cash',
    body: 'Once your points mature (7 days), convert them to naira and withdraw straight to your bank account.',
  },
];

const FAQS = [
  {
    q: 'How exactly do I earn money on LavLay?',
    a: 'You earn points by engaging — watching reels, liking and commenting on posts, following other users, and posting your own content. Points mature after 7 days and can then be withdrawn as naira to any Nigerian bank account.',
  },
  {
    q: 'What is the minimum withdrawal amount?',
    a: 'The minimum withdrawal is ₦1,000. Once you have at least ₦1,000 in matured points, you can request a payout directly to your bank account.',
  },
  {
    q: 'Do I need to pay a subscription to withdraw?',
    a: 'Yes — an active subscription (Daily, Starter, Basic, or Pro) is required to withdraw earnings. The free account lets you browse but withdrawals are locked.',
  },
  {
    q: 'How long does a withdrawal take?',
    a: 'Withdrawals are typically processed within 24 hours on business days. You will receive an in-app notification once your transfer is complete.',
  },
  {
    q: 'Can I refer friends and earn extra?',
    a: 'Absolutely. Every friend who signs up using your referral link and activates a subscription earns you bonus points. The more you refer, the more you earn.',
  },
];

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-lg font-bold tracking-tight">LavLay</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('login')} className="text-sm">
              Log In
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm px-4"
              onClick={() => onNavigate('signup')}
            >
              Start Earning
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-pink-900 text-white">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-8 backdrop-blur-sm border border-white/20">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Nigeria's #1 Earn-While-You-Scroll Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6 max-w-4xl mx-auto">
            Scroll Social Media.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
              Get Paid in Naira.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            LavLay turns your daily social media habits into real cash. Like posts, watch reels,
            follow creators — and watch your points convert to naira you can withdraw to any Nigerian bank.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 font-bold text-base px-8 hover:from-yellow-300 hover:to-orange-300 shadow-xl"
              onClick={() => onNavigate('signup')}
            >
              Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white bg-white/10 hover:bg-white/20 text-base px-8"
              onClick={() => onNavigate('login')}
            >
              Log In
            </Button>
          </div>

          {/* Social proof strip */}
          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['A','B','C','D'].map(l => (
                  <div key={l} className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-[10px] font-bold border-2 border-purple-900 text-white">{l}</div>
                ))}
              </div>
              <span>10,000+ earning members</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              <span className="ml-1">4.9 rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Secure ₦ payouts</span>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 60L1440 60L1440 20C1200 60 720 0 0 40L0 60Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { val: '₦5,000',  label: 'Welcome bonus points' },
            { val: '₦150+',   label: 'Earn per day' },
            { val: '24hrs',   label: 'Withdrawal processing' },
            { val: '0%',      label: 'Withdrawal fee' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-700">{s.val}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-2">Simple 3-Step Process</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">How LavLay Works</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-4 left-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Step {item.step}
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-5 text-purple-600">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-2">Why Choose LavLay</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Built for Nigerians</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50', title: 'Real Naira Payouts', body: 'Convert points to actual naira. Withdraw directly to your GTB, Zenith, Access, OPay, Kuda or any other Nigerian bank.' },
              { icon: <Gift className="w-5 h-5 text-yellow-600" />, bg: 'bg-yellow-50', title: '₦5,000 Welcome Bonus', body: 'Every new member gets 5,000 bonus points on sign-up. Subscribe to unlock them and start your journey to withdrawal.' },
              { icon: <Users className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', title: 'Referral Rewards', body: 'Share your link. When friends subscribe, you both earn bonus points — unlimited times.' },
              { icon: <Play className="w-5 h-5 text-pink-600" />, bg: 'bg-pink-50', title: 'Reels & Short Videos', body: 'Watch trending Nigerian content — entertainment, news, finance, lifestyle — and earn while you enjoy.' },
              { icon: <Shield className="w-5 h-5 text-green-600" />, bg: 'bg-green-50', title: 'Secure & Transparent', body: 'Every point transaction and withdrawal is fully logged. You always know exactly what you\'ve earned and why.' },
              { icon: <Zap className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50', title: 'Instant Notifications', body: 'Get real-time alerts for earned points, withdrawal status, followers, comments and direct messages.' },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 bg-gradient-to-br from-gray-950 to-purple-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-purple-400 font-semibold text-sm uppercase tracking-widest mb-2">Subscription Plans</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Pick Your Plan, Start Earning</h2>
            <p className="text-white/60 mt-3 text-base">All plans unlock withdrawals. Cancel anytime.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 border transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-purple-600 to-pink-600 border-transparent shadow-2xl scale-105'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-white/60">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className={plan.highlight ? 'text-white' : 'text-white/80'}>{p}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-semibold ${
                    plan.highlight
                      ? 'bg-white text-purple-700 hover:bg-gray-100'
                      : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                  }`}
                  onClick={() => onNavigate('signup')}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-2">Real Members, Real Earnings</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">What Our Members Say</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: 'Chioma O.', city: 'Lagos', amount: '₦12,000', text: 'I was skeptical at first but after my first withdrawal I became a believer. I just use the app like Instagram and money hits my Kuda account.' },
              { name: 'Emeka N.', city: 'Abuja', amount: '₦8,500', text: 'Referred five friends and got bonus points on each. Plus I earn daily just by scrolling. This is the side hustle nobody is talking about.' },
              { name: 'Fatima B.', city: 'Kano', amount: '₦21,000', text: 'Three months in. Over ₦21k withdrawn. The Pro plan pays for itself in the first week if you stay active. 100% recommended.' },
            ].map(t => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.city}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg px-3 py-1.5 text-right">
                    <p className="text-xs text-gray-500">Total Withdrawn</p>
                    <p className="text-sm font-bold text-green-600">{t.amount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Common Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  className="w-full text-left flex items-center justify-between px-5 py-4 font-semibold text-gray-900 text-sm hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 bg-gradient-to-r from-purple-700 to-pink-600 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Start Earning Today — It's Free</h2>
          <p className="text-white/70 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Join thousands of Nigerians already converting their scroll time into real naira.
            Sign up in under 60 seconds.
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-700 font-bold text-base px-10 hover:bg-gray-100 shadow-xl"
            onClick={() => onNavigate('signup')}
          >
            Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <p className="text-white/50 text-xs mt-4">No credit card required · ₦5,000 welcome bonus on sign-up</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">L</span>
                </div>
                <span className="font-bold">LavLay</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Nigeria's earn-while-you-scroll social platform. Turn engagement into naira.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-900">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => onNavigate('signup')} className="hover:text-gray-800">Sign Up</button></li>
                <li><button onClick={() => onNavigate('login')} className="hover:text-gray-800">Log In</button></li>
                <li><button onClick={() => onNavigate('about')} className="hover:text-gray-800">About Us</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-900">Earning</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><span>Points System</span></li>
                <li><span>Referral Program</span></li>
                <li><span>Withdrawal Guide</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-900">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-800">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-800">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gray-800">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            © 2026 LavLay Nigeria. All rights reserved. · support@lavlay.com
          </div>
        </div>
      </footer>
    </div>
  );
}
