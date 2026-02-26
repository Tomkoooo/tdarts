"use client";
import React, { useState, useEffect } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconUser, IconHelp, IconSettings, IconBug, IconLogout, IconDeviceDesktop, IconChartBar, IconTicket } from "@tabler/icons-react";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import IconDart from "./icons/IconDart";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SmartAvatar } from "@/components/ui/smart-avatar";
import { Separator } from "@/components/ui/separator";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

const NavbarNew = () => {
  const t = useTranslations('Navbar');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUserContext();
  const { logout } = useLogout();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    //set initial scroll position
    setIsScrolled(window.scrollY > 20);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // const isAdminPage = pathname?.startsWith('/admin'); // User requested normal navbar on admin pages

  const navItems = [
    { name: t('tournaments'), icon: IconTournament, href: "/search?tab=tournaments" },
    { name: t('clubs'), icon: IconUsers, href: "/search?tab=clubs" },
    { name: isOnline ? t('board') : t('board_offline'), icon: IconDeviceDesktop, href: "/board" },
    { name: t('search'), icon: IconSearch, href: "/search" },
    { name: t('how_it_works'), icon: IconHelp, href: "/how-it-works" },
  ];



  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/95 backdrop-blur-sm border-border shadow-sm"
          : "bg-background/0 border-transparent shadow-none"
      )}
      style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="relative">
              <Image 
                src="/tdarts_fav.svg" 
                width={36} 
                height={36} 
                alt={t("tdarts_logo_wslq")}
                className="transition-transform group-hover:scale-105"
              />
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {t("tdarts_f0pi")}</span>
            {!isOnline && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider animate-pulse border border-destructive/20">
                {t('offline')}
              </span>
            )}
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
                    "flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium",
                    isActive 
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
            <LanguageSwitcher />
            {user ? (
              <>
                <Link href="/myclub">
                  <Button variant={pathname === "/myclub" ? "secondary" : "ghost"} size="sm">
                    <IconDart className="w-4 h-4 mr-2" />
                    <span className="hidden xl:inline">{t('my_club')}</span>
                  </Button>
                </Link>
                <Link href="/feedback">
                  <Button variant={pathname === "/feedback" ? "secondary" : "ghost"} size="sm">
                    <IconBug className="w-4 h-4 mr-2" />
                    <span className="hidden xl:inline">{t('feedback')}</span>
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
                      <SmartAvatar 
                        playerId={user._id} 
                        name={user.name || user.username} 
                        size="sm"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer w-full flex items-center">
                        <IconUser className="mr-2 h-4 w-4" />
                        {t('profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=stats" className="cursor-pointer w-full flex items-center">
                        <IconChartBar className="mr-2 h-4 w-4" />
                        {t('stats')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=tickets" className="cursor-pointer w-full flex items-center">
                        <IconTicket className="mr-2 h-4 w-4" />
                        {t('tickets')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/myclub" className="cursor-pointer w-full flex items-center">
                        <IconDart className="mr-2 h-4 w-4" />
                        {t('my_club')}
                      </Link>
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer w-full flex items-center">
                            <IconSettings className="mr-2 h-4 w-4" />
                            {t('admin')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => logout()}
                    >
                      <IconLogout className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">
                    {t('login')}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">
                    {t('register')}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <IconMenu2 className="h-6 w-6" />
                  {!user && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full max-w-xs flex-col px-4 py-6">
                <SheetHeader className="px-1 text-left">
                  <SheetTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Image src="/tdarts_fav.svg" width={28} height={28} alt={t("tdarts_f0pi")} />
                        <span className="text-lg font-bold text-foreground">
                        {t("tdarts_f0pi")}</span>
                    </div>
                    <LanguageSwitcher />
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 flex-1 overflow-y-auto">
                  {/* User Info Mobile */}
                  {user && (
                    <div className="mb-6 flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      <SmartAvatar 
                        playerId={user._id} 
                        name={user.name || user.username} 
                        size="md"
                      />
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.username}</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Items Mobile */}
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
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                            isActive 
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <Separator className="my-6" />

                  {/* User Actions Mobile */}
                  {user ? (
                    <div className="space-y-2">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconUser className="w-4 h-4" />
                          {t('profile')}
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="w-full justify-start gap-2">
                        <Link href="/profile?tab=stats" className="cursor-pointer w-full flex items-center">
                          <IconChartBar className="h-4 w-4" />
                          {t('stats')}
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="w-full justify-start gap-2">
                        <Link href="/profile?tab=tickets" className="cursor-pointer w-full flex items-center">
                          <IconTicket className="h-4 w-4" />
                          {t('tickets')}
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                         <Link href="/myclub" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconDart className="w-4 h-4" />
                          {t('my_club')}
                        </Link>
                      </Button>
                       <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <Link href="/feedback" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconBug className="w-4 h-4" />
                          {t('feedback')}
                        </Link>
                      </Button>
                      {user.isAdmin && (
                         <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-2"
                          asChild
                        >
                          <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                            <IconSettings className="w-4 h-4" />
                            {t('admin')}
                          </Link>
                        </Button>
                      )}
                      <Separator className="my-2" />
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <IconLogout className="w-4 h-4" />
                        {t('logout')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button className="w-full" asChild>
                        <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                          {t('login')}
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                          {t('register')}
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
