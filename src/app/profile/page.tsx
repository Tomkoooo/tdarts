"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  IconUser, 
  IconMail, 
  IconLock, 
  IconKey, 
  IconEye, 
  IconEyeOff, 
  IconLogout, 
  IconUsers, 
  IconCircleCheck,
  IconCircleX,
  IconEdit,
  IconShieldLock,
  IconTrophy,
  IconTarget,
  IconChartBar,
  IconCalendar,
  IconSword,
  IconTrendingUp,
  IconRefresh
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import { useUserContext } from "@/hooks/useUser";
import { useLogout } from "@/hooks/useLogout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Label from "@/components/ui/Label";
import Link from "next/link";
import LegsViewModal from "@/components/tournament/LegsViewModal";

const updateProfileSchema = z.object({
  email: z.string().email("Érvényes email címet adj meg").optional(),
  name: z.string().min(1, "Név kötelező").optional(),
  username: z.string().min(1, "Felhasználónév kötelező").optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // Only validate password if it's provided
  if (data.password && data.password.length > 0) {
    if (data.password.length < 6) {
      return false;
    }
    if (!data.confirmPassword) {
      return false;
    }
    if (data.password !== data.confirmPassword) {
      return false;
    }
  }
  return true;
}, {
  message: "A jelszavak nem egyeznek vagy a jelszó túl rövid",
  path: ["confirmPassword"],
});

