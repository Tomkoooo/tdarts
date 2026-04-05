import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/getServerUser"
import MyClubClient from "./MyClubClient"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function MyClubPage({ params }: Props) {
  const { locale } = await params
  const user = await getServerUser()
  if (!user?._id) {
    redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/myclub`)}`)
  }
  return <MyClubClient userId={user._id} />
}
