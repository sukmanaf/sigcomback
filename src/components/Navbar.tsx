'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pencil, Layers, ChevronDown, LogOut, Users, Key, User, Menu, X, MessageSquarePlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

interface NavbarProps {
  editMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
  onTematikChange?: (tematik: string) => void;
  activeTematik?: string;
  desaKode?: string;
}

const tematikItems = [
  { id: 'jenis_tanah', name: 'Jenis Tanah' },
  { id: 'kelas_tanah', name: 'Kelas Tanah' },
  { id: 'jenis_bangunan', name: 'Jenis Bangunan' },
  { id: 'kelas_bangunan', name: 'Kelas Bangunan' },
  { id: 'nilai_individu', name: 'Nilai Individu' },
  { id: 'nik', name: 'NIK' },
  { id: 'zona_nilai_tanah', name: 'Zona Nilai Tanah' },
  { id: 'ketetapan_per_buku', name: 'Ketetapan per Buku' },
  { id: 'status_pembayaran', name: 'Status Pembayaran' },
];

export default function Navbar({
  editMode = false,
  onEditModeChange,
  onTematikChange,
  activeTematik = '',
  desaKode = '',
}: NavbarProps) {
  const pathname = usePathname();
  const [tematikOpen, setTematikOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileTematikRef = useRef<HTMLDivElement>(null);
  const { user, logout, canEdit, canManageUsers } = useAuth();

  // Detect landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const menuItems = [
    { name: 'Map', href: '/map', icon: '🗺️' },
  ];

  const isDesaSelected = desaKode && desaKode.length >= 10;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check both desktop and mobile tematik refs
      const isInsideTematik =
        (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) ||
        (mobileTematikRef.current && mobileTematikRef.current.contains(event.target as Node));

      if (!isInsideTematik) {
        setTematikOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTematikClick = (id: string) => {
    if (!isDesaSelected) return;
    if (onTematikChange) {
      onTematikChange(id);
    }
    setTematikOpen(false);
    setMobileMenuOpen(false);
  };

  const handleChangePasswordClick = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    setShowChangePassword(true);
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    logout();
  };

  return (
    <>
      <nav className="bg-emerald-600 text-white shadow-lg relative">
        <div className="max-w-full px-4 py-3 landscape:py-1">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold">
              <span className="text-2xl md:text-3xl">🌍</span>
              <span className="hidden sm:inline">SmartMap</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${pathname === item.href
                    ? 'text-white font-semibold'
                    : 'text-emerald-100 hover:text-white'
                    }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}

              {/* User Management - Only for admin */}
              {canManageUsers && (
                <Link
                  href="/users"
                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${pathname === '/users'
                    ? 'text-white font-semibold'
                    : 'text-emerald-100 hover:text-white'
                    }`}
                >
                  <Users size={18} />
                  <span>Users</span>
                </Link>
              )}

              {/* Usulan Management - Only for admin/bapenda */}
              {(user?.role === 'admin' || user?.role === 'bapenda') && (
                <Link
                  href="/usulan"
                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${pathname === '/usulan'
                    ? 'text-white font-semibold'
                    : 'text-emerald-100 hover:text-white'
                    }`}
                >
                  <MessageSquarePlus size={18} />
                  <span>Usulan</span>
                </Link>
              )}

              {/* Tematik Dropdown */}
              {pathname === '/map' && onTematikChange && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => isDesaSelected && setTematikOpen(!tematikOpen)}
                    className={`flex items-center gap-2 px-3 py-2 transition-all ${!isDesaSelected
                      ? 'text-gray-400 cursor-not-allowed opacity-60'
                      : activeTematik
                        ? 'text-cyan-300 font-semibold'
                        : 'text-emerald-100 hover:text-white'
                      }`}
                    title={isDesaSelected ? 'Pilih layer tematik' : 'Pilih desa terlebih dahulu'}
                  >
                    <Layers size={18} />
                    <span>Tematik</span>
                    <ChevronDown size={16} className={`transition-transform ${tematikOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {tematikOpen && isDesaSelected && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-[1001]">
                      <div
                        className="py-2 overflow-y-auto"
                        style={{ maxHeight: isLandscape ? '200px' : '400px' }}
                      >
                        {tematikItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleTematikClick(item.id)}
                            className="w-full text-left px-4 text-sm transition-colors flex items-center gap-3 text-gray-300 hover:bg-slate-700 hover:text-white"
                            style={{ paddingTop: isLandscape ? '6px' : '10px', paddingBottom: isLandscape ? '6px' : '10px' }}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Mode Toggle */}
              {pathname === '/map' && onEditModeChange && canEdit && (
                <button
                  onClick={() => onEditModeChange(!editMode)}
                  className="flex items-center gap-2 px-3 py-2 text-emerald-100 hover:text-white transition-all"
                  title={editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                >
                  <Pencil size={18} />
                  <span>Edit</span>
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${editMode ? 'bg-amber-500' : 'bg-white/30'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}

              {/* User Menu Dropdown */}
              {user && (
                <div className="relative ml-2 pl-4 border-l border-emerald-500" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <div className="text-sm text-left hidden lg:block">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-emerald-200 text-xs capitalize">{user.role}</div>
                    </div>
                    <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-[1001]">
                      <div className="py-2">
                        <div className="px-4 py-2 border-b border-slate-700 lg:hidden">
                          <div className="font-semibold text-white">{user.name}</div>
                          <div className="text-gray-400 text-xs capitalize">{user.role}</div>
                        </div>
                        <button
                          onClick={handleChangePasswordClick}
                          className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 text-gray-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Key size={16} />
                          <span>Ganti Password</span>
                        </button>
                        <hr className="my-1 border-slate-700" />
                        <button
                          onClick={handleLogoutClick}
                          className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Controls - Right aligned */}
            <div className="flex md:hidden items-center gap-1 ml-auto">
              {/* Tematik Button for Mobile - Direct in navbar */}
              {pathname === '/map' && onTematikChange && (
                <div className="relative z-[1010]" ref={mobileTematikRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isDesaSelected) {
                        setTematikOpen(!tematikOpen);
                        setMobileMenuOpen(false);
                      }
                    }}
                    disabled={!isDesaSelected}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${!isDesaSelected
                      ? 'text-gray-400 opacity-50 cursor-not-allowed'
                      : activeTematik
                        ? 'text-cyan-300 bg-emerald-700'
                        : 'text-emerald-100 hover:bg-emerald-700'
                      }`}
                  >
                    <Layers size={16} />
                    <span>Tematik</span>
                    <ChevronDown size={14} className={`transition-transform ${tematikOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {tematikOpen && isDesaSelected && (
                    <div
                      className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-[1010]"
                    >
                      <div
                        className="py-1 overflow-y-auto"
                        style={{ maxHeight: isLandscape ? '200px' : '50vh' }}
                      >
                        {tematikItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleTematikClick(item.id)}
                            className={`w-full text-left px-4 text-sm transition-colors flex items-center gap-3 ${activeTematik === item.id
                              ? 'bg-cyan-600 text-white'
                              : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                              }`}
                            style={{ paddingTop: isLandscape ? '6px' : '10px', paddingBottom: isLandscape ? '6px' : '10px' }}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Toggle for Mobile - Compact */}
              {pathname === '/map' && onEditModeChange && canEdit && (
                <button
                  onClick={() => onEditModeChange(!editMode)}
                  className="p-2 text-emerald-100"
                  title={editMode ? 'Disable Edit' : 'Enable Edit'}
                >
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${editMode ? 'bg-amber-500' : 'bg-white/30'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}
            </div>

            {/* Mobile Menu Button - in separate ref */}
            <div className="flex md:hidden items-center gap-1" ref={mobileMenuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white hover:bg-emerald-700 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Mobile Menu Dropdown */}
              {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-emerald-700 border-t border-emerald-500 shadow-lg z-[1001]">
                  <div className="px-4 py-3 space-y-2">
                    {/* User Info */}
                    {user && (
                      <div className="flex items-center gap-3 pb-3 border-b border-emerald-600">
                        <div className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-emerald-200 text-xs capitalize">{user.role}</div>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    {menuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${pathname === item.href
                          ? 'bg-emerald-800 text-white'
                          : 'text-emerald-100 hover:bg-emerald-600'
                          }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    ))}

                    {/* Admin Users Link */}
                    {canManageUsers && (
                      <Link
                        href="/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${pathname === '/users'
                          ? 'bg-emerald-800 text-white'
                          : 'text-emerald-100 hover:bg-emerald-600'
                          }`}
                      >
                        <Users size={18} />
                        <span>Users</span>
                      </Link>
                    )}

                    {/* Admin Usulan Link */}
                    {(user?.role === 'admin' || user?.role === 'bapenda') && (
                      <Link
                        href="/usulan"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${pathname === '/usulan'
                          ? 'bg-emerald-800 text-white'
                          : 'text-emerald-100 hover:bg-emerald-600'
                          }`}
                      >
                        <MessageSquarePlus size={18} />
                        <span>Usulan</span>
                      </Link>
                    )}

                    {/* Account Actions */}
                    <div className="pt-2 border-t border-emerald-600 space-y-1">
                      <button
                        onClick={handleChangePasswordClick}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-emerald-100 hover:bg-emerald-600"
                      >
                        <Key size={18} />
                        <span>Ganti Password</span>
                      </button>
                      <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-300 hover:bg-red-900/30"
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}


