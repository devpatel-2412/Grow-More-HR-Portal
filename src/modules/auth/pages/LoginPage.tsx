import type { LucideIcon } from 'lucide-react';
import { Workflow, Zap, TrendingUp } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { Logo } from '../../../shared/components/ui/logo';
import { ThemeToggle } from '../../../shared/components/ui/theme-toggle';
import { APP_NAME } from '../../../shared/config/brand';
import banner from '../../../assets/banner.png';

// Colors below are deliberately raw values, not var(--foreground)/var(--muted-foreground) tokens —
// this panel is always a dark image background with light text, regardless of whether the app
// itself is in light or dark mode, so a theme-driven token would be wrong here specifically (in
// light mode --foreground resolves dark, which would make the text disappear against the image).
function BannerPoint({ icon: Icon, keyword, rest }: { icon: LucideIcon; keyword: string; rest: string }) {
  return (
    <p className="flex items-center gap-2 text-sm lg:text-base">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#6ee7a5]" aria-hidden="true" />
      <span>
        <span className="font-semibold text-[#6ee7a5]">{keyword}</span> <span className="text-white/90">{rest}</span>
      </span>
    </p>
  );
}

// This page intentionally does not use the shared <AuthLayout> — every other public auth page
// (forgot/reset password, 2FA, accept invite) keeps that simple centered-card layout unchanged.
// The split banner/form design below is scoped entirely to this one page and its own child
// components (LoginForm), per the redesign brief — nothing shared is modified.
export function LoginPage() {
  return (
    <div className="dot-grid relative flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-4 py-6 transition-colors duration-300 sm:py-10">
      <ThemeToggle className="fixed top-4 right-4 z-20 h-11 w-11 rounded-full shadow-[var(--shadow-card)] transition-colors duration-300" />

      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-elevated)] transition-colors duration-300 md:min-h-[560px]">
        {/* Banner — desktop/tablet only (md: 768px+); hidden on mobile per the redesign brief.
            bg-[#08261b] (a dark green sampled from the artwork) sits *behind* the image as a
            same-tone fallback — so if the image is ever still loading, or object-cover leaves a
            sub-pixel rounding gap at an odd viewport width, what shows through is on-brand dark
            green rather than the card's own (theme-dependent, near-black in dark mode) background. */}
        <div className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-[#08261b] p-8 md:flex lg:w-1/2 lg:p-10">
          <img src={banner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          {/* Contrast scrim: the illustration is detailed enough that plain white text can lose
              legibility depending what's directly behind it — a soft top/bottom darken keeps the
              header and bullet text readable while leaving the artwork's own middle third clear. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60" aria-hidden="true" />

          <div className="relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight text-white lg:text-[28px]">
              Grow <span className="text-[#6ee7a5]">More</span>
            </h1>
            <p className="mt-1.5 text-xs font-medium tracking-wide text-gray-300 lg:text-sm">
              Enterprise Operations &amp; Automation
            </p>
          </div>

          <div className="relative z-10 space-y-2.5">
            <div className="mb-3 h-1 w-10 rounded-full bg-[#6ee7a5]" />
            <BannerPoint icon={Workflow} keyword="Simplify" rest="processes." />
            <BannerPoint icon={Zap} keyword="Automate" rest="smarter." />
            <BannerPoint icon={TrendingUp} keyword="Scale" rest="faster." />
          </div>
        </div>

        {/* Form panel */}
        <div className="flex w-full flex-col justify-center px-6 py-8 transition-colors duration-300 sm:px-10 sm:py-10 md:w-[56%] lg:w-1/2 lg:px-14">
          <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
            <Logo className="mb-3 h-11 w-auto sm:h-12" />
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)] transition-colors duration-300 sm:text-2xl">
              Welcome back!
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)] transition-colors duration-300 sm:text-sm">
              Sign in to continue to your account
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-[11px] text-[var(--muted-foreground)] transition-colors duration-300">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
