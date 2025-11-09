"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SearchTabsProps {
  activeTab: 'all' | 'tournaments' | 'players' | 'clubs'
  onTabChange: (tab: 'all' | 'tournaments' | 'players' | 'clubs') => void
}

export function SearchTabs({ activeTab, onTabChange }: SearchTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as any)}>
      <TabsList className="grid w-full grid-cols-4 h-12">
        <TabsTrigger value="all" className="text-base">
          Minden
        </TabsTrigger>
        <TabsTrigger value="tournaments" className="text-base">
          Tornák
        </TabsTrigger>
        <TabsTrigger value="players" className="text-base">
          Játékosok
        </TabsTrigger>
        <TabsTrigger value="clubs" className="text-base">
          Klubok
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default SearchTabs

