"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUserContext } from "@/hooks/useUser"
import { Club } from "@/interface/club.interface"
import ClubRegistrationForm from "@/components/club/ClubRegistrationForm"
import { showErrorToast } from "@/lib/toastUtils"
import axios from "axios"
import { IconUsersGroup, IconSparkles } from "@tabler/icons-react"
import { LoadingScreen } from "@/components/ui/loading-spinner"

export default function MyClubPage() {
  const { user } = useUserContext()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(true)
  const [clubs, setClubs] = React.useState<Club[]>([])

  React.useEffect(() => {
    const checkUserClubs = async () => {
      if (!user) {
        // Redirect to login if no user is logged in
        router.push("/auth/login")
        return
      }

      try {
        // Fetch user's clubs
        const response = await axios.get<Club[]>(`/api/clubs/user?userId=${user._id}`)
        const userClubs = response.data
        setClubs(userClubs)

        if (userClubs.length > 0) {
          // Redirect to the first club's page if user is associated with a club
          router.push(`/clubs/${userClubs[0]._id}`)
        }
      } catch (error: any) {
        showErrorToast("Hiba történt a klubok lekérdezése során", {
          error: error?.response?.data?.error,
          context: "Saját klub ellenőrzés",
          errorName: "Klubok lekérdezése sikertelen",
        })
        console.error("Error fetching user clubs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserClubs()
  }, [user, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingScreen text="Klubok betöltése..." />
      </div>
    )
  }

  // Show registration form if user has no clubs
  if (user && clubs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <section className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full border-2 border-primary/20 mb-6">
                <IconUsersGroup className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                Új Klub Regisztrálása
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Hozz létre egy új darts klubot, és kezdd el szervezni a közösségi eseményeket!
              </p>
              
              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
                {[
                  {
                    icon: IconSparkles,
                    title: "Szervezz tornákat",
                    description: "Hozz létre és kezelj versenyeket",
                  },
                  {
                    icon: IconUsersGroup,
                    title: "Építs közösséget",
                    description: "Kezeld tagjaidat és játékosokat",
                  },
                  {
                    icon: IconSparkles,
                    title: "Követd az eredményeket",
                    description: "Részletes statisztikák és ranglista",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm"
                  >
                    <feature.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Form */}
            <ClubRegistrationForm userId={user._id} />
          </div>
        </section>
      </div>
    )
  }

  // Return null while redirecting (handled by useEffect)
  return null
}
