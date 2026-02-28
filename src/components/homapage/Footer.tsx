
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');
  const partners = [
    {
      src: '/partners/mdsz_logo.png',
      alt: t("magyar_darts_szovetseg_1x63"),
      href: "https://magyardarts.hu",
    },
    {
      src: '/partners/dartsbarlang_logo.png',
      alt: t("dartsbarlang_slgh"),
      href: "https://dartsbarlang.hu",
    },
    {
      src: '/partners/remiz_logo.png',
      alt: t("remiz_sport_es_esemenykozpont_7fgn"),
      href: "https://www.facebook.com/p/Remiz-Event-61571072083039/",
    },
    {
      src: '/partners/efott_logo.png',
      alt: "EFOTT",
      href:"https://hookalapitvany.hu"
    },
  ];

  return (
    <footer className=" z-10 bg-[#4a2828] text-foreground border-t border-border mt-auto w-full">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Legal & Info */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-lg mb-2">{t('legal_title')}</h3>
            <a href="gdpr.pdf" className="hover:text-primary transition-colors text-muted-foreground">
              {t('privacy')}
            </a>
            <Link href="/terms" className="hover:text-primary transition-colors text-muted-foreground">
              {t('terms')}
            </Link>
            <Link href="/feedback" className="hover:text-primary transition-colors text-muted-foreground">
              {t('contact')}
            </Link>
            <p className="text-sm text-muted-foreground mt-auto pt-4">
              {t("copy_jk6j")}{new Date().getFullYear()} {t("tdarts_vlt8")}{t('all_rights_reserved')}
            </p>
          </div>

          {/* Column 2: Maintainer & OAC */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-lg mb-2">{t('network_title')}</h3>
            <div className="flex flex-col space-y-2">
              <p className="text-muted-foreground">
                {t('maintainer')}
                <Link
                  href="https://sironic.hu" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {t('sironic')}
                </Link>
              </p>
              
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm font-semibold mb-2 text-foreground">{t('oac_info')}</p>
                <Button 
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link 
                    href="https://amator.tdarts.hu" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {t('oac_button')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Column 3: Partners */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-bold text-lg mb-2">{t('partners_title')}</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
              {partners.map((partner) => (
                <div
                  key={partner.src}
                  className="bg-white p-2 rounded-lg transition duration-300 flex items-center justify-center h-20 sm:h-24 w-full relative"
                >
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    fill
                    className="object-contain p-1 cursor-pointer"
                    onClick={() => window.open(partner.href, '_blank')}
                  />
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              {t('partners_note')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
