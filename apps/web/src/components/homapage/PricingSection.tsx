import React from 'react';
import { IconCheck, IconX, IconCrown, IconStar, IconTrophy, IconInfinity, IconSparkles } from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const PricingSection = () => {
  const t = useTranslations('Pricing');

  const packages = [
    {
      name: t('packages.free.name'),
      price: '0 Ft',
      period: t('period_alt'),
      description: t('packages.free.description'),
      features: [
        { text: t('features.one_tournament'), included: true },
        { text: t('features.unlimited_users'), included: true },
        { text: t('features.live_tracking'), included: false },
        { text: t('features.league_start'), included: false },
        { text: t('features.detailed_stats'), included: false },
      ],
      popular: false,
      icon: IconStar,
      variant: 'outline' as const
    },
    {
      name: t('packages.basic.name'),
      price: '0',
      period: ` ${t('period')}`,
      description: t('packages.basic.description'),
      features: [
        { text: t('features.two_tournaments'), included: true },
        { text: t('features.unlimited_users'), included: true },
        { text: t('features.live_tracking'), included: false },
        { text: t('features.league_start'), included: true },
        { text: t('features.detailed_stats'), included: false },
      ],
      popular: false,
      icon: IconTrophy,
      variant: 'outline' as const
    },
    {
      name: t('packages.pro.name'),
      price: '0',
      period: ` ${t('period')}`,
      description: t('packages.pro.description'),
      features: [
        { text: t('features.four_tournaments'), included: true },
        { text: t('features.unlimited_users'), included: true },
        { text: t('features.live_tracking'), included: false },
        { text: t('features.league_start'), included: true },
        { text: t('features.detailed_stats'), included: true },
      ],
      popular: true,
      icon: IconCrown,
      variant: 'default' as const
    },
    {
      name: t('packages.enterprise.name'),
      price: '0',
      period: ` ${t('period')}`,
      description: t('packages.enterprise.description'),
      features: [
        { text: t('features.unlimited_tournaments'), included: true },
        { text: t('features.unlimited_users'), included: true },
        { text: t('features.live_tracking'), included: true },
        { text: t('features.league_start'), included: true },
        { text: t('features.detailed_stats'), included: true },
      ],
      popular: false,
      icon: IconInfinity,
      variant: 'outline' as const
    }
  ];

  return (
    <section id="pricing" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 relative">
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            
            return (
              <Card 
              key={index}
                className={cn(
                  "group relative transition-all duration-300",
                  "hover:shadow-lg hover:shadow-black/30",
                  "border-primary/20 bg-card/50 backdrop-blur-sm",
                  pkg.popular && "ring-2 ring-primary shadow-primary/20"
                )}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-lg">
                    {t('popular')}
                    </Badge>
                </div>
              )}

                <CardHeader className="text-center space-y-4 pt-8">
              {/* Package Icon */}
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-primary" />
              </div>

              {/* Package Info */}
                  <div>
                    <CardTitle className="text-2xl mb-2">{pkg.name}</CardTitle>
                    <div className="mb-3">
                      <span className="text-4xl font-bold text-foreground">{pkg.price}</span>
                      <span className="text-muted-foreground">{pkg.period}</span>
                </div>
                    <CardDescription className="text-sm">
                      {pkg.description}
                    </CardDescription>
              </div>
                </CardHeader>

                <CardContent className="space-y-4">
              {/* Features */}
                {pkg.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                    {feature.included ? (
                        <IconCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                        <IconX className="w-5 h-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    )}
                      <span className={cn(
                        "text-sm",
                        feature.included ? "text-foreground" : "text-muted-foreground/70"
                      )}>
                      {feature.text}
                    </span>
                  </div>
                ))}
                </CardContent>

                <CardFooter>
                  <Button 
                    variant={pkg.variant}
                    size="lg" 
                    className="w-full"
                  >
                {pkg.name === t('packages.free.name') ? t('cta_free') : t('cta_test')}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('test_note')}
          </p>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
};

export default PricingSection;
 