"use client"
import { useTranslations } from "next-intl";

import * as React from "react"
import axios from "axios"
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface Gallery {
  _id: string;
  name: string;
  images: string[];
}

interface ClubGallerySectionProps {
  clubId: string;
}

export default function ClubGallerySection({ clubId }: ClubGallerySectionProps) {
    const t = useTranslations("Club.components");
  const [galleries, setGalleries] = React.useState<Gallery[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedGallery, setSelectedGallery] = React.useState<Gallery | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()

  React.useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const res = await axios.get(`/api/clubs/${clubId}/galleries`)
        setGalleries(res.data.galleries)
      } catch (err) {
        console.error("Failed to fetch galleries", err)
      } finally {
        setLoading(false)
      }
    }
    fetchGalleries()
  }, [clubId])

  // Handle galleryId URL parameter
  React.useEffect(() => {
    if (galleries.length > 0) {
        const galleryId = searchParams.get('galleryId')
        if (galleryId) {
            const gallery = galleries.find(g => g._id === galleryId)
            if (gallery) {
                setSelectedGallery(gallery)
                setCurrentImageIndex(0)
            }
        }
    }
  }, [searchParams, galleries])

  const openGallery = (gallery: Gallery) => {
    setSelectedGallery(gallery)
    setCurrentImageIndex(0)
    
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('galleryId', gallery._id)
    router.replace(url.toString(), { scroll: false })
  }

  const closeGallery = () => {
    setSelectedGallery(null)
    setCurrentImageIndex(0)
    
    // Remove URL param
    const url = new URL(window.location.href)
    if (url.searchParams.has('galleryId')) {
        url.searchParams.delete('galleryId')
        router.replace(url.toString(), { scroll: false })
    }
  }

  const handleShareGallery = (e: React.MouseEvent, gallery: Gallery) => {
      e.stopPropagation();
      const baseUrl = window.location.href.split('?')[0];
      const shareUrl = `${baseUrl}?galleryId=${gallery._id}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success(t("galéria_linkje_másolva"));
  }

  const nextImage = () => {
    if (!selectedGallery) return
    setCurrentImageIndex((prev) => (prev + 1) % selectedGallery.images.length)
  }

  const prevImage = () => {
    if (!selectedGallery) return
    setCurrentImageIndex((prev) => (prev - 1 + selectedGallery.images.length) % selectedGallery.images.length)
  }

  if (loading) return <div className="text-center py-10">{t("betöltés")}</div>
  if (galleries.length === 0) return null

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("képgaléria")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {galleries.map((gallery) => (
          <div 
            key={gallery._id} 
            className="group cursor-pointer border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-card"
            onClick={() => openGallery(gallery)}
          >
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
               {gallery.images.length > 0 ? (
                 <ImageWithSkeleton 
                    src={gallery.images[0]} 
                    alt={gallery.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-muted-foreground">{t("empty")}</div>
               )}
               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 flex justify-between items-end">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{gallery.name}</div>
                    <div className="text-white/80 text-xs">{gallery.images.length} {t("kép")}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 h-8 w-8 shrink-0"
                    onClick={(e) => handleShareGallery(e, gallery)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedGallery} onOpenChange={(open) => !open && closeGallery()}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 text-white border-none overflow-hidden h-[80vh] flex flex-col md:flex-row">
            {selectedGallery && (
                <>
                 <div className="relative flex-1 h-full flex items-center justify-center p-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute left-2 text-white hover:bg-white/10 rounded-full z-10"
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </Button>

                    <div className="relative w-full h-full max-h-full flex items-center justify-center overflow-hidden">
                        <ImageWithSkeleton 
                            src={selectedGallery.images[currentImageIndex]} 
                            alt={`${selectedGallery.name} ${currentImageIndex + 1}`} 
                            className="max-w-full max-h-full object-contain"
                            containerClassName="w-full h-full flex items-center justify-center bg-transparent"
                        />
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 text-white hover:bg-white/10 rounded-full z-10"
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    >
                        <ChevronRight className="h-8 w-8" />
                    </Button>
                 </div>

                 <div className="bg-neutral-900 w-full md:w-64 flex-shrink-0 p-4 overflow-y-auto hidden md:block border-l border-white/10">
                    <div className="font-semibold text-lg mb-4">{selectedGallery.name}</div>
                    <div className="grid grid-cols-2 gap-2">
                        {selectedGallery.images.map((img, idx) => (
                            <div 
                                key={idx} 
                                className={cn(
                                    "cursor-pointer rounded overflow-hidden border-2 transition-all aspect-square",
                                    currentImageIndex === idx ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                                onClick={() => setCurrentImageIndex(idx)}
                            >
                                <ImageWithSkeleton src={img} className="w-full h-full object-cover" containerClassName="w-full h-full" />
                            </div>
                        ))}
                    </div>
                 </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
