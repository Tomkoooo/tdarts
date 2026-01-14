"use client"

import * as React from 'react'
import { useState } from 'react'
import { useForm } from "react-hook-form"
import axios from "axios"
import toast from "react-hot-toast"
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { showErrorToast } from "@/lib/toastUtils"
import { extractMediaIds } from "@/lib/utils"
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import { Club } from "@/interface/club.interface"

interface ClubBrandingSettingsProps {
  club: Club
  onClubUpdated: () => void
}

export default function ClubBrandingSettings({ club, onClubUpdated }: ClubBrandingSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [lastSavedAboutText, setLastSavedAboutText] = useState(club.landingPage?.aboutText || club.description || "");



  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      primaryColor: club.landingPage?.primaryColor || "",
      secondaryColor: club.landingPage?.secondaryColor || "",
      backgroundColor: club.landingPage?.backgroundColor || "",
      foregroundColor: club.landingPage?.foregroundColor || "",
      cardColor: club.landingPage?.cardColor || "",
      cardForegroundColor: club.landingPage?.cardForegroundColor || "",
      logo: club.landingPage?.logo || "",
      coverImage: club.landingPage?.coverImage || "",
      aboutText: club.landingPage?.aboutText || club.description || "",
      template: club.landingPage?.template || "classic",
      showMembers: club.landingPage?.showMembers ?? true,
      showTournaments: club.landingPage?.showTournaments ?? true,
      "seo.title": club.landingPage?.seo?.title || "",
      "seo.description": club.landingPage?.seo?.description || "",
      "seo.keywords": club.landingPage?.seo?.keywords || "",
    }
  })

  // Update form when club prop changes (after fetch)
  React.useEffect(() => {
    reset({
        primaryColor: club.landingPage?.primaryColor || "",
        secondaryColor: club.landingPage?.secondaryColor || "",
        backgroundColor: club.landingPage?.backgroundColor || "",
        foregroundColor: club.landingPage?.foregroundColor || "",
        cardColor: club.landingPage?.cardColor || "",
        cardForegroundColor: club.landingPage?.cardForegroundColor || "",
        logo: club.landingPage?.logo || "",
        coverImage: club.landingPage?.coverImage || "",
        aboutText: club.landingPage?.aboutText || club.description || "",
        template: club.landingPage?.template || "classic",
        showMembers: club.landingPage?.showMembers ?? true,
        showTournaments: club.landingPage?.showTournaments ?? true,
        "seo.title": club.landingPage?.seo?.title || "",
        "seo.description": club.landingPage?.seo?.description || "",
        "seo.keywords": club.landingPage?.seo?.keywords || "",
    });
  }, [club, reset]);

  const handleExportConfig = () => {
    const data = watch();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `club-settings-${club.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            reset(data);
            toast.success("Beállítások betöltve");
        } catch {
            toast.error("Hibás fájl formátum");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaults = () => {
      if(!confirm("Biztosan visszaállítasz mindent alaphelyzetbe? A mentés gomb megnyomásáig nem végleges.")) return;
      setValue("primaryColor", "");
      setValue("secondaryColor", "");
      setValue("backgroundColor", "");
      setValue("foregroundColor", "");
      setValue("cardColor", "");
      setValue("cardForegroundColor", "");
      toast.success("Színek alaphelyzetbe állítva (Mentsd el a változtatásokat!)");
  }

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo' | 'coverImage') => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error("A fájl mérete maximum 15MB lehet");
      return;
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('clubId', club._id)

    const toastId = toast.loading("Feltöltés...")
    try {
      const res = await axios.post('/api/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setValue(fieldName, res.data.url)
      toast.success("Sikeres feltöltés", { id: toastId })
    } catch {
      toast.error("Feltöltés sikertelen", { id: toastId })
    }
  }

  const onBrandingSubmit = async (data: any) => {
      setLoading(true)
    try {
      // Automatic Image Deletion Logic
      const newAboutText = data.aboutText || "";
      const previousIds = extractMediaIds(lastSavedAboutText);
      const currentIds = extractMediaIds(newAboutText);
      
      const deletedIds = previousIds.filter(id => !currentIds.includes(id));
      
      if (deletedIds.length > 0) {
          console.log("Deleting unused media images:", deletedIds);
          await Promise.all(deletedIds.map(id => axios.delete(`/api/media/${id}`).catch(err => console.error("Failed to delete media", id, err))));
      }

      await axios.put(`/api/clubs/${club._id}/landing`, {
        landingPage: data
      })
      
      setLastSavedAboutText(newAboutText); // Update reference for next save
      toast.success("Beállítások mentve")
      onClubUpdated()
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Mentés sikertelen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
                <h3 className="text-lg font-semibold">Arculat & Info</h3>
                <p className="text-sm text-muted-foreground">Kezeld a klub nyilvános megjelenését</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Input 
                  type="file" 
                  id="config-import" 
                  className="hidden" 
                  accept=".json"
                  onChange={handleImportConfig}
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('config-import')?.click()}>
                    Import
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportConfig}>
                    Export
                </Button>
                <Button variant="destructive" size="sm" onClick={handleResetDefaults}>
                    Alaphelyzet
                </Button>
            </div>
        </div>

        <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label>Elsődleges Szín (Primary)</Label>
                    <div className="flex gap-2">
                        <Input 
                            type="color" 
                            value={watch("primaryColor")} 
                            onChange={(e) => setValue("primaryColor", e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer" 
                        />
                        <Input {...register("primaryColor")} value={watch("primaryColor")} placeholder="#000000" />
                    </div>
                 </div>
                 <div>
                    <Label>Másodlagos Szín (Secondary)</Label>
                    <div className="flex gap-2">
                        <Input 
                            type="color" 
                            value={watch("secondaryColor")} 
                            onChange={(e) => setValue("secondaryColor", e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer" 
                        />
                        <Input {...register("secondaryColor")} value={watch("secondaryColor")} placeholder="#ffffff" />
                    </div>
                 </div>
              </div>

              <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3">Haladó Színek</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Háttérszín (Background)</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="color" 
                                value={watch("backgroundColor") || "#000000"} 
                                onChange={(e) => setValue("backgroundColor", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer" 
                            />
                            <Input {...register("backgroundColor")} value={watch("backgroundColor")} placeholder="Alapértelmezett" />
                        </div>
                     </div>
                     <div>
                        <Label>Szövegszín (Foreground)</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="color" 
                                value={watch("foregroundColor") || "#ffffff"} 
                                onChange={(e) => setValue("foregroundColor", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer" 
                            />
                            <Input {...register("foregroundColor")} value={watch("foregroundColor")} placeholder="Alapértelmezett" />
                        </div>
                     </div>
                     <div>
                        <Label>Kártya Háttér (Card)</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="color" 
                                value={watch("cardColor") || "#1e1e1e"} 
                                onChange={(e) => setValue("cardColor", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer" 
                            />
                            <Input {...register("cardColor")} value={watch("cardColor")} placeholder="Alapértelmezett" />
                        </div>
                     </div>
                     <div>
                        <Label>Kártya Szöveg (Card Foreground)</Label>
                        <div className="flex gap-2">
                            <Input 
                                type="color" 
                                value={watch("cardForegroundColor") || "#ffffff"} 
                                onChange={(e) => setValue("cardForegroundColor", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer" 
                            />
                            <Input {...register("cardForegroundColor")} value={watch("cardForegroundColor")} placeholder="Alapértelmezett" />
                        </div>
                     </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label>Logó</Label>
                      <Input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'logo')} />
                      <input type="hidden" {...register("logo")} />
                      {watch("logo") && (
                        <div className="relative mt-2 w-fit group">
                            <ImageWithSkeleton src={watch("logo")} alt="Logo" className="h-20 w-20 object-contain border rounded bg-black/20" containerClassName="h-20 w-20" />
                            <Button 
                                type="button"
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => setValue("logo", "")}
                            >
                                <IconTrash size={12} />
                            </Button>
                        </div>
                      )}
                  </div>
                  <div>
                      <Label>Borítókép</Label>
                      <Input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'coverImage')} />
                      <input type="hidden" {...register("coverImage")} />
                      {watch("coverImage") && (
                        <div className="relative mt-2 w-full max-w-sm group">
                            <ImageWithSkeleton src={watch("coverImage")} alt="Cover" className="h-32 w-full object-cover border rounded bg-black/20" containerClassName="h-32 w-full" />
                             <Button 
                                type="button"
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => setValue("coverImage", "")}
                            >
                                <IconTrash size={12} />
                            </Button>
                        </div>
                      )}
                  </div>
              </div>

              <div>
                  <Label>Rólunk (Szöveg)</Label>
                  <RichTextEditor 
                    value={watch("aboutText")} 
                    onChange={(val) => setValue("aboutText", val)} 
                    placeholder="Írj a klubról..." 
                  />
              </div>

              <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3">SEO Beállítások</h3>
                  <div className="space-y-4">
                      <div>
                        <Label>Meta Title (SEO Cím)</Label>
                        <Input {...register("seo.title")} placeholder="Keresőmotorokban megjelenő cím" />
                        <p className="text-[10px] text-muted-foreground mt-1">Alapértelmezett: a klub neve. Maximális hossz: 100 karakter.</p>
                      </div>
                      <div>
                        <Label>Meta Description (SEO Leírás)</Label>
                        <Input {...register("seo.description")} placeholder="Rövid leírás a keresőknek" />
                        <p className="text-[10px] text-muted-foreground mt-1">Alapértelmezett: a klub leírása. Maximális hossz: 200 karakter.</p>
                      </div>
                      <div>
                        <Label>Kulcsszavak (Keywords)</Label>
                        <Input {...register("seo.keywords")} placeholder="darts, tornák, klub, helyszín..." />
                        <p className="text-[10px] text-muted-foreground mt-1">Vesszővel elválasztva.</p>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end">
                  <Button onClick={handleSubmit(onBrandingSubmit)} disabled={loading}>
                    <IconDeviceFloppy className="mr-2 h-4 w-4" /> Mentés
                  </Button>
              </div>
        </div>
    </div>
  )
}
