"use client"

import { useState, useEffect } from 'react'
import axios from "axios"
import toast from "react-hot-toast"
import { IconTrash, IconPlus, IconDeviceFloppy, IconEdit } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import { Club } from "@/interface/club.interface"

interface ClubGallerySettingsProps {
  club: Club
}

interface Gallery {
  _id: string;
  name: string;
  images: string[];
}

export default function ClubGallerySettings({ club }: ClubGallerySettingsProps) {
    const [loading, setLoading] = useState(false)
    const [galleries, setGalleries] = useState<Gallery[]>([])
    const [isEditingGallery, setIsEditingGallery] = useState(false)
    const [galleryName, setGalleryName] = useState("")
    const [galleryImages, setGalleryImages] = useState<string[]>([])
    const [originalImages, setOriginalImages] = useState<string[]>([])
    const [currentGalleryId, setCurrentGalleryId] = useState<string | null>(null)

    const fetchGalleries = async () => {
        try {
            const res = await axios.get(`/api/clubs/${club._id}/galleries`)
            setGalleries(res.data.galleries)
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => {
        fetchGalleries()
    }, [club._id])

    const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (galleryImages.length + files.length > 5) {
            toast.error("Maximum 5 kép engedélyezett galériánként")
            return
        }

        const toastId = toast.loading("Feltöltés...")
        const newImages: string[] = []

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 15 * 1024 * 1024) {
                     toast.error(`A ${file.name} túl nagy (max 15MB)`);
                     continue;
                }
                
                const formData = new FormData()
                formData.append('file', file)
                formData.append('clubId', club._id)

                const res = await axios.post('/api/media', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                newImages.push(res.data.url)
            }
            setGalleryImages([...galleryImages, ...newImages])
            toast.success("Képek feltöltve", { id: toastId })
        } catch {
            toast.error("Feltöltés sikertelen", { id: toastId })
        }
        e.target.value = ''
    }

    const handleSaveGallery = async () => {
        if (!galleryName) return toast.error("Adja meg a galéria nevét")
        
        setLoading(true)
        try {
            if (currentGalleryId) {
                // Determine deleted images
                const extractId = (url: string) => url.match(/\/api\/media\/([a-f0-9]{24})/) ? url.split('/').pop() : null;
                const deletedIds = originalImages
                    .filter(img => !galleryImages.includes(img))
                    .map(extractId)
                    .filter(Boolean) as string[];

                if (deletedIds.length > 0) {
                    console.log("Deleting removed gallery images:", deletedIds);
                    await Promise.all(deletedIds.map(id => axios.delete(`/api/media/${id}`).catch(err => console.error("Failed to delete media", id, err))));
                }

                // Update
                await axios.put(`/api/clubs/${club._id}/galleries`, {
                    id: currentGalleryId,
                    name: galleryName,
                    images: galleryImages
                })
                toast.success("Galéria frissítve")
            } else {
                // Create
                await axios.post(`/api/clubs/${club._id}/galleries`, {
                    name: galleryName,
                    images: galleryImages
                })
                toast.success("Galéria létrehozva")
            }
            
            setIsEditingGallery(false)
            setGalleryName("")
            setGalleryImages([])
            setCurrentGalleryId(null)
            fetchGalleries()
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Hiba történt")
        } finally {
            setLoading(false)
        }
    }

    const handleEditGallery = (gallery: Gallery) => {
        setGalleryName(gallery.name)
        setGalleryImages(gallery.images)
        setOriginalImages([...gallery.images])
        setCurrentGalleryId(gallery._id)
        setIsEditingGallery(true)
    }

    const handleDeleteGallery = async (gallery: Gallery) => {
        if (!confirm(`Biztosan törölni szeretnéd a(z) "${gallery.name}" galériát?`)) return
        try {
            // Delete associated media
            const extractId = (url: string) => url.match(/\/api\/media\/([a-f0-9]{24})/) ? url.split('/').pop() : null;
            const mediaIds = gallery.images.map(extractId).filter(Boolean) as string[];
            
            if (mediaIds.length > 0) {
                console.log("Deleting media files for deleted gallery:", mediaIds);
                await Promise.all(mediaIds.map(id => axios.delete(`/api/media/${id}`).catch(err => console.error("Failed to delete media", id, err))));
            }

            await axios.delete(`/api/clubs/${club._id}/galleries?id=${gallery._id}`)
            toast.success("Galéria törölve")
            fetchGalleries()
        } catch {
            toast.error("Hiba történt")
        }
    }

    return (
      <div className="space-y-6">
           <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h3 className="text-lg font-semibold">Galéria</h3>
                    <p className="text-sm text-muted-foreground">Kezeld a klub galériáit</p>
                </div>
                {!isEditingGallery && (
                    <div className="flex flex-col items-end gap-1">
                        <Button 
                            disabled={galleries.length >= 3}
                            onClick={() => {
                                setCurrentGalleryId(null)
                                setGalleryName("")
                                setGalleryImages([])
                                setIsEditingGallery(true)
                            }}
                        >
                            <IconPlus className="mr-2 h-4 w-4" /> Új Galéria
                        </Button>
                        {galleries.length >= 3 && (
                            <span className="text-[10px] text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded">
                                Maximum 3 galéria (Ingyenes csomag)
                            </span>
                        )}
                    </div>
                )}
           </div>

           {isEditingGallery ? (
                <div className="space-y-4 border p-4 rounded-lg">
                    <h3 className="text-lg font-semibold">{currentGalleryId ? "Galéria Szerkesztése" : "Új Galéria Létrehozása"}</h3>
                    <div>
                        <Label>Galéria Neve</Label>
                        <Input value={galleryName} onChange={(e) => setGalleryName(e.target.value)} placeholder="pl. Verseny 2024" />
                    </div>
                    <div>
                        <Label>Képek (Max 5, Max 15MB/kép)</Label>
                        <Input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={handleGalleryImageUpload} 
                            disabled={galleryImages.length >= 5}
                        />
                        <div className="grid grid-cols-5 gap-2 mt-2">
                            {galleryImages.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <ImageWithSkeleton src={img} alt={`Gallery ${idx}`} className="w-full h-20 object-cover rounded border" containerClassName="w-full h-20" />
                                    <button 
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))}
                                    >
                                        <IconTrash size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveGallery} disabled={loading}>
                            <IconDeviceFloppy className="mr-2 h-4 w-4" /> Mentés
                        </Button>
                        <Button variant="outline" onClick={() => {
                            setIsEditingGallery(false)
                            setGalleryName("")
                            setGalleryImages([])
                            setCurrentGalleryId(null)
                        }}>Mégse</Button>
                    </div>
                </div>
             ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {galleries.map(gallery => (
                            <div key={gallery._id} className="border rounded-lg overflow-hidden flex flex-col">
                                <div className="h-40 bg-muted relative">
                                    {gallery.images && gallery.images.length > 0 ? (
                                        <ImageWithSkeleton src={gallery.images[0]} alt={gallery.name} className="w-full h-full object-cover" containerClassName="w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">Nincs kép</div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                                        {gallery.images.length} kép
                                    </div>
                                </div>
                                <div className="p-3 flex justify-between items-center bg-card">
                                    <div className="font-semibold truncate pr-2">{gallery.name}</div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditGallery(gallery)}>
                                            <IconEdit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteGallery(gallery)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <IconTrash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {galleries.length === 0 && (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                                Még nincs létrehozott galéria.
                            </div>
                        )}
                    </div>
                </div>
             )}
      </div>
    )
}
