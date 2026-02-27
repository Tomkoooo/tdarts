"use client"

import * as React from "react"
import toast from "react-hot-toast"
import { IconQrcode, IconCopy, IconLogin, IconMapPin, IconNews, IconPhone, IconMail, IconWorld } from "@tabler/icons-react"
import axios from "axios"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import PostDetailModal from "@/components/club/PostDetailModal"
import { Club } from "@/interface/club.interface"
import { differenceInDays, format } from "date-fns"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { stripLocalePrefix } from "@/lib/seo"

// ... imports
import ClubGallerySection from "@/components/club/ClubGallerySection"

// ... inside the component JSX (replacing lines 179-190)




interface ClubSummarySectionProps {
  club: Club
  code: string
  user?: {
    _id: string
  } | null
  onShareClick: () => void
  aboutText?: string
  gallery?: string[]
  posts?: any[]
  postsTotal?: number
  onLoadMorePosts?: () => void
}

export default function ClubSummarySection({
  club,
  code,
  user,
  onShareClick,
  aboutText,
  posts,
  postsTotal = 0,
  onLoadMorePosts
}: ClubSummarySectionProps) {
  const t = useTranslations('Club.summary')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedPost, setSelectedPost] = React.useState<any>(null)
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [subLoading, setSubLoading] = React.useState(false)

  // Fetch subscription status
  React.useEffect(() => {
    if (user && club._id) {
        axios.get(`/api/clubs/${club._id}/subscribe`)
            .then(res => setIsSubscribed(res.data.subscribed))
            .catch(err => console.error("Failed to fetch sub status:", err))
    }
  }, [user, club._id])

  const handleToggleSubscription = async () => {
      if (!user) {
          const normalizedPath = stripLocalePrefix(window.location.pathname || "/")
          router.push(`/auth/login?redirect=${encodeURIComponent(normalizedPath)}`)
          return
      }

      setSubLoading(true)
      try {
          const res = await axios.post(`/api/clubs/${club._id}/subscribe`)
          setIsSubscribed(res.data.subscribed)
          toast.success(res.data.subscribed ? t('toast.subscribed') : t('toast.unsubscribed'))
      } catch {
          toast.error(t('toast.error'))
      } finally {
          setSubLoading(false)
      }
  }

  // Handle URL "postId" parameter
  React.useEffect(() => {
      const postId = searchParams.get('postId')
      if (postId && club._id) {
          // Check if it's already loaded in visible posts
          const existingPost = posts?.find(p => p._id === postId)
          if (existingPost) {
              setSelectedPost(existingPost)
          } else {
              // Fetch individually
              axios.get(`/api/clubs/${club._id}/posts/${postId}`)
                  .then(res => {
                      setSelectedPost(res.data)
                  })
                  .catch(err => {
                      console.error("Failed to fetch post:", err)
                      toast.error(t('toast.post_not_found'))
                  })
          }
      }
  }, [searchParams, posts, club._id])

  const handleCloseModal = () => {
      setSelectedPost(null)
      // Remove query param without refreshing
      const url = new URL(window.location.href)
      if (url.searchParams.has('postId')) {
          url.searchParams.delete('postId')
          const normalizedPath = stripLocalePrefix(url.pathname || "/")
          const nextUrl = `${normalizedPath}${url.search}`
          router.replace(nextUrl, { scroll: false })
      }
  }

  // Calculate stats
  const numPlayers = club.members.length
  const tournaments = club.tournaments || []
  const pastTournaments = tournaments.filter(t => t.tournamentSettings?.status === 'finished').length
  const ongoingTournaments = tournaments.filter(t => 
    t.tournamentSettings?.status === 'group-stage' || t.tournamentSettings?.status === 'knockout'
  ).length
  const upcomingTournaments = tournaments.filter(t => t.tournamentSettings?.status === 'pending').length
  const totalTournamentPlayers = tournaments.reduce((total, tournament) => {
    return total + (tournament.tournamentPlayers?.length || 0)
  }, 0)

  const handleCopyLink = () => {
    const loginLink = `${window.location.origin}/auth/login?redirect=${encodeURIComponent(`/clubs/${code}?page=tournaments`)}`
    navigator.clipboard.writeText(loginLink)
    toast.success(t('toast.link_copied'))
  }

  const isPostNew = (dateString: string) => {
      return differenceInDays(new Date(), new Date(dateString)) <= 3
  }

  return (
    <div className="space-y-6">
      {/* Club Info Card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {club.name}
              </h2>
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconMapPin className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-foreground">{club.location}</span>
                </div>
                {club.contact?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconPhone className="h-4 w-4 shrink-0" />
                    <a href={`tel:${club.contact.phone}`} className="font-medium text-foreground hover:underline">{club.contact.phone}</a>
                  </div>
                )}
                {club.contact?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconMail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${club.contact.email}`} className="font-medium text-foreground hover:underline">{club.contact.email}</a>
                  </div>
                )}
                {club.contact?.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconWorld className="h-4 w-4 shrink-0" />
                    <a href={club.contact.website} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">{club.contact.website}</a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShareClick}
                  >
                    <IconQrcode className="w-4 h-4 mr-2" />
                    {t('share')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                  >
                    <IconCopy className="w-4 h-4 mr-2" />
                    {t('copy_link')}
                  </Button>
                  <Button
                    variant={isSubscribed ? "secondary" : "default"}
                    size="sm"
                    onClick={handleToggleSubscription}
                    disabled={subLoading}
                  >
                    {isSubscribed ? (
                         <div className="flex items-center">
                            <IconNews className="w-4 h-4 mr-2" />
                            {t('subscribed')}
                         </div>
                      ) : (
                         <div className="flex items-center">
                            <IconNews className="w-4 h-4 mr-2" />
                            {t('subscribe')}
                         </div>
                      )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSubscription}
                  >
                    <IconNews className="w-4 h-4 mr-2" />
                    {t('subscribe')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShareClick}
                  >
                    <IconQrcode className="w-4 h-4 mr-2" />
                    {t('share')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(`/clubs/${code}?page=tournaments`)}`)}
                  >
                    <IconLogin className="w-4 h-4 mr-2" />
                    {t('login')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      {(aboutText || club.description) && (
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-foreground">{t('about')}</h3>
            <div 
              className="prose dark:prose-invert max-w-none text-muted-foreground break-words overflow-hidden" 
              dangerouslySetInnerHTML={{ __html: aboutText || club.description }} 
            />
          </CardContent>
        </Card>
      )}

      {/* Gallery Section */}
      <ClubGallerySection clubId={club._id} />

      {/* Posts Section */}
      <div className="space-y-4">
         <h3 className="text-xl font-semibold text-foreground px-1">{t('news')}</h3>
         {posts && posts.length > 0 ? (
           <div className="space-y-4">
             {posts.map((post) => (
              <Card key={post._id} className="overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="flex flex-col md:flex-row">
                      {/* Cover Image - Use first image */}
                      {post.images?.[0] && (
                          <div className="w-full md:w-64 h-48 md:h-auto shrink-0 bg-secondary/20 overflow-hidden">
                            <ImageWithSkeleton 
                                src={post.images[0]} 
                                alt={post.title} 
                                containerClassName="w-full h-full"
                                className="w-full h-full object-cover"
                            />
                          </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-2 gap-2">
                             <div className="flex items-center gap-2">
                                <h4 className="text-lg font-bold line-clamp-1">{post.title}</h4>
                                {isPostNew(post.createdAt) && <Badge className="bg-blue-600 hover:bg-blue-700 shrink-0">{t('new_badge')}</Badge>}
                             </div>
                             <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(post.createdAt), 'yyyy. MM. dd.')}
                             </span>
                          </div>
                          
                          <div className="text-muted-foreground text-sm mb-4 line-clamp-2 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
                          
                          <div className="mt-auto flex justify-between items-center pt-2">
                              <span className="text-xs text-muted-foreground">
                                  {t('published_by')} {post.authorId?.name || 'Admin'}
                              </span>
                              <Button variant="outline" size="sm" onClick={() => setSelectedPost(post)}>
                                  {t('details')}
                              </Button>
                          </div>
                      </div>
                  </div>
              </Card>
             ))}

             {/* Load More Button */}
             {posts.length < postsTotal && (
                <div className="flex justify-center pt-4">
                   <Button variant="secondary" onClick={onLoadMorePosts}>
                       {t('load_more_news')}
                   </Button>
                </div>
             )}
           </div>
         ) : (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
                <div className="flex flex-col items-center">
                    <IconNews className="h-10 w-10 mb-2 opacity-50" />
                    <p>{t('no_news')}</p>
                </div>
            </Card>
         )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-8 border-t">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-primary">
              {numPlayers}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              {t('stats.player')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-accent">
              {pastTournaments}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              {t('stats.finished_tournament')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-success">
              {ongoingTournaments + upcomingTournaments}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              {t('stats.active_upcoming')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-warning">
              {totalTournamentPlayers}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              {t('stats.total_players')}
            </span>
          </CardContent>
        </Card>
      </div>

      <PostDetailModal 
          isOpen={!!selectedPost} 
          onClose={handleCloseModal}
          post={selectedPost}
          clubCode={code}
      />
    </div>
  )
}
