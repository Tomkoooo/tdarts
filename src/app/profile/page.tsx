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
  IconShieldLock
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

const updateProfileSchema = z.object({
  email: z.string().email("Érvényes email címet adj meg").optional(),
  name: z.string().min(1, "Név kötelező").optional(),
  username: z.string().min(1, "Felhasználónév kötelező").optional(),
  password: z.string().min(6, "A jelszónak legalább 6 karakter hosszúnak kell lennie").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password && !data.confirmPassword) {
    return false;
  }
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "A jelszavak nem egyeznek",
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
    }
  }, [user, router, resetProfileForm]);

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    setIsLoading(true);
    try {
      await toast.promise(
        axios.post("/api/profile/update", data, {
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
     <div className="min-h-screen  flex items-center justify-center p-4 pt-8">
      <div className="w-full max-w-4xl glass bg-opacity-20 rounded-lg shadow-lg p-6 md:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full border border-primary/30 mb-4">
            <IconUser className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Profil kezelés</h1>
          <p className="text-base-content/70 text-sm md:text-base">Kezeld a fiókod beállításait és preferenciáit</p>
        </div>

        {/* Jelenlegi információk szekció */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <IconUser className="w-5 h-5" />
            Jelenlegi információk
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </section>

        {/* Profil szerkesztés szekció */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <IconEdit className="w-5 h-5" />
            Profil szerkesztése
          </h2>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <button type="submit" className="w-full btn btn-success" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="loading loading-spinner w-4 h-4"></span>
                  Frissítés...
                </span>
              ) : (
                <span className="flex items-center gap-2 ">
                  <IconUser className="w-4 h-4" />
                  Profil frissítése
                </span>
              )}
            </button>
          </form>
        </section>

        {/* Email verifikáció szekció */}
        {needsEmailVerification && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-base-content mb-4 flex items-center gap-2">
              <IconKey className="w-5 h-5" />
              Email ellenőrzés
            </h2>
            <div className="alert alert-error bg-error/10 border-error/20 mb-4">
              <p className="text-sm text-error-content">
                Az email címed ellenőrzésre szorul. Kérlek add meg az emailben kapott ellenőrző kódot.
              </p>
            </div>
            <form onSubmit={handleVerifySubmit(onVerifySubmit)} className="space-y-6">
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
          </section>
        )}

        {/* Műveletek szekció */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-base-content mb-4">Műveletek</h2>
          <div className="space-y-4">
            <button
              onClick={handleLogout}
              className="w-full btn btn-error"
              disabled={isLoading}
            >
              <IconLogout className="w-4 h-4" />
              Kijelentkezés
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;