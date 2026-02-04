"use client"

import * as React from "react"
import Cropper from "react-easy-crop"
import { IconUpload, IconX, IconCheck, IconCamera } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import getCroppedImg from "@/lib/imageUtils"
import axios from "axios"
import toast from "react-hot-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { IconTrash } from "@tabler/icons-react"

interface ProfilePictureUploadProps {
  currentPicture?: string
  onUploadSuccess: (url: string) => void
}

export function ProfilePictureUpload({
  currentPicture,
  onUploadSuccess,
}: ProfilePictureUploadProps) {
  const [image, setImage] = React.useState<string | null>(null)
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const [consent, setConsent] = React.useState(false)
  const [isImageLoading, setIsImageLoading] = React.useState(true)

  const onCropComplete = React.useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener("load", () => {
        setImage(reader.result as string)
        setIsDialogOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!image || !croppedAreaPixels) return
    if (!consent) {
      toast.error("A feltöltéshez el kell fogadnod, hogy a képed publikusan elérhető lesz.")
      return
    }

    setIsUploading(true)
    try {
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels)
      if (!croppedImageBlob) throw new Error("Cropping failed")

      const formData = new FormData()
      formData.append("file", croppedImageBlob, "profile-picture.jpg")

      // 1. Upload to media API
      const mediaResponse = await axios.post("/api/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const imageUrl = mediaResponse.data.url

      // 2. Update user profile
      await axios.post("/api/profile/update", {
        profilePicture: imageUrl,
        publicConsent: true,
      })

      onUploadSuccess(imageUrl)
      setIsDialogOpen(false)
      setImage(null)
      toast.success("Profilkép sikeresen frissítve!")
    } catch (error) {
      console.error("Profile picture upload error:", error)
      toast.error("Hiba történt a profilkép feltöltése során.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("Biztosan el akarod távolítani a profilképedet?")) return

    setIsRemoving(true)
    try {
      await axios.post("/api/profile/update", {
        profilePicture: null,
      })
      onUploadSuccess("")
      toast.success("Profilkép eltávolítva.")
    } catch (error) {
      console.error("Profile picture removal error:", error)
      toast.error("Hiba történt a profilkép eltávolítása során.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-all">
          {isImageLoading && currentPicture && (
            <Skeleton className="absolute inset-0 rounded-full" />
          )}
          <AvatarImage 
            src={currentPicture} 
            alt="Profilkép" 
            className="object-cover" 
            onLoadingStatusChange={(status) => setIsImageLoading(status === 'loading')}
          />
          <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
            <IconCamera className="w-8 h-8 opacity-50" />
          </AvatarFallback>
        </Avatar>
        
        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <IconUpload className="w-6 h-6 text-white" />
          <input
            type="file"
            className="hidden"
            id="profile-picture-input"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      </div>


      {currentPicture && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemove}
          disabled={isRemoving}
        >
          {isRemoving ? (
            "Eltávolítás..."
          ) : (
            <>
              <IconTrash className="w-4 h-4 mr-2" />
              Kép eltávolítása
            </>
          )}
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle>Profilkép szerkesztése</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
            {image && (
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            )}
          </div>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 px-2">
              <span className="text-sm font-medium">Zoom:</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(!!checked)}
                className="mt-1"
              />
              <label
                htmlFor="consent"
                className="text-xs leading-relaxed text-muted-foreground cursor-pointer select-none"
              >
                Kifejezetten hozzájárulok, hogy a profilképem nyilvánosan megjelenjen a keresési találatokban, a ranglistákon és a versenyek játékoslistájában.
              </label>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUploading}
              size="sm"
            >
              <IconX className="w-4 h-4 mr-2" />
              Mégse
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !consent}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isUploading ? (
                <>Feltöltés...</>
              ) : (
                <>
                  <IconCheck className="w-4 h-4 mr-2" />
                  Mentés
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
