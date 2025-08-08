"use client";
import React, { useState, useEffect } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconX, IconUser, IconHelp } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import IconDart from "./icons/IconDart";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {user} = useUserContext()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Versenyek", icon: IconTournament, href: "/search" },
    { name: "Klubbok", icon: IconUsers, href: "/search" },
    { name: "Keresés", icon: IconSearch, href: "/search" },
    { name: "Hogyan működik", icon: IconHelp, href: "/how-it-works" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-gray-900/80" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/tdarts_fav.svg" width={40} height={40} alt="tDarts Logo" />
            <span className="text-xl md:text-2xl font-bold text-gradient-red">tDarts</span>
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
            {user ? (
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
              {user ? (
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
