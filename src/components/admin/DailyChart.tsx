"use client"
import { useTranslations } from "next-intl";

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { IconTrendingUp, IconTrendingDown, IconRefresh } from '@tabler/icons-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DailyChartProps {
  title: string
  apiEndpoint: string
  color?: string
  icon?: React.ReactNode
}

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
  }[]
}

export default function DailyChart({ title, apiEndpoint, color = 'primary', icon }: DailyChartProps) {
    const t = useTranslations("Admin.components");
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(apiEndpoint)
      
      // Handle different API response formats
      if (response.data && response.data.labels && response.data.datasets) {
        setData(response.data)
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const apiData = response.data.data
        const labels = apiData.map((item: any) => item.date || item.formattedDate || formatDate(item.date))
        const data = apiData.map((item: any) => item.count || 0)
        
        setData({
          labels: labels,
          datasets: [{
            label: title,
            data: data,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgb(59, 130, 246)'
          }]
        })
      } else if (Array.isArray(response.data)) {
        const labels = response.data.map((item: any) => item.date || item.formattedDate || formatDate(item.date))
        const data = response.data.map((item: any) => item.count || 0)
        
        setData({
          labels: labels,
          datasets: [{
            label: title,
            data: data,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgb(59, 130, 246)'
          }]
        })
      } else {
        setError(t("ismeretlen_adatformatum_v65o"))
      }
    } catch (error) {
      console.error(`Error fetching ${title} data:`, error)
      setError(t("hiba_tortent_az_adatok_qmk8"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [apiEndpoint])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('hu-HU', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getTotalCount = () => {
    if (!data?.datasets?.[0]?.data) return 0
    return data.datasets[0].data.reduce((sum, count) => sum + count, 0)
  }

  const getAverageCount = () => {
    if (!data?.datasets?.[0]?.data || data.datasets[0].data.length === 0) return 0
    return Math.round(getTotalCount() / data.datasets[0].data.length * 10) / 10
  }

  const getTrend = () => {
    if (!data?.datasets?.[0]?.data || data.datasets[0].data.length < 2) return 0
    const firstHalf = data.datasets[0].data.slice(0, Math.floor(data.datasets[0].data.length / 2))
    const secondHalf = data.datasets[0].data.slice(Math.floor(data.datasets[0].data.length / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, count) => sum + count, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, count) => sum + count, 0) / secondHalf.length
    
    if (firstHalfAvg === 0) return 0
    return Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
  }

  const trend = getTrend()
  const totalCount = getTotalCount()
  const averageCount = getAverageCount()

  const getChartColors = () => {
    switch (color) {
      case 'primary':
        return { fill: 'rgba(59, 130, 246, 0.1)', stroke: 'rgb(59, 130, 246)', gradient: 'rgba(59, 130, 246, 0.3)' }
      case 'secondary':
        return { fill: 'rgba(139, 92, 246, 0.1)', stroke: 'rgb(139, 92, 246)', gradient: 'rgba(139, 92, 246, 0.3)' }
      case 'accent':
        return { fill: 'rgba(236, 72, 153, 0.1)', stroke: 'rgb(236, 72, 153)', gradient: 'rgba(236, 72, 153, 0.3)' }
      case 'success':
        return { fill: 'rgba(34, 197, 94, 0.1)', stroke: 'rgb(34, 197, 94)', gradient: 'rgba(34, 197, 94, 0.3)' }
      case 'warning':
        return { fill: 'rgba(245, 158, 11, 0.1)', stroke: 'rgb(245, 158, 11)', gradient: 'rgba(245, 158, 11, 0.3)' }
      case 'error':
        return { fill: 'rgba(239, 68, 68, 0.1)', stroke: 'rgb(239, 68, 68)', gradient: 'rgba(239, 68, 68, 0.3)' }
      case 'info':
        return { fill: 'rgba(6, 182, 212, 0.1)', stroke: 'rgb(6, 182, 212)', gradient: 'rgba(6, 182, 212, 0.3)' }
      default:
        return { fill: 'rgba(59, 130, 246, 0.1)', stroke: 'rgb(59, 130, 246)', gradient: 'rgba(59, 130, 246, 0.3)' }
    }
  }

  const chartColors = getChartColors()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">{`Dátum: ${formatDate(label)}`}</p>
          <p className="text-sm text-primary font-semibold">{`Mennyiség: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card  className="backdrop-blur-xl bg-card/30">
        <CardContent className="p-6">
        <div className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-64 w-full" />
        </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card  className="backdrop-blur-xl bg-card/30">
        <CardContent className="p-6">
        <div className="text-center">
            <div className="text-destructive text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-destructive mb-2">{t("hiba_történt")}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline" className="gap-2">
              <IconRefresh className="size-4" />
            {t("újrapróbálás")}</Button>
        </div>
        </CardContent>
      </Card>
    )
  }

    const chartData = data?.labels?.map((label, index) => ({
      date: label,
      count: data.datasets[0].data[index] || 0,
      formattedDate: label
  })) || []

  return (
    <Card  className="backdrop-blur-xl bg-card/30">
      <CardHeader>
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="text-2xl">{icon}</div>}
            <CardTitle>{title}</CardTitle>
          </div>
          <Button onClick={fetchData} variant="ghost" size="icon">
            <IconRefresh className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
            <p className="text-sm text-muted-foreground">{t("összesen_nap")}</p>
          <p className="text-2xl font-bold text-primary">{totalCount}</p>
        </div>
        <div className="text-center">
            <p className="text-sm text-muted-foreground">{t("átlagos_nap")}</p>
          <p className="text-2xl font-bold text-info">{averageCount}</p>
        </div>
        <div className="text-center">
            <p className="text-sm text-muted-foreground">{t("trend")}</p>
          <div className="flex items-center justify-center gap-1">
            {trend > 0 ? (
                <IconTrendingUp className="size-5 text-success" />
            ) : trend < 0 ? (
                <IconTrendingDown className="size-5 text-destructive" />
            ) : (
                <span className="text-muted-foreground/40">-</span>
            )}
              <span className={cn("font-bold", trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground/40')}>
              {Math.abs(trend)}%
            </span>
          </div>
        </div>
      </div>

        {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.stroke} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColors.stroke} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(156, 163, 175, 0.2)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="formattedDate" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
              tickFormatter={(value, index) => index % 5 === 0 ? value : ''}
            />
            
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
              tickFormatter={(value) => value}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="count"
              stroke={chartColors.stroke}
              strokeWidth={2}
              fill={`url(#color-${color})`}
              dot={{ fill: chartColors.stroke, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: chartColors.stroke, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
          {t("az_előző_nap")}</p>
      </div>
      </CardContent>
    </Card>
  )
}
