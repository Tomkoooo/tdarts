"use client"

import * as React from "react"
import { useRouter } from "@/i18n/routing"
import { Club } from "@/interface/club.interface"
import ClubRegistrationForm from "@/components/club/ClubRegistrationForm"
import { showErrorToast } from "@/lib/toastUtils"
import { getUserClubsAction } from "@/features/clubs/actions/getUserClubs.action"
import { IconUsersGroup, IconSparkles } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  userId: string
}

export default function MyClubClient({ userId }: Props) {
  const t = useTranslations("Club.pages")
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(true)
  const [clubs, setClubs] = React.useState<Club[]>([])

  React.useEffect(() => {
    const checkUserClubs = async () => {
      try {
        const result = await getUserClubsAction()
        const rawClubs =
          result &&
          typeof result === "object" &&
          "clubs" in result &&
          Array.isArray((result as { clubs?: unknown[] }).clubs)
            ? ((result as { clubs?: unknown[] }).clubs || [])
            : []
        const userClubs = rawClubs.filter(
          (club): club is Club => !!club && typeof club === "object" && "_id" in (club as Record<string, unknown>)
        )
        setClubs(userClubs)

        if (userClubs.length > 0) {
          router.push(`/clubs/${userClubs[0]._id}`)
        }
      } catch (error: any) {
        showErrorToast(t("hiba_tortent_a_klubok_oqbq"), {
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
  }, [router, t])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
          <Skeleton className="mx-auto h-12 w-80 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (clubs.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background to-muted/20">
        <section className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full border-2 border-primary/20 mb-6">
                <IconUsersGroup className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("uj_klub_regisztralasa_8231")}</h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">{t("hozz_letre_egy_uj_d07t")}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
                {[
                  {
                    icon: IconSparkles,
                    title: t("szervezz_tornakat_pgxr"),
                    description: t("feature_tournaments_description"),
                  },
                  {
                    icon: IconUsersGroup,
                    title: t("epits_kozosseget_qsy3"),
                    description: t("feature_members_description"),
                  },
                  {
                    icon: IconSparkles,
                    title: t("kovetd_az_eredmenyeket_xpkq"),
                    description: t("feature_stats_description"),
                  },
                ].map((feature, index) => (
                  <div key={index} className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm">
                    <feature.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <ClubRegistrationForm userId={userId} />
          </div>
        </section>
      </div>
    )
  }

  return null
}
