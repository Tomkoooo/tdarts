"use client";
import React, { useState, useEffect } from "react";
import { Search, Trophy, Users, Menu2, X, User, MessageCircle, Help, LayoutDashboard, Building, Target, AlertTriangle, Settings, Bug, SettingsCheck, Bell, LogOut, Monitor } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import IconDart from "./icons/IconDart";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

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
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { name: "Felhasználók", icon: Users, href: "/admin/users" },
    { name: "Klubok", icon: Building, href: "/admin/clubs" },
    { name: "Versenyek", icon: Trophy, href: "/admin/tournaments" },
    { name: "Hibák", icon: AlertTriangle, href: "/admin/errors" },
    { name: "Beállítások", icon: Settings, href: "/admin/settings" },
    { name: "Visszajelzés", icon: MessageCircle, href: "/admin/feedback" },
    { name: "Todos", icon: SettingsCheck, href: "/admin/todos" },
    { name: "Jelzések", icon: Bell, href: "/admin/announcements" },
  ] : [
    { name: "Versenyek", icon: Trophy, href: "/search?type=tournaments" },
    { name: "Klubbok", icon: Users, href: "/search?type=clubs" },
    { name: "Tábla", icon: Monitor, href: "/board" },
    { name: "Keresés", icon: Search, href: "/search" },
    { name: "Hogyan működik", icon: Help, href: "/how-it-works" },
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
                <Button asChild variant="outline" size="sm">
                  <Link href="/">
                    <LogOut className="w-4 h-4" />
                  </Link>
                </Button>
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
                <Button asChild size="sm" className="gap-1.5">
                  <Link href="/profile">
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">{user.username}</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/myclub">
                    <IconDart className="w-4 h-4" />
                    <span className="hidden xl:inline">Saját klub</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/feedback">
                    <Bug className="w-4 h-4" />
                    <span className="hidden xl:inline">Hibabejelentés</span>
                  </Link>
                </Button>
                {user.isAdmin && (
                  <Button asChild variant="outline" size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button asChild size="sm">
                  <Link href="/auth/login">Bejelentkezés</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/auth/register">Regisztráció</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden relative"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu2 className="w-6 h-6" />}
            {!user && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-destructive-foreground text-xs font-bold">!</span>
              </div>
            )}
          </Button>
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
                  <Button asChild variant="outline" className="w-full gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/">
                      <LogOut className="w-5 h-5"/>
                      <span>Kilépés</span>
                    </Link>
                  </Button>
                </div>
              ) : user ? (
                <div className="flex flex-col gap-3">
                <Button asChild className="w-full gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/profile">
                    <User className="w-5 h-5" />
                    <span>{user.username}</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/myclub">
                    <IconDart className="w-5 h-5" />
                    <span>Saját klub</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link href="/feedback" onClick={() => setIsMobileMenuOpen(false)}>
                    <Bug className="w-5 h-5" />
                    <span>Hibabejelentés</span>
                  </Link>
                </Button>
                {user.isAdmin && (
                  <Button asChild variant="outline" className="w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </div>
              ) : (
                <div className="space-y-3">
                <Button asChild className="w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/auth/login">Bejelentkezés</Link>
                </Button>
                <Button asChild variant="outline" className="w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/auth/register">Regisztráció</Link>
                </Button>
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
