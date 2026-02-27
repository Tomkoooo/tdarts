"use client";
import React, { useState, useEffect } from "react";
import { IconSearch, IconTournament, IconUsers, IconMenu2, IconUser, IconHelp, IconSettings, IconBug, IconLogout, IconDeviceDesktop, IconChartBar, IconTicket, IconLanguage } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import IconDart from "./icons/IconDart";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, SupportedLocale, localePath, stripLocalePrefix } from "@/lib/seo";

const NavbarNew = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUserContext();
  const { logout } = useLogout();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  const languageOptions = [
    { code: "hu", label: "Magyar", enabled: true },
    { code: "en", label: "English", enabled: true },
    { code: "de", label: "Deutsch", enabled: true },
    { code: "sk", label: "Szlovák", enabled: false },
    { code: "ro", label: "Román", enabled: false },
    { code: "el", label: "Görög", enabled: false },
  ] as const;

  const maybeLocale = pathname?.split("/")[1];
  const currentLocale: SupportedLocale = SUPPORTED_LOCALES.includes(maybeLocale as SupportedLocale)
    ? (maybeLocale as SupportedLocale)
    : DEFAULT_LOCALE;

  const toLocalizedHref = (href: string): string => {
    if (/^https?:\/\//.test(href)) return href;
    const [pathPart, queryPart] = href.split("?");
    const localizedPath = localePath(pathPart || "/", currentLocale);
    return queryPart ? `${localizedPath}?${queryPart}` : localizedPath;
  };

  const switchLocale = (targetLocale: string) => {
    if (!SUPPORTED_LOCALES.includes(targetLocale as SupportedLocale)) return;
    const normalizedPath = stripLocalePrefix(pathname || "/");
    const targetPath = localePath(normalizedPath, targetLocale as SupportedLocale);
    const query = searchParams.toString();
    router.push(query ? `${targetPath}?${query}` : targetPath);
  };

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
    { name: "Versenyek", icon: IconTournament, href: "/search?tab=tournaments" },
    { name: "Klubok", icon: IconUsers, href: "/search?tab=clubs" },
    { name: isOnline ? "Tábla" : "Helyi Tábla (Offline)", icon: IconDeviceDesktop, href: "/board" },
    { name: "Keresés", icon: IconSearch, href: "/search" },
    { name: "Hogyan működik", icon: IconHelp, href: "/how-it-works" },
  ];

  const normalizedPath = stripLocalePrefix(pathname || "/");
  const currentSearchTab = searchParams.get("tab");

  const isNavItemActive = (href: string) => {
    const [itemPath, itemQuery] = href.split("?");
    if (normalizedPath !== (itemPath || "/")) {
      return false;
    }

    // Special handling for /search menu tabs:
    // - /search?tab=tournaments => active only on tab=tournaments
    // - /search?tab=clubs => active only on tab=clubs
    // - /search => active only when there is no tab (plain search)
    if ((itemPath || "/") === "/search") {
      const itemTab = new URLSearchParams(itemQuery || "").get("tab");
      if (itemTab) return currentSearchTab === itemTab;
      return !currentSearchTab;
    }

    return true;
  };



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
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="relative">
              <Image 
                src="/tdarts_fav.svg" 
                width={36} 
                height={36} 
                alt="tDarts Logo"
                className="transition-transform group-hover:scale-105"
              />
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              tDarts
            </span>
            {!isOnline && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider animate-pulse border border-destructive/20">
                Offline
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={toLocalizedHref(item.href)}
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
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <IconLanguage className="w-4 h-4" />
                  <span className="uppercase">{currentLocale}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {languageOptions.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    className={cn(
                      "flex items-center justify-between",
                      !lang.enabled && "opacity-60 cursor-not-allowed"
                    )}
                    disabled={!lang.enabled}
                    onClick={() => {
                      if (lang.enabled) switchLocale(lang.code);
                    }}
                  >
                    <span>{lang.label}</span>
                    {!lang.enabled && <span className="text-xs text-muted-foreground">Hamarosan</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {user ? (
              <>
                <Link href={toLocalizedHref("/myclub")}>
                  <Button variant={pathname === "/myclub" ? "secondary" : "ghost"} size="sm">
                    <IconDart className="w-4 h-4 mr-2" />
                    <span className="hidden xl:inline">Saját klub</span>
                  </Button>
                </Link>
                <Link href={toLocalizedHref("/feedback")}>
                  <Button variant={pathname === "/feedback" ? "secondary" : "ghost"} size="sm">
                    <IconBug className="w-4 h-4 mr-2" />
                    <span className="hidden xl:inline">Visszajelzés</span>
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
                      <Link href={toLocalizedHref("/profile")} className="cursor-pointer w-full flex items-center">
                        <IconUser className="mr-2 h-4 w-4" />
                        Profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={toLocalizedHref("/profile?tab=stats")} className="cursor-pointer w-full flex items-center">
                        <IconChartBar className="mr-2 h-4 w-4" />
                        Statisztika
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={toLocalizedHref("/profile?tab=tickets")} className="cursor-pointer w-full flex items-center">
                        <IconTicket className="mr-2 h-4 w-4" />
                        Hibajegyek
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={toLocalizedHref("/myclub")} className="cursor-pointer w-full flex items-center">
                        <IconDart className="mr-2 h-4 w-4" />
                        Saját klub
                      </Link>
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={toLocalizedHref("/admin")} className="cursor-pointer w-full flex items-center">
                            <IconSettings className="mr-2 h-4 w-4" />
                            Admin
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
                      Kijelentkezés
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={toLocalizedHref("/auth/login")}>
                    Bejelentkezés
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={toLocalizedHref("/auth/register")}>
                    Regisztráció
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
                  <SheetTitle className="flex items-center gap-2">
                    <Image src="/tdarts_fav.svg" width={28} height={28} alt="tDarts" />
                    <span className="text-lg font-bold text-foreground">
                      tDarts
                    </span>
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
                    <div className="px-3 pb-2 pt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Nyelv
                    </div>
                    <div className="space-y-1 pb-3">
                      <Select
                        value={currentLocale}
                        onValueChange={(value) => {
                          const selectedLang = languageOptions.find((lang) => lang.code === value);
                          if (selectedLang?.enabled) {
                            switchLocale(value);
                            setIsMobileMenuOpen(false);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Nyelv kiválasztása" />
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code} disabled={!lang.enabled}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{lang.label}</span>
                                {!lang.enabled && <span className="text-xs text-muted-foreground">Hamarosan</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator className="my-2" />
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isNavItemActive(item.href);
                      
                      return (
                        <Link
                          key={item.name}
                          href={toLocalizedHref(item.href)}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                            isActive 
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
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
                        <Link href={toLocalizedHref("/profile")} onClick={() => setIsMobileMenuOpen(false)}>
                          <IconUser className="w-4 h-4" />
                          Profil
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="w-full justify-start gap-2">
                        <Link href={toLocalizedHref("/profile?tab=stats")} className="cursor-pointer w-full flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconChartBar className="h-4 w-4" />
                          Statisztika
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="w-full justify-start gap-2">
                        <Link href={toLocalizedHref("/profile?tab=tickets")} className="cursor-pointer w-full flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                          <IconTicket className="h-4 w-4" />
                          Hibajegyek
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                         <Link href={toLocalizedHref("/myclub")} onClick={() => setIsMobileMenuOpen(false)}>
                          <IconDart className="w-4 h-4" />
                          Saját klub
                        </Link>
                      </Button>
                       <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <Link href={toLocalizedHref("/feedback")} onClick={() => setIsMobileMenuOpen(false)}>
                          <IconBug className="w-4 h-4" />
                          Visszajelzés
                        </Link>
                      </Button>
                      {user.isAdmin && (
                         <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-2"
                          asChild
                        >
                          <Link href={toLocalizedHref("/admin")} onClick={() => setIsMobileMenuOpen(false)}>
                            <IconSettings className="w-4 h-4" />
                            Admin
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
                        Kijelentkezés
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button className="w-full" asChild>
                        <Link href={toLocalizedHref("/auth/login")} onClick={() => setIsMobileMenuOpen(false)}>
                          Bejelentkezés
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href={toLocalizedHref("/auth/register")} onClick={() => setIsMobileMenuOpen(false)}>
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
