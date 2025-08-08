'use client';

import React, { useState } from 'react';
import { 
  IconUserPlus, 
  IconBuilding, 
  IconTrophy, 
  IconTarget, 
  IconFlagCheck 
} from '@tabler/icons-react';
import Link from 'next/link';
import howItWorksData from '@/data/how-it-works.json';
import ContentRenderer from '@/components/how-it-works/ContentRenderer';

// Icon mapping
const iconMap: { [key: string]: any } = {
  IconUserPlus,
  IconBuilding,
  IconTrophy,
  IconTarget,
  IconFlagCheck
};

const HowItWorksPage = () => {
  const [activeStep, setActiveStep] = useState(0);

  const currentStep = howItWorksData.steps[activeStep];
  const StepIcon = iconMap[currentStep.icon];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            {howItWorksData.title}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {howItWorksData.subtitle}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white font-semibold">
              {activeStep + 1} / {howItWorksData.steps.length}
            </span>
            <span className="text-gray-400">
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
                      onClick={() => setActiveStep(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                        activeStep === index
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <StepIconComponent className="w-5 h-5" />
                      <span className="text-sm font-medium">{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
              {/* Step Header */}
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-700">
                  <StepIcon className="w-8 h-8 text-white" />
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
                <ContentRenderer content={currentStep.content} />
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
                  {howItWorksData.steps.map((_, index) => (
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
                  onClick={() => setActiveStep(Math.min(howItWorksData.steps.length - 1, activeStep + 1))}
                  disabled={activeStep === howItWorksData.steps.length - 1}
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
              {howItWorksData.cta.title}
            </h3>
            <p className="text-gray-300 mb-6">
              {howItWorksData.cta.description}
            </p>
            <div className="flex justify-center space-x-4">
              {howItWorksData.cta.buttons.map((button, index) => (
                <Link
                  key={index}
                  href={button.href}
                  className={`px-8 py-3 rounded-lg transition-all duration-200 ${
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
  );
};

export default HowItWorksPage; 