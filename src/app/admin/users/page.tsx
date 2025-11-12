"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { IconUsers, IconSearch, IconRefresh } from "@tabler/icons-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

const PANEL_SHADOW = "shadow-lg shadow-black/35"

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface UsersResponse {
  total: number
  admins: number
  moderators: number
  members: number
  users: AdminUser[]
}

const FALLBACK_RESPONSE: UsersResponse = {
  total: 0,
  admins: 0,
  moderators: 0,
  members: 0,
  users: [],
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse>(FALLBACK_RESPONSE)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchUsers = async () => {
    try {
      setIsRefreshing(true)
      const response = await axios.get("/api/admin/users")
      const payload: UsersResponse = response.data?.data ?? response.data ?? FALLBACK_RESPONSE
      setData({
        total: payload.total ?? 0,
        admins: payload.admins ?? 0,
        moderators: payload.moderators ?? 0,
        members: payload.members ?? 0,
        users: Array.isArray(payload.users) ? payload.users : [],
      })
    } catch (error) {
      console.error("Failed to fetch admin users", error)
      setData(FALLBACK_RESPONSE)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = data.users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.role}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl bg-card/70" />
          <p className="text-sm text-muted-foreground">Felhasználók betöltése…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 pt-4">
      <Card className={`relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background p-8 ${PANEL_SHADOW}`}>
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <IconUsers className="h-10 w-10" />
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
                Közösségmenedzsment
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Felhasználók</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Teljes felhasználói lista szerepkörökkel, aktivitással és regisztrációs időponttal. A részletes szűrés és
              exportálás hamarosan elérhető.
            </p>
          </div>
          <Button
            onClick={fetchUsers}
            disabled={isRefreshing}
            className={`gap-2 bg-card/90 text-foreground hover:bg-card ${PANEL_SHADOW}`}
          >
            <IconRefresh className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Frissítés
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`bg-card/90 p-6 ${PANEL_SHADOW}`}>
          <CardHeader className="p-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Összes felhasználó
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <CardTitle className="text-3xl font-bold text-foreground">{data.total.toLocaleString("hu-HU")}</CardTitle>
            <p className="text-xs text-muted-foreground">Aktív felhasználói fiókok</p>
          </CardContent>
        </Card>
        <Card className={`bg-card/90 p-6 ${PANEL_SHADOW}`}>
          <CardHeader className="p-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Adminok</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <CardTitle className="text-3xl font-bold text-foreground">{data.admins}</CardTitle>
            <p className="text-xs text-muted-foreground">Rendszer szintű jogosultsággal</p>
          </CardContent>
        </Card>
        <Card className={`bg-card/90 p-6 ${PANEL_SHADOW}`}>
          <CardHeader className="p-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Moderátorok</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <CardTitle className="text-3xl font-bold text-foreground">{data.moderators}</CardTitle>
            <p className="text-xs text-muted-foreground">Klub vagy torna kezelők</p>
          </CardContent>
        </Card>
      </div>

      <Card className={`bg-card/90 ${PANEL_SHADOW}`}>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Felhasználói lista</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {filteredUsers.length} találat a {data.total} felhasználóból.
            </CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Keresés név, e-mail vagy szerepkör alapján"
              className="h-11 rounded-xl bg-muted/40 pl-10 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Név</th>
                  <th className="px-4 py-3 text-left font-semibold">E-mail</th>
                  <th className="px-4 py-3 text-left font-semibold">Szerepkör</th>
                  <th className="px-4 py-3 text-left font-semibold">Regisztráció</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Nincs a keresésnek megfelelő felhasználó.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="rounded-full px-3 py-0 text-xs uppercase">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("hu-HU")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
