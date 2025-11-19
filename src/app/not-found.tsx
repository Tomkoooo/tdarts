import Link from 'next/link';
import { IconHome, IconSearch } from '@tabler/icons-react';

export default function NotFound() {
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
            Oldal nem található
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            A keresett oldal nem létezik vagy áthelyezésre került.
          </p>
          <p className="text-muted-foreground">
            Ellenőrizd az URL-t vagy használd a navigációs menüket a megfelelő oldal eléréséhez.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/"
            className="flex items-center space-x-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg shadow-primary/30"
          >
            <IconHome size={20} />
            <span>Főoldal</span>
          </Link>
          
          <Link 
            href="/search"
            className="flex items-center space-x-2 px-8 py-4 bg-card text-foreground rounded-lg hover:bg-accent transition-all duration-200 font-semibold border border-primary/20"
          >
            <IconSearch size={20} />
            <span>Versenyek Keresése</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-card/60 rounded-2xl border border-primary/10">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Segítségre van szükséged?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Gyakori oldalak:</h4>
              <ul className="space-y-1">
                <li>• <Link href="/" className="text-primary hover:text-primary/80 transition-colors">Főoldal</Link></li>
                <li>• <Link href="/search" className="text-primary hover:text-primary/80 transition-colors">Versenyek</Link></li>
                <li>• <Link href="/how-it-works" className="text-primary hover:text-primary/80 transition-colors">Hogyan működik</Link></li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Hasznos linkek:</h4>
              <ul className="space-y-1">
                <li>• <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">Bejelentkezés</Link></li>
                <li>• <Link href="/auth/register" className="text-primary hover:text-primary/80 transition-colors">Regisztráció</Link></li>
                <li>• <Link href="/search" className="text-primary hover:text-primary/80 transition-colors">Klub keresése</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
