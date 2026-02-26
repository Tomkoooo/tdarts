"use client"

import { useState, useEffect } from 'react'
import axios from "axios"
import toast from "react-hot-toast"
import { IconTrash, IconPencil, IconPlus, IconDeviceFloppy } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { showErrorToast } from "@/lib/toastUtils"
import { extractMediaIds } from '@/lib/utils'
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import { Club } from "@/interface/club.interface"
import { useTranslations } from 'next-intl'

interface ClubNewsSettingsProps {
  club: Club
}

export default function ClubNewsSettings({ club }: ClubNewsSettingsProps) {
  const t = useTranslations('Club.settings.news_form')
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [currentPost, setCurrentPost] = useState<any>(null)
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [postCoverImage, setPostCoverImage] = useState("")
  const [postCoverImage2, setPostCoverImage2] = useState("")
  const [lastSavedPostContent, setLastSavedPostContent] = useState("")
  const [originalPostMedia, setOriginalPostMedia] = useState<{cover1: string, cover2: string}>({cover1: "", cover2: ""})

  const fetchPosts = async () => {
      try {
          const res = await axios.get(`/api/clubs/${club._id}/posts`)
          setPosts(res.data.posts)
      } catch (err) {
          console.error(err)
      }
  }

  useEffect(() => {
      fetchPosts()
  }, [club._id])

  const handleSavePost = async () => {
    if (!postTitle || !postContent) {
      toast.error(t('validation.title_content_required'))
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: postTitle,
        content: postContent,
        images: [postCoverImage, postCoverImage2].filter(img => img !== "") 
      }

      if (currentPost) {
         // Automatic Image Deletion Logic for content
         const previousIds = extractMediaIds(lastSavedPostContent);
         const currentIds = extractMediaIds(postContent);
         const deletedContentIds = previousIds.filter(id => !currentIds.includes(id));

         // Logic for cover images (if they were uploaded via /api/media)
         const extractId = (url: string) => url.match(/\/api\/media\/([a-f0-9]{24})/) ? url.split('/').pop() : null;
         const deletedCoverIds: string[] = [];
         
         const oldId1 = extractId(originalPostMedia.cover1);
         if (oldId1 && postCoverImage !== originalPostMedia.cover1) deletedCoverIds.push(oldId1);
         
         const oldId2 = extractId(originalPostMedia.cover2);
         if (oldId2 && postCoverImage2 !== originalPostMedia.cover2) deletedCoverIds.push(oldId2);

         const allDeletedIds = [...deletedContentIds, ...deletedCoverIds];

         if (allDeletedIds.length > 0) {
             console.log("Deleting unused media from post:", allDeletedIds);
             await Promise.all(allDeletedIds.map(id => axios.delete(`/api/media/${id}`).catch(err => console.error("Failed to delete media", id, err))));
         }

         await axios.put(`/api/clubs/${club._id}/posts/${currentPost._id}`, payload)
         toast.success(t('toast.updated'))
      } else {
         await axios.post(`/api/clubs/${club._id}/posts`, payload)
         toast.success(t('toast.created'))
      }

      setPostTitle("")
      setPostContent("")
      setPostCoverImage("")
      setPostCoverImage2("")
      setLastSavedPostContent("")
      setOriginalPostMedia({cover1: "", cover2: ""})
      setCurrentPost(null)
      setIsEditingPost(false)
      fetchPosts()
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || t('toast.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditPost = (post: any) => {
      setCurrentPost(post)
      setPostTitle(post.title)
      setPostContent(post.content)
      setLastSavedPostContent(post.content)
      const c1 = post.images?.[0] || "";
      const c2 = post.images?.[1] || "";
      setPostCoverImage(c1)
      setPostCoverImage2(c2)
      setOriginalPostMedia({cover1: c1, cover2: c2})
      setIsEditingPost(true)
  }

  const handleDeletePost = async (post: any) => {
      if(!confirm(t('confirm_delete'))) return;
      setLoading(true)
      try {
          // Automatic Media Deletion Logic
          const contentMediaIds = extractMediaIds(post.content);
          const extractId = (url: string) => url.match(/\/api\/media\/([a-f0-9]{24})/) ? url.split('/').pop() : null;
          const coverIds = (post.images || []).map(extractId).filter(Boolean) as string[];
          
          const allMediaIds = [...contentMediaIds, ...coverIds];
          
          if (allMediaIds.length > 0) {
              console.log("Deleting media associated with post deletion:", allMediaIds);
              await Promise.all(allMediaIds.map(id => axios.delete(`/api/media/${id}`).catch(err => console.error("Failed to delete media", id, err))));
          }

          await axios.delete(`/api/clubs/${club._id}/posts/${post._id}`)
          toast.success(t('toast.deleted'))
          fetchPosts()
      } catch (err: any) {
          showErrorToast(err.response?.data?.error || t('toast.delete_error'))
      } finally {
          setLoading(false)
      }
  }

  const handlePostImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error(t('toast.size_error'));
      return;
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('clubId', club._id)

    const toastId = toast.loading(t('toast.uploading'))
    try {
      const res = await axios.post('/api/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setter(res.data.url)
      toast.success(t('toast.upload_success'), { id: toastId })
    } catch {
      toast.error(t('toast.upload_error'), { id: toastId })
    }
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center border-b pb-4">
            <div>
                <h3 className="text-lg font-semibold">{t('title')}</h3>
                <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
            </div>
            {!isEditingPost && (
                <Button onClick={() => {
                    setCurrentPost(null)
                    setPostTitle("")
                    setPostContent("")
                    setPostCoverImage("")
                    setPostCoverImage2("")
                    setIsEditingPost(true)
                }}>
                  <IconPlus className="mr-2 h-4 w-4" /> {t('new_post')}
                </Button>
            )}
       </div>

      {isEditingPost ? (
        <div className="space-y-4 border p-4 rounded-lg">
          <h3 className="text-lg font-semibold">{currentPost ? t('edit_post') : t('create_post')}</h3>
          <div>
            <Label>{t('post_title')}</Label>
            <Input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
          </div>
          <div>
              <Label>{t('cover_image')}</Label>
              <Input type="file" accept="image/*" onChange={(e) => handlePostImageUpload(e, setPostCoverImage)} />
              {postCoverImage && (
                  <div className="relative mt-2 w-full max-w-sm group">
                    <ImageWithSkeleton src={postCoverImage} alt={t("cover_1_rnd5")} className="h-32 w-full object-cover border rounded bg-black/20" containerClassName="h-32 w-full" />
                    <Button 
                        type="button"
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => setPostCoverImage("")}
                    >
                        <IconTrash size={12} />
                    </Button>
                  </div>
              )}
          </div>

          <div>
              <Label>{t('secondary_image')}</Label>
              <Input type="file" accept="image/*" onChange={(e) => handlePostImageUpload(e, setPostCoverImage2)} />
              {postCoverImage2 && (
                  <div className="relative mt-2 w-full max-w-sm group">
                    <ImageWithSkeleton src={postCoverImage2} alt={t("cover_2_rnd5")} className="h-32 w-full object-cover border rounded bg-black/20" containerClassName="h-32 w-full" />
                    <Button 
                        type="button"
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => setPostCoverImage2("")}
                    >
                        <IconTrash size={12} />
                    </Button>
                  </div>
              )}
          </div>
          <div>
            <Label>{t('content')}</Label>
            <RichTextEditor value={postContent} onChange={setPostContent} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSavePost} disabled={loading}>
              <IconDeviceFloppy className="mr-2 h-4 w-4" /> {t('save')}
            </Button>
            <Button variant="outline" onClick={() => {
                setIsEditingPost(false)
                setCurrentPost(null)
                setPostTitle("")
                setPostContent("")
                setPostCoverImage("")
                setPostCoverImage2("")
            }}>{t('cancel')}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post._id} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 transition-colors">
                <div className="flex gap-4 items-center">
                    {post.images && post.images.length > 0 && (
                        <ImageWithSkeleton src={post.images[0]} alt={post.title} className="w-16 h-16 object-cover rounded" containerClassName="w-16 h-16" />
                    )}
                    <div>
                        <div className="font-semibold">{post.title}</div>
                        <div className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditPost(post)}>
                        <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post)} className="text-red-500 hover:text-red-700">
                        <IconTrash className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">{t('no_posts')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