const verifyEmailSchema = z.object({
  code: z.string().min(1, "Verifikációs kód kötelező"),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, setUser } = useUserContext();
  const { logout } = useLogout();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [showLegsModal, setShowLegsModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      email: user?.email,
      name: user?.name,
      username: user?.username,
    },
  });

  const {
    register: registerVerify,
    handleSubmit: handleVerifySubmit,
    formState: { errors: verifyErrors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    } else {
      setNeedsEmailVerification(!user.isVerified);
      resetProfileForm({
        email: user.email,
        name: user.name,
        username: user.username,
      });
      
      // Load player stats
      loadPlayerStats();
    }
  }, [user, router, resetProfileForm]);

  const loadPlayerStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await axios.get('/api/profile/player-stats');
      if (response.data.success) {
        setPlayerStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading player stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    setIsLoading(true);
    try {
      // Only include password if it's provided and not empty
      const updateData: any = {
        email: data.email,
        name: data.name,
        username: data.username,
      };
      
      // Only add password if it's provided and not empty
      if (data.password && data.password.trim().length > 0) {
        updateData.password = data.password;
      }

      await toast.promise(
        axios.post("/api/profile/update", updateData, {
          headers: { "Content-Type": "application/json" },
        }),
        {
          loading: "Profil frissítése folyamatban...",
          success: () => {
            setUser({
              ...user!,
              email: data.email || user!.email,
              name: data.name || user!.name,
              username: data.username || user!.username,
              isVerified: data.email && data.email !== user!.email ? false : user!.isVerified,
            });
            setNeedsEmailVerification(data.email !== user!.email && !!data.email);
            return "Profil sikeresen frissítve!";
          },
          error: (error) => error.response?.data.error || "Hiba történt a profil frissítése során",
        }
      );
    } catch (error) {
      console.error("Update profile error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySubmit = async (data: VerifyEmailFormData) => {
    setIsLoading(true);
    try {
      await toast.promise(
        axios.post("/api/profile/verify-email", data, {
          headers: { "Content-Type": "application/json" },
        }),
        {
          loading: "Email verifikáció folyamatban...",
          success: () => {
            setUser({ ...user!, isVerified: true });
            setNeedsEmailVerification(false);
            return "Email sikeresen ellenőrizve!";
          },
          error: (error) => error.response?.data.error || "Hiba történt az email ellenőrzése során",
        }
      );
    } catch (error) {
      console.error("Verify email error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);
    try {
      await toast.promise(
        axios.post("/api/profile/resend-verification", {}, {
          headers: { "Content-Type": "application/json" },
        }),
        {
          loading: "Ellenőrző kód újraküldése...",
          success: "Ellenőrző kód sikeresen újraküldve!",
          error: (error) => error.response?.data.error || "Hiba történt az ellenőrző kód újraküldése során",
        }
      );
    } catch (error) {
      console.error("Resend verification code error:", error);
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleViewLegs = (match: any) => {
    setSelectedMatch(match);
    setShowLegsModal(true);
  };

  const handleCloseLegsModal = () => {
    setShowLegsModal(false);
    setSelectedMatch(null);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      toast.success("Sikeresen kijelentkeztél");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Hiba történt a kijelentkezés során");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
        <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="text-center">
          <span className="loading loading-spinner w-8 h-8 text-primary"></span>
          <p className="mt-4 text-lg text-base-content">Felhasználói adatok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-4 pt-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full border border-primary/20 mb-4">
            <IconUser className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Profil kezelés</h1>
          <p className="text-base-content/70 text-sm md:text-base">Kezeld a fiókod beállításait és preferenciáit</p>
        </div>

        {/* Jelenlegi információk szekció */}
        <section className="mb-8">
          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
                <IconUser className="w-5 h-5" />
                Jelenlegi információk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <Label>
                    <IconMail className="w-4 h-4" />
                    Email cím
                  </Label>
                  <div className="relative">
                    <Input
                      value={user.email}
                      readOnly
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {user.isVerified ? (
                        <div className="badge badge-success gap-1">
                          <IconCircleCheck className="w-3 h-3" />
                          Ellenőrzött
                        </div>
                      ) : (
                        <div className="badge badge-error gap-1">
                          <IconCircleX className="w-3 h-3" />
                          Nem ellenőrzött
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="form-control">
                  <Label>
                    <IconUser className="w-4 h-4" />
                    Teljes név
                  </Label>
                  <Input
                    value={user.name}
                    readOnly
                  />
                </div>
                <div className="form-control">
                  <Label>
                    <IconUser className="w-4 h-4" />
                    Felhasználónév
                  </Label>
                  <Input
                    value={user.username}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Profil szerkesztés szekció */}
        <section className="mb-8">
          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
                <IconEdit className="w-5 h-5" />
                Profil szerkesztése
              </h2>
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <Label>
                  <IconMail className="w-4 h-4" />
                  Új email cím
                </Label>
                <Input
                  {...registerProfile("email")}
                  type="email"
                  placeholder="email@example.com"
                  disabled={isLoading}
                />
                {profileErrors.email && (
                  <p className="text-error text-sm mt-1">{profileErrors.email.message}</p>
                )}
              </div>
              <div className="form-control">
                <Label>
                  <IconUser className="w-4 h-4" />
                  Teljes név
                </Label>
                <Input
                  {...registerProfile("name")}
                  type="text"
                  placeholder="Teljes név"
                  disabled={isLoading}
                />
                {profileErrors.name && (
                  <p className="text-error text-sm mt-1">{profileErrors.name.message}</p>
                )}
              </div>
              <div className="form-control">
                <Label>
                  <IconUser className="w-4 h-4" />
                  Felhasználónév
                </Label>
                <Input
                  {...registerProfile("username")}
                  type="text"
                  placeholder="Felhasználónév"
                  disabled={isLoading}
                />
                {profileErrors.username && (
                  <p className="text-error text-sm mt-1">{profileErrors.username.message}</p>
                )}
              </div>
              <div className="form-control">
                <Label>
                  <IconLock className="w-4 h-4" />
                  Új jelszó
                </Label>
                <div className="relative">
                  <Input
                    {...registerProfile("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm"
                    disabled={isLoading}
                  >
                    {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
                {profileErrors.password && (
                  <p className="text-error text-sm mt-1">{profileErrors.password.message}</p>
                )}
              </div>
              <div className="form-control">
                <Label>
                  <IconLock className="w-4 h-4" />
                  Jelszó megerősítése
                </Label>
                <div className="relative">
                  <Input
                    {...registerProfile("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
                {profileErrors.confirmPassword && (
                  <p className="text-error text-sm mt-1">{profileErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>
                <button type="submit" className="w-full btn btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner w-4 h-4"></span>
                      Frissítés...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <IconUser className="w-4 h-4" />
                      Profil frissítése
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Email verifikáció szekció */}
        {needsEmailVerification && (
          <section className="mb-8">
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
                  <IconKey className="w-5 h-5" />
                  Email ellenőrzés
                </h2>
                <div className="alert alert-warning bg-warning/10 border-warning/20 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-warning-content">
                        Az email címed ellenőrzésre szorul. Kérlek add meg az emailben kapott ellenőrző kódot.
                      </p>
                    </div>
                    <button
                      onClick={handleResendCode}
                      disabled={isResendingCode}
                      className="btn btn-sm btn-outline btn-warning ml-4 flex-shrink-0"
                    >
                      {isResendingCode ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Küldés...
                        </>
                      ) : (
                        <>
                          <IconRefresh className="w-4 h-4" />
                          Újraküldés
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <form onSubmit={handleVerifySubmit(onVerifySubmit)} className="space-y-4">
              <div className="form-control">
                <Label>
                  <IconKey className="w-4 h-4" />
                  Ellenőrző kód
                </Label>
                <Input
                  {...registerVerify("code")}
                  type="text"
                  placeholder="Add meg az ellenőrző kódot"
                  disabled={isLoading}
                />
                {verifyErrors.code && (
                  <p className="text-error text-sm mt-1">{verifyErrors.code.message}</p>
                )}
              </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner w-4 h-4"></span>
                        Ellenőrzés...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <IconKey className="w-4 h-4" />
                        Email ellenőrzése
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* Játékos statisztikák szekció */}
        {playerStats && playerStats.hasPlayer && (
          <section className="mb-8">
            <div className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-xl font-semibold text-base-content mb-4 flex items-center gap-2">
                  <IconTrophy className="w-5 h-5" />
                  Játékos statisztikák
                </h2>
                
                {isLoadingStats ? (
                  <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </div>
                ) : (
                  <>
                    {/* Összefoglaló statisztikák */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="stat bg-primary/10 rounded-lg">
                        <div className="stat-figure text-primary">
                          <IconTarget className="w-8 h-8" />
                        </div>
                        <div className="stat-title">MMR</div>
                        <div className="stat-value text-primary">{playerStats.player.stats.mmr}</div>
                        <div className={`stat-desc ${playerStats.player.stats.mmrTier.color}`}>
                          {playerStats.player.stats.mmrTier.name}
                        </div>
                      </div>
                      
                      <div className="stat bg-info/10 rounded-lg">
                        <div className="stat-figure text-info">
                          <IconTrendingUp className="w-8 h-8" />
                        </div>
                        <div className="stat-title">Globális rang</div>
                        <div className="stat-value text-info">#{playerStats.player.stats.globalRank}</div>
                        <div className="stat-desc">Összes játékosból</div>
                      </div>
                      
                      <div className="stat bg-accent/10 rounded-lg">
                        <div className="stat-figure text-accent">
                          <IconCalendar className="w-8 h-8" />
                        </div>
                        <div className="stat-title">Tornák</div>
                        <div className="stat-value text-accent">{playerStats.summary.totalTournaments}</div>
                        <div className="stat-desc">Összesen</div>
                      </div>
                      
                      <div className="stat bg-success/10 rounded-lg">
                        <div className="stat-figure text-success">
                          <IconSword className="w-8 h-8" />
                        </div>
                        <div className="stat-title">Győzelem %</div>
                        <div className="stat-value text-success">{playerStats.summary.winRate}%</div>
                        <div className="stat-desc">{playerStats.summary.wins}W/{playerStats.summary.losses}L</div>
                      </div>
                    </div>

                    {/* Részletes statisztikák */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <IconChartBar className="w-5 h-5" />
                          Részletes statisztikák
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Átlag:</span>
                            <span className="font-semibold">{playerStats.player.stats.avg?.toFixed(1) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>180s:</span>
                            <span className="font-semibold">{playerStats.player.stats.total180s || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Legjobb helyezés:</span>
                            <span className="font-semibold">{playerStats.player.stats.bestPosition || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Átlagos helyezés:</span>
                            <span className="font-semibold">{playerStats.player.stats.averagePosition?.toFixed(1) || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Max kiszálló:</span>
                            <span className="font-semibold">{playerStats.player.stats.highestCheckout || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <IconCalendar className="w-5 h-5" />
                          Legutóbbi tornák
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {playerStats.tournamentHistory.map((tournament: any, index: number) => (
                            <div key={index} className="p-3 bg-base-200 rounded-lg">
                              <div className="font-semibold text-sm flex justify-between items-start">
                                <span className="flex-1 mr-2">{tournament.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-base-content/60">
                                    {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                                  </span>
                                  <Link 
                                    href={`/tournaments/${tournament.tournamentId}`}
                                    className="btn btn-xs btn-primary"
                                  >
                                    Megnyitás
                                  </Link>
                                </div>
                              </div>
                              <div className="text-xs text-base-content/70 mt-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <IconTrophy size={14} className="text-warning" />
                                  <span className={`text-xs font-semibold ${
                                    tournament.status === 'finished' ? 'text-primary' : 'text-warning'
                                  }`}>
                                    {tournament.status === 'finished' ? 'Befejezve' : 'Folyamatban'}
                                  </span>
                                  {tournament.finalPosition && (
                                    <span className="text-primary font-semibold">
                                      #{tournament.finalPosition} helyezés
                                    </span>
                                  )}
                                </div>
                                {tournament.status === 'finished' && tournament.playerStats && (
                                  <>
                                    <div className="divider my-1"></div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="flex justify-between">
                                        <span>Meccsek:</span>
                                        <span className="font-semibold">
                                          {tournament.playerStats.matchesWon || 0} nyert / {tournament.playerStats.matchesLost || 0} vesztett
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>180s:</span>
                                        <span className="font-semibold">{tournament.playerStats.total180s || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Max kiszálló:</span>
                                        <span className="font-semibold">{tournament.playerStats.highestCheckout || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Átlag:</span>
                                        <span className="font-semibold">{tournament.playerStats.avg?.toFixed(1) || 'N/A'}</span>
                                      </div>
                                    </div>
                                  </>
                                )}
                                {tournament.status !== 'finished' && (
                                  <div className="text-xs text-base-content/50 mt-1">
                                    A torna még folyamatban van, statisztikák a befejezés után lesznek elérhetők.
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Legutóbbi meccsek */}
                    {playerStats.matchHistory.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <IconSword className="w-5 h-5" />
                          Legutóbbi meccsek
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {playerStats.matchHistory.map((match: any, index: number) => (
                            <div key={index} className={`p-3 rounded-lg border ${
                              match.won ? 'border-success bg-success/10' : 'border-error bg-error/10'
                            }`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">vs {match.opponent}</div>
                                  <div className="text-sm text-base-content/60">
                                    {new Date(match.date).toLocaleDateString('hu-HU')}
                                  </div>
                                  <div className="text-xs text-base-content/50">
                                    {match.legs} legek
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-bold ${match.won ? 'text-success' : 'text-error'}`}>
                                    {match.player1Score} - {match.player2Score}
                                  </div>
                                  <div className="text-sm">
                                    {match.won ? 'Győzelem' : 'Vereség'}
                                  </div>
                                  <button
                                    onClick={() => handleViewLegs(match)}
                                    className="btn btn-xs btn-outline mt-1"
                                  >
                                    Legek
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Műveletek szekció */}
        <section className="mb-8">
          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-xl font-semibold text-base-content mb-4">Műveletek</h2>
              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full btn btn-error"
                  disabled={isLoading}
                >
                  <IconLogout className="w-4 h-4" />
                  Kijelentkezés
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/myclub" className="w-full btn btn-primary">
                    <IconUsers className="w-4 h-4" />
                    Saját klub
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin" className="w-full btn btn-primary">
                      <IconShieldLock className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* LegsViewModal */}
      {showLegsModal && selectedMatch && (
        <LegsViewModal
          isOpen={showLegsModal}
          onClose={handleCloseLegsModal}
          match={selectedMatch}
        />
      )}
    </div>
  );
};

export default ProfilePage;