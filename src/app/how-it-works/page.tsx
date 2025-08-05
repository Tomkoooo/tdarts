'use client';

import React, { useState } from 'react';
import { IconUserPlus, IconBuilding, IconUsers, IconTrophy, IconClipboardCheck, IconUsersGroup, IconSword, IconTarget, IconEye, IconFlagCheck } from '@tabler/icons-react';

import Link from 'next/link';

const HowItWorksPage = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 0,
      title: 'Regisztráció és Bejelentkezés',
      icon: IconUserPlus,
      description: 'Első lépés a platform használatához',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A tDarts platform használatához először regisztrálnod kell egy fiókot. A jobb felső sarokban található &ldquo;Bejelentkezés&rdquo; gombra kattintva, majd a &ldquo;Regisztráció&rdquo; menüpont kiválasztásával hozhatod létre a fiókodat.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Fontos tudnivalók:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• A regisztráció nem igényel központi jóváhagyást</li>
              <li>• Azonnal használhatod a platformot regisztráció után</li>
              <li>• Email cím és jelszó megadása kötelező</li>
              <li>• Profil adatok később is módosíthatók</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: 'Klub Regisztráció',
      icon: IconBuilding,
      description: 'Klub létrehozása versenyek szervezéséhez',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A regisztrációt követően a &ldquo;Saját klub&rdquo; menüpontban van lehetőség klub létrehozására, amely elengedhetetlen a versenyek felvételéhez. A klub adatainak megadása során szükséges megadni a helyszínt és a táblák számát.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Klub beállítások:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• Klub neve és leírása</li>
              <li>• Helyszín megadása (cím, koordináták)</li>
              <li>• Táblák számának beállítása</li>
              <li>• Táblák egyedi elnevezése (ajánlott)</li>
            </ul>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <p className="text-yellow-400 text-sm">
              <strong>Tipp:</strong> Javasolt a táblák egyedi elnevezése, mivel a rendszer sorszámozza őket, de a nevek statikusak maradnak. QR-kódok használatával a játékosok könnyen azonosíthatják a táblákat.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Klubtagok és Moderátorok',
      icon: IconUsers,
      description: 'Csapat építése és jogosultságok kezelése',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A &ldquo;Beállítások&rdquo; menüpontban a klubhoz új felhasználók adhatók hozzá, akik előzetesen regisztráltak. A kereső segítségével a klubtagok felvehetők, és moderátori jogokat kaphatnak.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Jogosultságok:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Klubtag:</strong> Versenyekre nevezhet, eredményeket nézhet</li>
              <li>• <strong>Moderátor:</strong> Versenyeket indíthat, beállításokat módosíthat</li>
              <li>• <strong>Admin:</strong> Teljes jogosultság a klubon belül</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
            <p className="text-red-400 text-sm">
              <strong>Fontos:</strong> Kizárólag a moderátorok jogosultak versenyek indítására és a versenyek során változtatások végrehajtására.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Verseny Létrehozása',
      icon: IconTrophy,
      description: 'Verseny beállítása és konfigurálása',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A &ldquo;Beállítások&rdquo; menüpontban hozható létre új verseny, ahol megadhatók a részletek: nevezési díj, leírás, helyszín, maximális létszám, torna típusa, valamint a jelentkezési határidő.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Verseny beállítások:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Név és leírás:</strong> Verseny azonosítása</li>
              <li>• <strong>Nevezési díj:</strong> Opcionális díj megadása</li>
              <li>• <strong>Maximális létszám:</strong> Játékosok limitje</li>
              <li>• <strong>Torna típusa:</strong> Csoportkör, egyenes kiesés vagy kombinált</li>
              <li>• <strong>Jelentkezési határidő:</strong> Nevezés zárásának ideje</li>
              <li>• <strong>Táblák kiválasztása:</strong> Melyik táblákat használja a verseny</li>
            </ul>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Új funkció:</strong> A táblák számát a verseny előtt a klub beállításokban lehet módosítani, és csak a kiválasztott táblák lesznek használhatók a versenyben.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: 'Nevezés és Check-in',
      icon: IconClipboardCheck,
      description: 'Játékosok nevezése és aktiválása',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A nyitott nevezésű tornákra az oldalon regisztrált felhasználók jelentkezhetnek, nevük mellett a &ldquo;jelentkezett&rdquo; státusz jelenik meg. Lehetőség van manuális nevezésre és törlésre is.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Nevezési folyamat:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Automatikus nevezés:</strong> Játékosok saját maguk nevezhetnek</li>
              <li>• <strong>Manuális nevezés:</strong> Moderátorok nevezhetnek másokat</li>
              <li>• <strong>Nevezési díj:</strong> Befizetés követése</li>
              <li>• <strong>Check-in:</strong> Megjelenés visszaigazolása</li>
            </ul>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
            <p className="text-green-400 text-sm">
              <strong>Fontos:</strong> A nevezési díjat befizetett és megjelent játékosokat a &ldquo;check-in&rdquo; gombbal lehet aktiválni, a rendszer csak őket sorsolja be a versenybe.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: 'Csoportkör Indítása',
      icon: IconUsersGroup,
      description: 'Csoportok generálása és táblák hozzárendelése',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Csoportkörös torna esetén a &ldquo;Csoportkör generálása&rdquo; gombra kattintva a rendszer véletlenszerűen osztja be a játékosokat csoportokba, és minden csoporthoz hozzárendel egy táblát.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Csoportkör folyamat:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Automatikus csoportosítás:</strong> Játékosok véletlenszerű beosztása</li>
              <li>• <strong>Tábla hozzárendelés:</strong> Minden csoporthoz egy tábla</li>
              <li>• <strong>Meccsek generálása:</strong> Round-robin formátum</li>
              <li>• <strong>Azonnali kezdés:</strong> A játék azonnal megkezdhető</li>
            </ul>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
            <p className="text-purple-400 text-sm">
              <strong>Új funkció:</strong> A rendszer most már csak a versenyhez kiválasztott táblákat használja, így párhuzamos tornák is lehetségesek.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: 'Egyenes Kiesés',
      icon: IconSword,
      description: 'Kieséses szakasz beállítása és kezelése',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A csoportkör végeztével vagy egyenes kieséses torna esetén az &ldquo;Egyenes kiesés generálása&rdquo; gomb aktiválható. Automatikus módban a rendszer véletlenszerűen párosít, vagy a csoportkör továbbjutóit rendezi be.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Kieséses módok:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Automatikus:</strong> Rendszer által generált párosítások</li>
              <li>• <strong>Manuális:</strong> Üres ágrajz egyedi párosításokkal</li>
              <li>• <strong>Cross-group:</strong> Különböző csoportok párosítása</li>
              <li>• <strong>Seeding:</strong> Csoporthelyezések alapján</li>
            </ul>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
            <p className="text-orange-400 text-sm">
              <strong>Új funkció:</strong> Manuális módban üres ágrajz hozható létre, ahol kiemelések és egyedi párosítások is megadhatók. A következő körök generálása automatikus, a nyertesek továbbjutnak.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: 'Eredményrögzítés',
      icon: IconTarget,
      description: 'Meccsek rögzítése és követése',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A játékosok az oldalon vagy QR-kód segítségével navigálhatnak a mérkőzés rögzítési felületére, ahol a torna jelszavával léphetnek be. A táblát és a mérkőzést kiválasztva rögzíthetik az eredményeket.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Rögzítési módok:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Webes felület:</strong> Bármilyen eszközről elérhető</li>
              <li>• <strong>QR-kód:</strong> Gyors csatlakozás mobilról</li>
              <li>• <strong>Tablet támogatás:</strong> Fix tabletek a tábláknál</li>
              <li>• <strong>Jelszó védelem:</strong> Biztonságos hozzáférés</li>
            </ul>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
            <p className="text-indigo-400 text-sm">
              <strong>Új funkció:</strong> Fix tabletek esetén a torna elején egy link és a torna azonosítókódja, valamint jelszava megadása elegendő a tábla- és meccsválasztó felület eléréséhez.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 8,
      title: 'Verseny Követése',
      icon: IconEye,
      description: 'Valós idejű eredmények és statisztikák',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A torna oldalon valós idejű követés érhető el. A rendszer automatikusan frissíti az eredményeket és statisztikákat, így mindenki követheti a verseny fejlődését.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Követési funkciók:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Élő eredmények:</strong> Valós idejű frissítések</li>
              <li>• <strong>Statisztikák:</strong> Átlagok, 180-ak, kiszállók</li>
              <li>• <strong>Ágrajz:</strong> Kieséses szakasz követése</li>
              <li>• <strong>Csoporttáblázatok:</strong> Csoportkör eredményei</li>
            </ul>
          </div>
          <div className="bg-pink-500/10 border border-pink-500/20 p-4 rounded-lg">
            <p className="text-pink-400 text-sm">
              <strong>Közelgő funkció:</strong> Teszteljük a DartsConnecthez hasonló, dobásonkénti élő közvetítés lehetőségét, amelynek részleteit a mellékletben találja.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 9,
      title: 'Torna Lezárása',
      icon: IconFlagCheck,
      description: 'Verseny befejezése és eredmények archiválása',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            A torna végeztével a &ldquo;Torna befejezése&rdquo; gombra kattintva a rendszer frissíti a játékosok statisztikáit és automatikusan archiválja az eredményeket.
          </p>
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Lezárási folyamat:</h4>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• <strong>Végső helyezések:</strong> Játékosok rangsorolása</li>
              <li>• <strong>Statisztika frissítés:</strong> Átlagok, 180-ak, kiszállók</li>
              <li>• <strong>Eredmények archiválása:</strong> Végleges tárolás</li>
              <li>• <strong>Táblák felszabadítása:</strong> Új tornákhoz</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
            <p className="text-red-400 text-sm">
              <strong>Fontos:</strong> A torna lezárása után a játékosok statisztikái (helyezés, legmagasabb kiszálló, 180-as dobások száma) automatikusan frissülnek, és az eredmények archiválódnak.
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[activeStep];

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Hogyan Működik a tDarts?
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Részletes útmutató a tDarts platform használatához - minden lépésről lépésről
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white font-semibold">
              {activeStep + 1} / {steps.length}
            </span>
            <span className="text-gray-400">
              {Math.round(((activeStep + 1) / steps.length) * 100)}% teljesítve
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-red-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h3 className="text-white font-bold text-lg mb-4">Navigáció</h3>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(index)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                      activeStep === index
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
              {/* Step Header */}
              <div className="flex items-center space-x-4 mb-8">
                <div className={`p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-700`}>
                  {(() => {
                    const StepIcon = currentStep.icon;
                    return <StepIcon className="w-8 h-8 text-white" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {currentStep.title}
                  </h2>
                  <p className="text-gray-400">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {/* Step Content */}
              <div className="mb-8">
                {currentStep.content}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-8 border-t border-gray-700">
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ← Előző
                </button>
                
                <div className="flex space-x-2">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveStep(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        activeStep === index ? 'bg-red-500' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                  disabled={activeStep === steps.length - 1}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Következő →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Készen állsz a kezdésre?
            </h3>
            <p className="text-gray-300 mb-6">
              Most már mindent tudsz a tDarts platform használatáról. Regisztrálj és kezdj el versenyeket szervezni!
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/auth/register" className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200">
                Regisztráció
              </Link>
              <Link href="/search" className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200">
                Versenyek Keresése
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage; 