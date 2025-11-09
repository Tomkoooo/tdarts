"use client";
import React, { useState, useEffect } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconUser, IconMessageCircle, IconHelp, IconDashboard, IconBuilding, IconTrophy, IconAlertTriangle, IconSettings, IconBug, IconSettingsCheck, IconBell, IconLogout, IconDeviceDesktop } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import IconDart from "./icons/IconDart";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NavbarNew = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUserContext();
  const { logout } = useLogout();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
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
          ? "bg-card/85 backdrop-blur-xl shadow-[0_10px_40px_-15px_oklch(51%_0.18_16_/0.45)]"
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
                      ? "bg-primary text-primary-foreground shadow-[0_2px_8px_0_oklch(51%_0.18_16_/_0.3)]" 
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
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 px-2 lg:px-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-sm">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 border-0 bg-card/95 shadow-xl backdrop-blur-md"
                  >
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <IconUser className="w-4 h-4 mr-2" />
                        Profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/myclub" className="cursor-pointer">
                        <IconDart className="w-4 h-4 mr-2" />
                        Saját klub
                      </Link>
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer">
                            <IconSettings className="w-4 h-4 mr-2" />
                            Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                      <IconLogout className="w-4 h-4 mr-2" />
                      Kijelentkezés
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                className="w-full max-w-sm border-0 bg-card/95 px-4 py-6 shadow-2xl backdrop-blur"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Image src="/tdarts_fav.svg" width={32} height={32} alt="tDarts" />
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {isAdminPage ? "Admin" : "tDarts"}
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
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
                              ? "bg-primary text-primary-foreground shadow-[0_2px_8px_0_oklch(51%_0.18_16_/_0.3)]" 
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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

