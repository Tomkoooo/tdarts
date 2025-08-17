"use client";
import React, { useState, useEffect } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconX, IconUser, IconHelp, IconDashboard, IconBuilding, IconTrophy, IconAlertTriangle, IconSettings } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import IconDart from "./icons/IconDart";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {user} = useUserContext();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAdminPage = pathname?.startsWith('/admin');

  const navItems = isAdminPage ? [
    { name: "Dashboard", icon: IconDashboard, href: "/admin" },
    { name: "Felhasználók", icon: IconUsers, href: "/admin/users" },
    { name: "Klubok", icon: IconBuilding, href: "/admin/clubs" },
    { name: "Versenyek", icon: IconTrophy, href: "/admin/tournaments" },
    { name: "Hibák", icon: IconAlertTriangle, href: "/admin/errors" },
    { name: "Beállítások", icon: IconSettings, href: "/admin/settings" },
  ] : [
    { name: "Versenyek", icon: IconTournament, href: "/search" },
    { name: "Klubbok", icon: IconUsers, href: "/search" },
    { name: "Keresés", icon: IconSearch, href: "/search" },
    { name: "Hogyan működik", icon: IconHelp, href: "/how-it-works" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/10 backdrop-blur-md border-b border-white/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href={isAdminPage ? "/admin" : "/"} className="flex items-center space-x-2">
            <Image src="/tdarts_fav.svg" width={40} height={40} alt="tDarts Logo" />
            <span className="text-xl md:text-2xl font-bold text-gradient-red">
              {isAdminPage ? "tDarts Admin" : "tDarts"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors duration-200 font-medium"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            {isAdminPage ? (
              <div className="flex gap-2 items-center">
                <Link href="/" className="btn btn-outline btn-sm glass-button push-button">
                  Kilépés
                </Link>
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                    <div className="w-10 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                    <img
                          src={`https://avatar.iran.liara.run/username?username=${user?.name.split(' ')[0]}+${user?.name.split(' ')[1]}`}
                          alt="avatar"
                          loading="lazy"
                        />
                    </div>
                  </div>
                  <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg glass-card rounded-box w-52">
                    <li><Link href="/profile" className="text-gray-300 hover:text-red-400">Profil</Link></li>
                    <li><Link href="/" className="text-gray-300 hover:text-red-400">Főoldal</Link></li>
                    <li><Link href="/auth/logout" className="text-gray-300 hover:text-red-400">Kijelentkezés</Link></li>
                  </ul>
                </div>
              </div>
            ) : user ? (
              <div className="flex gap-2 items-center">
                <Link href="/profile" className="flex items-center space-x-2 btn btn-primary glass-button push-button">
                  <IconUser className="w-5 h-5" />
                  <span>{user.username}</span>
                </Link>
                <Link href="/myclub" className="flex items-center space-x-2 btn btn-outline push-button">
                <IconDart className="w-5 h-5" />
                <span>Saját klub</span>
                            </Link>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Link href="/auth/login" className="block glass-button push-button">
                  Bejelentkezés
                </Link>
                <Link href="/auth/register" className="block btn-outline  push-button button">
                  Regisztráció
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-gray-800/50 text-gray-300 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <IconX className="w-6 h-6" /> : <IconMenu2 className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 glass-card mt-2 mx-4 rounded-2xl p-6 shadow-2xl">
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
                  className="flex items-center space-x-3 text-gray-300 hover:text-red-400 transition-colors duration-200 p-3 rounded-lg hover:bg-white/5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
              {isAdminPage ? (
                <div className="flex flex-col gap-3">
                  <Link href="/" className="flex items-center justify-center space-x-2 btn btn-outline glass-button push-button w-full">
                    <span>Kilépés</span>
                  </Link>
                  <div className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-white/10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-300">{user?.name}</span>
                  </div>
                </div>
              ) : user ? (
                <div className="flex flex-col gap-3">
                <Link href="/profile" className="flex items-center justify-center space-x-2 btn btn-primary glass-button push-button w-full">
                  <IconUser className="w-5 h-5" />
                  <span>{user.username}</span>
                </Link>
                <Link href="/myclub" className="flex items-center justify-center space-x-2 btn btn-outline btn-primary push-button w-full">
                <IconDart className="w-5 h-5" />
                <span>Saját klub</span>
                            </Link>
              </div>
              ) : (
                <div>
                <Link
                  href="/auth/login"
                  className="block glass-button push-button w-full mt-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Bejelentkezés
                </Link>
                <Link href="/auth/login" onClick={()=>setIsMobileMenuOpen(false)} className="block btn btn-outline">
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
