"use client";
import React, { useState, useEffect, useRef } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconUser, IconMessageCircle, IconHelp, IconDashboard, IconBuilding, IconTrophy, IconAlertTriangle, IconSettings, IconBug, IconSettingsCheck, IconBell, IconLogout, IconDeviceDesktop } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import IconDart from "./icons/IconDart";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NavbarNew = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user } = useUserContext();
  const { logout } = useLogout();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [pathname, isMobileMenuOpen]);

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
    { name: "Klubbok", icon: IconUsers, href: "/search?type=clubs" },
    { name: "Tábla", icon: IconDeviceDesktop, href: "/board" },
    { name: "Keresés", icon: IconSearch, href: "/search" },
    { name: "Hogyan működik", icon: IconHelp, href: "/how-it-works" },
  ];

  const getUserInitials = () => {
    if (!user?.name) return user?.username?.charAt(0).toUpperCase() || "U";
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-card/85 backdrop-blur-xl shadow-lg shadow-black/40"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href={isAdminPage ? "/admin" : "/"} className="flex items-center gap-2 flex-shrink-0 group">
            <div className="relative">
              <Image 
                src="/tdarts_fav.svg" 
                width={40} 
                height={40} 
                alt="tDarts Logo"
                className="transition-transform group-hover:scale-110"
              />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {isAdminPage ? "Admin" : "tDarts"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm",
                    isActive 
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            {isAdminPage ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">
                    <IconLogout className="w-4 h-4" />
                    Kilépés
                  </Link>
                </Button>
              </>
            ) : user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/myclub">
                    <IconDart className="w-4 h-4" />
                    <span className="hidden xl:inline">Saját klub</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/feedback">
                    <IconBug className="w-4 h-4" />
                    <span className="hidden xl:inline">Hibabejelentés</span>
                  </Link>
                </Button>
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 px-2 lg:px-3"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    aria-controls="user-menu"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden xl:inline">{user.username}</span>
                  </Button>
                  <div
                    id="user-menu"
                    className={cn(
                      "absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-lg shadow-black/35 backdrop-blur-md transition-all duration-200",
                      "bg-card/95",
                      "before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-[2px] before:rounded-full before:bg-gradient-to-b before:from-primary/60 before:via-primary/30 before:to-transparent",
                      isUserMenuOpen
                        ? "pointer-events-auto opacity-100 translate-y-0"
                        : "pointer-events-none opacity-0 -translate-y-2"
                    )}
                    aria-hidden={!isUserMenuOpen}
                    style={{ backdropFilter: "blur(14px)" }}
                  >
                    <div
                      className={cn(
                        "overflow-hidden transition-[max-height] duration-200 ease-in-out",
                        isUserMenuOpen ? "max-h-96" : "max-h-0"
                      )}
                    >
                      <div className="space-y-1 p-2">
                        <div className="px-2 py-1.5 text-sm font-semibold">
                          <p className="text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Separator className="my-1" />
                        <Link
                          href="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                        >
                          <IconUser className="h-4 w-4" />
                          Profil
                        </Link>
                        <Link
                          href="/myclub"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                        >
                          <IconDart className="h-4 w-4" />
                          Saját klub
                        </Link>
                        {user.isAdmin && (
                          <>
                            <Separator className="my-1" />
                            <Link
                              href="/admin"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                            >
                              <IconSettings className="h-4 w-4" />
                              Admin
                            </Link>
                          </>
                        )}
                        <Separator className="my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
                        >
                          <IconLogout className="h-4 w-4" />
                          Kijelentkezés
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">
                    Bejelentkezés
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">
                    Regisztráció
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <IconMenu2 className="w-6 h-6" />
                  {!user && (
                    <Badge className="absolute -top-1 -right-1 w-2 h-2 p-0 bg-destructive" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex h-full w-full max-w-sm flex-col bg-card/95 px-4 py-6 shadow-2xl shadow-black/45 backdrop-blur"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Image src="/tdarts_fav.svg" width={32} height={32} alt="tDarts" />
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {isAdminPage ? "Admin" : "tDarts"}
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 flex-1 overflow-y-auto space-y-4">
                  {/* User Info */}
                  {user && (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.username}</p>
                        </div>
                        {user.isAdmin && (
                          <Badge variant="default">Admin</Badge>
                        )}
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Navigation Items */}
                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium",
                            isActive 
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-accent/10"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* User Actions */}
                  {isAdminPage ? (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                        <IconLogout className="w-5 h-5" />
                        Kilépés az Admin területről
                      </Link>
                    </Button>
                  ) : user ? (
                    <div className="space-y-2 pb-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconUser className="w-5 h-5" />
                          Profil
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <Link href="/myclub" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconDart className="w-5 h-5" />
                          Saját klub
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <Link href="/feedback" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconBug className="w-5 h-5" />
                          Hibabejelentés
                        </Link>
                      </Button>
                      {user.isAdmin && (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-2"
                          asChild
                        >
                          <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                            <IconSettings className="w-5 h-5" />
                            Admin
                          </Link>
                        </Button>
                      )}
                      <Separator />
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <IconLogout className="w-5 h-5" />
                        Kijelentkezés
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-4">
                      <Button 
                        className="w-full"
                        asChild
                      >
                        <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                          Bejelentkezés
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        asChild
                      >
                        <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                          Regisztráció
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarNew;

