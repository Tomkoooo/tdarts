import { Link } from '@/i18n/routing';
import { IconHome, IconSearch } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('NotFound');
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <div className="w-32 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            {t('description')}
          </p>
          <p className="text-muted-foreground">
            {t('help_text')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/"
            className="flex items-center space-x-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg shadow-primary/30"
          >
            <IconHome size={20} />
            <span>{t('back_home')}</span>
          </Link>
          
          <Link 
            href="/search"
            className="flex items-center space-x-2 px-8 py-4 bg-card text-foreground rounded-lg hover:bg-accent transition-all duration-200 font-semibold border border-primary/20"
          >
            <IconSearch size={20} />
            <span>{t('search_tournaments')}</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-card/60 rounded-2xl border border-primary/10">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            {t('need_help')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">{t('common_pages')}</h4>
              <ul className="space-y-1">
                <li>• <Link href="/" className="text-primary hover:text-primary/80 transition-colors">{t('back_home')}</Link></li>
                <li>• <Link href="/search" className="text-primary hover:text-primary/80 transition-colors">{t('search_tournaments')}</Link></li>
                <li>• <Link href="/how-it-works" className="text-primary hover:text-primary/80 transition-colors">{t('how_it_works')}</Link></li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">{t('useful_links')}</h4>
              <ul className="space-y-1">
                <li>• <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">{t('login')}</Link></li>
                <li>• <Link href="/auth/register" className="text-primary hover:text-primary/80 transition-colors">{t('register')}</Link></li>
                <li>• <Link href="/search" className="text-primary hover:text-primary/80 transition-colors">{t('club_search')}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
