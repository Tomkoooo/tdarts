'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  IconUserPlus, 
  IconBuilding, 
  IconTrophy, 
  IconTarget, 
  IconFlagCheck,
  IconShare,
  IconChartLine,
  IconDeviceMobile
} from '@tabler/icons-react';
import Link from 'next/link';
import Head from 'next/head';
import howItWorksData from '@/data/how-it-works.json';
import ContentRenderer from '@/components/how-it-works/ContentRenderer';

// Icon mapping
const iconMap: { [key: string]: any } = {
  IconUserPlus,
  IconBuilding,
  IconTrophy,
  IconTarget,
  IconFlagCheck,
  IconShare,
  IconChartLine,
  IconDeviceMobile
};

const HowItWorksPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [shouldScroll, setShouldScroll] = useState(false);

  // Initialize active step from URL param
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const stepId = parseInt(stepParam);
      const stepIndex = howItWorksData.steps.findIndex(s => s.id === stepId);
      if (stepIndex !== -1) {
        setActiveStep(stepIndex);
        setShouldScroll(true);
      }
    }
  }, [searchParams]);

  // Scroll to content when step changes from URL
  useEffect(() => {
    if (shouldScroll && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        setShouldScroll(false);
      }, 100);
    }
  }, [shouldScroll]);

  // Update URL when step changes
  const handleStepChange = (index: number) => {
    setActiveStep(index);
    const stepId = howItWorksData.steps[index].id;
    router.push(`/how-it-works?step=${stepId}`, { scroll: false });
  };

  const currentStep = howItWorksData.steps[activeStep];
  const StepIcon = iconMap[currentStep.icon];

  // Generate FAQ schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": howItWorksData.steps.map(step => ({
      "@type": "Question",
      "name": step.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": step.content.sections.map(section => {
          if (section.type === 'text') return section.content;
          if (section.type === 'subsection') {
            return `${section.title}: ${Array.isArray(section.content) ? section.content.join(' ') : section.content}`;
          }
          return '';
        }).join(' ')
      }
    }))
  };

  return (
    <>
      <Head>
        <title>Hogyan Működik a tDarts? - Gyakran Ismételt Kérdések | tDarts</title>
        <meta name="description" content="Teljes útmutató a tDarts platform használatához. Regisztráció, klubkezelés, versenyek indítása, eredményrögzítés és liga kezelés lépésről lépésre." />
        <meta name="keywords" content="tDarts, dart verseny, dart platform, verseny szervezés, dart eredmények, liga kezelés, FAQ, gyakran ismételt kérdések" />
        <meta property="og:title" content="Hogyan Működik a tDarts? - Gyakran Ismételt Kérdések" />
        <meta property="og:description" content="Teljes útmutató a tDarts platform használatához. Regisztráció, klubkezelés, versenyek indítása, eredményrögzítés és liga kezelés lépésről lépésre." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tdarts.sironic.hu/how-it-works" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hogyan Működik a tDarts? - Gyakran Ismételt Kérdések" />
        <meta name="twitter:description" content="Teljes útmutató a tDarts platform használatához. Regisztráció, klubkezelés, versenyek indítása, eredményrögzítés és liga kezelés lépésről lépésre." />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </Head>
      <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-400">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Főoldal
              </Link>
            </li>
            <li className="flex items-center">
              <span className="mx-2">/</span>
              <span className="text-white">Gyakran Ismételt Kérdések</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6">
            {howItWorksData.title}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
            {howItWorksData.subtitle}
          </p>
        </div>

        {/* FAQ Summary for SEO */}
        <div className="mb-8 md:mb-12 bg-gray-800 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
            Gyakran Ismételt Kérdések
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {howItWorksData.steps.map((step, index) => (
              <div key={step.id} className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-300 text-sm">
                  {step.description}
                </p>
                <button
                  onClick={() => {
                    handleStepChange(index);
                    setShouldScroll(true);
                  }}
                  className="mt-3 text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Részletek →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 md:mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white font-semibold text-sm md:text-base">
              {activeStep + 1} / {howItWorksData.steps.length}
            </span>
            <span className="text-gray-400 text-sm md:text-base">
              {Math.round(((activeStep + 1) / howItWorksData.steps.length) * 100)}% teljesítve
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-red-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((activeStep + 1) / howItWorksData.steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div id="main-content" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h3 className="text-white font-bold text-lg mb-4">Navigáció</h3>
              <div className="space-y-2">
                {howItWorksData.steps.map((step, index) => {
                  const StepIconComponent = iconMap[step.icon];
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepChange(index)}
                      className={`w-full text-left p-2 md:p-3 rounded-lg transition-all duration-200 flex items-center space-x-2 md:space-x-3 ${
                        activeStep === index
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <StepIconComponent className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium">{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div ref={contentRef} className="bg-gray-800 rounded-2xl p-4 md:p-8 shadow-2xl">
              {/* Step Header */}
              <div className="flex items-center space-x-3 md:space-x-4 mb-6 md:mb-8">
                <div className="p-3 md:p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 flex-shrink-0">
                  <StepIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2">
                    {currentStep.title}
                  </h2>
                  <p className="text-gray-400 text-sm md:text-base">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {/* Step Content */}
              <div className="mb-6 md:mb-8">
                <ContentRenderer content={currentStep.content} />
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-6 md:pt-8 border-t border-gray-700 gap-4">
                <button
                  onClick={() => handleStepChange(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ← Előző
                </button>
                
                <div className="flex space-x-2 order-first sm:order-none">
                  {howItWorksData.steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleStepChange(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        activeStep === index ? 'bg-red-500' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => handleStepChange(Math.min(howItWorksData.steps.length - 1, activeStep + 1))}
                  disabled={activeStep === howItWorksData.steps.length - 1}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Következő →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gray-800 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
              {howItWorksData.cta.title}
            </h3>
            <p className="text-gray-300 mb-6 text-sm md:text-base">
              {howItWorksData.cta.description}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {howItWorksData.cta.buttons.map((button, index) => (
                <Link
                  key={index}
                  href={button.href}
                  className={`px-6 md:px-8 py-3 rounded-lg transition-all duration-200 text-center ${
                    button.variant === 'primary'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {button.text}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default HowItWorksPage; 