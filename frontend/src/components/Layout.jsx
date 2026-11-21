import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Show, SignInButton, UserButton } from "@clerk/react";
import { Bookmark, Menu, ShieldCheck, LifeBuoy, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useApp } from "@/context/AppContext";
import LangSwitcher from "@/components/LangSwitcher";

const Logo = ({ t }) => (
  <Link to="/" data-testid="brand-home-link" className="press flex items-center gap-2.5 rounded-full py-1 pr-2">
    <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-[#C6F432] font-display text-lg font-bold text-[#0B0B0C]">S</span>
    <span className="font-display text-lg font-semibold text-white">{t("common.appName")}</span>
  </Link>
);

function NavLinks({ t, me, onClick, vertical }) {
  const links = [
    { to: "/saved", label: t("common.mySaved"), icon: Bookmark, id: "nav-saved" },
    { to: "/help", label: t("common.help"), icon: LifeBuoy, id: "nav-help" },
    { to: "/privacy", label: t("common.privacy"), icon: Lock, id: "nav-privacy" },
    ...(me?.role === "admin" ? [{ to: "/admin", label: t("common.admin"), icon: ShieldCheck, id: "admin-portal-nav-btn" }] : []),
  ];
  return links.map(({ to, label, icon: Icon, id }) => (
    <NavLink key={to} to={to} onClick={onClick} data-testid={id}
      className={({ isActive }) => `press flex min-h-[44px] items-center gap-2 rounded-full px-3.5 text-sm font-medium ${vertical ? "text-[#0B0B0C] hover:bg-black/5 text-base" : "text-white/75 hover:text-white hover:bg-white/5"} ${isActive ? (vertical ? "bg-black/5" : "text-white bg-white/10") : ""}`}>
      <Icon className="h-4 w-4" aria-hidden />{label}
    </NavLink>
  ));
}

function Header() {
  const { t, me, saved } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B0C]/95 backdrop-blur-xl">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-[#C6F432] focus:px-4 focus:py-2 focus:text-black">{t("common.skipToContent")}</a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo t={t} />
        <nav aria-label={t("a11y.mainNav")} className="ml-4 hidden items-center gap-1 lg:flex"><NavLinks t={t} me={me} /></nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitcher />
          <div className="hidden sm:block">
            <Show when="signed-out"><SignInButton><button data-testid="header-sign-in-btn" className="btn-ghost-dark min-h-[40px] text-sm">{t("common.signIn")}</button></SignInButton></Show>
          </div>
          <Show when="signed-in"><div data-testid="header-user-button" className="grid h-10 w-10 place-items-center"><UserButton /></div></Show>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu-btn" aria-label={t("a11y.openMenu")} className="press relative grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/10 lg:hidden">
                <Menu className="h-5 w-5" />
                {saved.length > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#C6F432]" aria-hidden />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-white">
              <SheetTitle className="font-display">{t("common.menu")}</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1" aria-label={t("a11y.mainNav")}>
                <NavLinks t={t} me={me} vertical onClick={() => setOpen(false)} />
                <Show when="signed-out"><SignInButton><button data-testid="mobile-sign-in-btn" className="btn-ink mt-4">{t("common.signIn")}</button></SignInButton></Show>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useApp();
  return (
    <footer className="bg-[#0B0B0C] text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-md text-sm">{t("common.footerNote")}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/help" data-testid="footer-help-link" className="press rounded-full px-3 py-2 hover:text-white">{t("common.help")}</Link>
          <Link to="/privacy" data-testid="footer-privacy-link" className="press rounded-full px-3 py-2 hover:text-white">{t("common.privacy")}</Link>
          <Link to="/saved" data-testid="footer-saved-link" className="press rounded-full px-3 py-2 hover:text-white">{t("common.mySaved")}</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <motion.main id="main" key={pathname} className="flex-1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}
