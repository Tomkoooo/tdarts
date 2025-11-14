"use client";
import React, { useState, useEffect } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconX, IconUser, IconMessageCircle, IconHelp, IconDashboard, IconBuilding, IconTrophy, IconAlertTriangle, IconSettings, IconBug, IconSettingsCheck, IconBell, IconLogout, IconDeviceDesktop } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import IconDart from "./icons/IconDart";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {user} = useUserContext();
  const {logout} = useLogout();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const navbar = target.closest('nav');
      
      if (isMobileMenuOpen && !navbar) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const isAdminPage = pathname?.startsWith('/admin');

  const navItems = isAdminPage ? [
    { name: "Dashboard", icon: IconDashboard, href: "/admin" },
    { name: "Felhasználók", icon: IconUsers, href: "/admin/users" },
    { name: "Klubok", icon: IconBuilding, href: "/admin/clubs" },
    { name: "Versenyek", icon: IconTrophy, href: "/admin/tournaments" },
    { name: "Hibák", icon: IconAlertTriangle, href: "/admin/errors" },
    { name: "Beállítások", icon: IconSettings, href: "/admin/settings" },
    { name: "Visszajelzés", icon: IconMessageCircle, href: "/admin/feedback" },
    { name: "Todos", icon: IconSettingsCheck, href: "/admin/todos" },
    { name: "Jelzések", icon: IconBell, href: "/admin/announcements" },
  ] : [
    { name: "Versenyek", icon: IconTournament, href: "/search?type=tournaments" },
    { name: "Klubok", icon: IconUsers, href: "/search?type=clubs" },
    { name: "Tábla", icon: IconDeviceDesktop, href: "/board" },
    { name: "Keresés", icon: IconSearch, href: "/search" },
    { name: "Hogyan működik", icon: IconHelp, href: "/how-it-works" },

  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen ? "bg-gradient-to-r from-white/10 via-white/15 to-white/10 backdrop-blur-2xl border-white/20 shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20 gap-4">
          {/* Logo */}
          <Link href={isAdminPage ? "/admin" : "/"} className="flex items-center space-x-2 flex-shrink-0">
            <Image src="/tdarts_fav.svg" width={40} height={40} alt="tDarts Logo" />
            <span className="text-xl md:text-2xl font-bold text-primary">
              {isAdminPage ? "" : "tDarts"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8 flex-1 justify-center">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-1.5 text-gray-300 hover:text-red-400 transition-colors duration-200 font-medium whitespace-nowrap"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm lg:text-base">{item.name}</span>
              </Link>
            ))}
          </div>

          {/* User Actions - Right Side */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {isAdminPage ? (
              <>
                <Link href="/" className="btn btn-sm glass-button push-button">
                  <IconLogout/>
                </Link>
                <div className="dropdown dropdown-end">
                  <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-box w-52">
                    <li><Link href="/profile" className="text-white hover:text-red-300">Profil</Link></li>
                    <li><Link href="/" className="text-white hover:text-red-300">Főoldal</Link></li>
                    <li><button onClick={logout} className="text-white hover:text-red-300 w-full text-left">Kijelentkezés</button></li>
                  </ul>
                </div>
              </>
            ) : user ? (
              <>
                <Link href="/profile" className="flex items-center space-x-1.5 btn btn-sm btn-primary glass-button push-button">
                  <IconUser className="w-4 h-4" />
                  <span className="hidden lg:inline">{user.username}</span>
                </Link>
                <Link href="/myclub" className="flex items-center space-x-1.5 btn btn-sm btn-outline push-button">
                  <IconDart className="w-4 h-4" />
                  <span className="hidden xl:inline">Saját klub</span>
                </Link>
                <Link href="/feedback" className="flex items-center space-x-1.5 btn btn-sm btn-outline push-button">
                  <IconBug className="w-4 h-4" />
                  <span className="hidden xl:inline">Hibabejelentés</span>
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" className="flex items-center justify-center space-x-1.5 btn btn-sm btn-outline glass-button push-button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-sm glass-button push-button">
                  Bejelentkezés
                </Link>
                <Link href="/auth/register" className="btn btn-sm btn-outline push-button">
                  Regisztráció
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-gray-800/50 text-gray-300 hover:text-white transition-colors relative"
          >
            {isMobileMenuOpen ? <IconX className="w-6 h-6" /> : <IconMenu2 className="w-6 h-6" />}
            {!user && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
                    <div className="md:hidden top-full left-0 right-0 p-2 mt-2 mx-4 rounded-2xl max-h-[85vh] overflow-y-auto">

            {/* Overlay to close menu when clicking outside */}
            <div 
              className="fixed inset-0 -z-10" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 text-gray-300 hover:text-red-400 transition-colors duration-200 p-3 rounded-lg hover:bg-white/10 font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
              {isAdminPage ? (
                <div className="flex flex-col gap-3 pt-2 border-t border-gray-700/50">
                  <div className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-white/10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-300">{user?.name}</span>
                  </div>
                  <Link 
                    href="/"
                    onClick={() => {
                      
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 btn btn-outline glass-button push-button w-full"
                  >
                    <IconLogout className="w-5 h-5"/>
                    <span>Kilépés</span>
                  </Link>
                </div>
              ) : user ? (
                <div className="flex flex-col gap-3">
                <Link 
                  href="/profile" 
                  className="flex items-center justify-center space-x-2 btn btn-primary glass-button push-button w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <IconUser className="w-5 h-5" />
                  <span>{user.username}</span>
                </Link>
                <Link 
                  href="/myclub" 
                  className="flex items-center justify-center space-x-2 btn btn-outline btn-primary push-button w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                <IconDart className="w-5 h-5" />
                <span>Saját klub</span>
                </Link>
                <Link href="/feedback" className="flex items-center space-x-2 btn btn-outline push-button">
                  <IconBug className="w-5 h-5" />
                  <span>Hibabejelentés</span>
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" className="flex items-center justify-center space-x-2 btn btn-outline glass-button push-button w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
              </div>
              ) : (
                <div>
                <Link
                  href="/auth/login"
                  className="glass-button justify-center flex push-button w-full mt-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Bejelentkezés
                </Link>
                <Link 
                  href="/auth/register" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="block btn btn-outline push-button w-full mt-2"
                >
                  Regisztráció
                </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
