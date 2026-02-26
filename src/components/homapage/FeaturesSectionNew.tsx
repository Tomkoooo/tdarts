import React from 'react';
import { Link } from '@/i18n/routing';
import { 
  IconSearch, IconBolt, IconTrophy, IconUsers, IconChartBar, 
  IconSettings, IconQrcode, IconShield, IconDeviceTablet, 
  IconArrowRight, IconSparkles 
} from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const FeaturesSectionNew = () => {
  const t = useTranslations('Features');

  const features = [
    {
      icon: IconSearch,
      title: t('items.search.title'),
      description: t('items.search.description'),
      color: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
      badge: t('items.search.badge')
    },
    {
      icon: IconTrophy,
      title: t('items.draw.title'),
      description: t('items.draw.description'),
      color: 'from-primary/15 to-accent/5',
      iconColor: 'text-primary',
      badge: t('items.draw.badge')
    },
    {
      icon: IconUsers,
      title: t('items.club.title'),
      description: t('items.club.description'),
      color: 'from-accent/20 to-primary/5',
      iconColor: 'text-accent'
    },
    {
      icon: IconChartBar,
      title: t('items.stats.title'),
      description: t('items.stats.description'),
      color: 'from-success/20 to-success/5',
      iconColor: 'text-success',
      badge: t('items.stats.badge')
    },
    {
      icon: IconBolt,
      title: t('items.realtime.title'),
      description: t('items.realtime.description'),
      color: 'from-warning/20 to-warning/5',
      iconColor: 'text-warning'
    },
    {
      icon: IconSettings,
      title: t('items.custom.title'),
      description: t('items.custom.description'),
      color: 'from-info/20 to-info/5',
      iconColor: 'text-info'
    },
    {
      icon: IconQrcode,
      title: t('items.qr.title'),
      description: t('items.qr.description'),
      color: 'from-primary/15 to-success/5',
      iconColor: 'text-success'
    },
    {
      icon: IconDeviceTablet,
      title: t('items.tablet.title'),
      description: t('items.tablet.description'),
      color: 'from-info/15 to-primary/5',
      iconColor: 'text-info'
    },
    {
      icon: IconShield,
      title: t('items.secure.title'),
      description: t('items.secure.description'),
      color: 'from-destructive/15 to-destructive/5',
      iconColor: 'text-destructive'
    }
  ];

  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20 space-y-4">
          <Badge variant="secondary" className="mb-4">
            <IconSparkles className="w-4 h-4 mr-2" />
            {t('badge')}
          </Badge>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
            {t('title')}
          </h2>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <Card 
                key={index} 
                className={cn(
                  "group relative overflow-hidden transition-all duration-500",
                  "hover:shadow-lg hover:shadow-black/30",
                  "hover:-translate-y-1",
                  "border-primary/20 bg-card/50 backdrop-blur-sm"
                )}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >

                
                <CardHeader className="relative">
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon */}
                    <div className="relative">
                      <div className={cn(
                        "p-3 rounded-xl transition-all duration-300",
                        "bg-muted/50",
                        "group-hover:scale-110"
                      )}>
                        <Icon className={cn("w-7 h-7", feature.iconColor)} />
                      </div>
                      

                    </div>
                    
                    {/* Badge */}
                    {feature.badge && (
                      <Badge 
                        variant={feature.badge === t('items.stats.badge') ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative">
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 sm:mt-20 space-y-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t('cta.title')}
            </h3>
            <p className="text-muted-foreground">
              {t('cta.description')}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="gap-2 group" asChild>
              <Link href="/how-it-works">
                {t('cta.how_it_works')}
                <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link href="/auth/register">
                {t('cta.register')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
};

export default FeaturesSectionNew;

