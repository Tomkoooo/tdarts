"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { X, Maximize2, Share2 } from "lucide-react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import toast from "react-hot-toast"
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import { useTranslations } from "next-intl"

interface PostDetailModalProps {
  isOpen: boolean
  onClose: () => void
  post: any
  clubCode?: string
}

export default function PostDetailModal({ isOpen, onClose, post, clubCode }: PostDetailModalProps) {
  const t = useTranslations('Club.post_detail_modal')
  const [viewImage, setViewImage] = React.useState<string | null>(null)
  
  if (!post) return null

  const handleShare = () => {
    let url = window.location.href.split('?')[0]
    // If clubCode provided, prefer constructing canonical URL, otherwise use current
    if (clubCode) {
        url = `${window.location.origin}/clubs/${clubCode}`
    }
    const fullUrl = `${url}?postId=${post._id}`
    
    navigator.clipboard.writeText(fullUrl)
    toast.success(t('toast_copied'))
  }

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
            <DialogHeader className="p-6 pb-2 flex-shrink-0 bg-background z-10">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <DialogTitle className="text-2xl font-bold mb-2 break-words leading-tight">{post.title}</DialogTitle>
                        <DialogDescription>
                            {t('published_at', { 
                                date: format(new Date(post.createdAt), 'yyyy. MM. dd.', { locale: hu })
                            })} • {post.authorId?.name || t('author_unknown')}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={handleShare} className="hidden md:flex gap-2">
                            <Share2 className="w-4 h-4" />
                            {t('share')}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleShare} className="md:hidden">
                            <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                {/* Images Grid */}
                {post.images && post.images.length > 0 && (
                    <div className={`grid gap-4 ${post.images.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                        {post.images.map((img: string, idx: number) => (
                            <div 
                                key={idx} 
                                className="relative rounded-lg overflow-hidden border bg-background/50 cursor-pointer group"
                                onClick={() => setViewImage(img)}
                            >
                                <ImageWithSkeleton 
                                    src={img} 
                                    alt={t('image_alt', { title: post.title, index: idx + 1 })} 
                                    containerClassName="w-full h-auto max-h-[400px]" 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div 
                    className="prose prose-invert max-w-none dark:prose-p:text-gray-300 break-words"
                    dangerouslySetInnerHTML={{ __html: post.content }} 
                />
            </div>
        </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog open={!!viewImage} onOpenChange={(open) => !open && setViewImage(null)}>
            <DialogContent className="max-w-[95vw] h-[95vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center [&>button]:hidden">
                <div className="relative w-full h-full flex items-center justify-center" onClick={() => setViewImage(null)}>
                    {viewImage && (
                        <ImageWithSkeleton 
                            src={viewImage} 
                            alt={t('full_size_alt')} 
                            containerClassName="w-full h-full flex items-center justify-center bg-transparent"
                            className="max-w-full max-h-full object-contain drop-shadow-2xl cursor-default"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()} 
                        />
                    )}
                    <button 
                        className="absolute top-0 right-0 md:top-4 md:right-4 text-white/70 hover:text-white p-2 bg-black/50 rounded-full transition-colors z-50 pointer-events-auto"
                        onClick={(e) => { e.stopPropagation(); setViewImage(null); }}
                    >
                        <X size={32} />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    </>
  )
}
