'use client';

/**
 * Navbar · barra superior tipográfica
 * --------------------------------------------------------------
 * Fondo cream con borde inferior bronce sutil. Logo a la izquierda,
 * navegación tipográfica al centro, perfil/CTA a la derecha.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, Plus, Menu, X } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { getCurrentUser, signOut, type UserClaims } from '@/lib/auth';
import { API_URLS } from '@/lib/api';

type NavItem = { href: string; label: string; match?: (path: string) => boolean };

const ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', match: (p) => p === '/' || p === '/dashboard' },
  { href: '/estudios', label: 'Estudios' },
  { href: '/biblioteca', label: 'Biblioteca legal' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openUser, setOpenUser] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [user, setUser] = useState<UserClaims | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  const isActive = (item: NavItem) =>
    item.match ? item.match(pathname) : pathname.startsWith(item.href);

  const handleLogout = async () => {
    setOpenUser(false);
    if (API_URLS.login) await signOut(API_URLS.login);
    router.replace('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
    : (user?.email?.[0]?.toUpperCase() ?? 'L');

  return (
    <nav className="sticky top-0 z-40 bg-[#F8F5EE]/95 backdrop-blur-sm border-b border-[#E5DFD3]">
      {/* línea decorativa superior */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#A47148]/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[68px]">
          {/* logo */}
          <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo variant="ink" size="md" />
          </Link>

          {/* nav links */}
          <div className="hidden md:flex items-center gap-1">
            {ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 text-[13px] tracking-[0.04em] transition-colors ${
                    active
                      ? 'text-[#0B1F3A] font-medium'
                      : 'text-[#3F3F3F] hover:text-[#0B1F3A]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#A47148]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* right cluster */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/estudios/nuevo"
              className="btn-bronze inline-flex items-center gap-2 px-5 py-2 text-[12px] uppercase tracking-[0.14em] font-medium rounded-[2px]"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              Nuevo estudio
            </Link>

            <div className="relative">
              <button
                onClick={() => setOpenUser((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-[2px] hover:bg-[#FBF9F2] transition-colors cursor-pointer"
              >
                {user?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name ?? 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-[#E5DFD3]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0B1F3A] text-[#F8F5EE] flex items-center justify-center text-[11px] font-medium tracking-wider">
                    {initials}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#6B6B6B]" strokeWidth={1.5} />
              </button>

              {openUser && (
                <div
                  className="absolute right-0 mt-2 w-64 paper-card rounded-[2px] py-1 fade-up"
                  onMouseLeave={() => setOpenUser(false)}
                >
                  <div className="px-4 py-3 border-b border-[#E5DFD3]">
                    <p className="text-[13px] font-medium text-[#0B1F3A] truncate">
                      {user?.name ?? 'Sesion no iniciada'}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] truncate">
                      {user?.email ?? '—'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-[12px] text-[#3F3F3F] hover:bg-[#FBF9F2] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* mobile toggle */}
          <button
            onClick={() => setOpenMobile((v) => !v)}
            className="md:hidden p-2 text-[#0B1F3A] hover:bg-[#FBF9F2] rounded-[2px]"
            aria-label="Menú"
          >
            {openMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {openMobile && (
        <div className="md:hidden border-t border-[#E5DFD3] bg-[#FBF9F2] fade-up">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenMobile(false)}
                className={`block px-3 py-2.5 rounded-[2px] text-[14px] ${
                  isActive(item)
                    ? 'text-[#0B1F3A] bg-[#F8F5EE] font-medium'
                    : 'text-[#3F3F3F] hover:bg-[#F8F5EE]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/estudios/nuevo"
              onClick={() => setOpenMobile(false)}
              className="btn-bronze block text-center px-5 py-3 mt-3 text-[12px] uppercase tracking-[0.14em] font-medium rounded-[2px]"
            >
              + Nuevo estudio
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
