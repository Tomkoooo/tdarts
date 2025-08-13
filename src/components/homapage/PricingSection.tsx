import React from 'react';
import { IconCheck, IconX, IconCrown, IconStar, IconTrophy, IconInfinity } from '@tabler/icons-react';

const PricingSection = () => {
  const packages = [
    {
      name: 'Ingyenes',
      price: '0 Ft',
      period: '/hó',
      description: 'Alapvető funkciók kis csapatoknak',
      features: [
        { text: 'Havi 1 verseny/klub', included: true },
        { text: 'Korlátlan felhasználó', included: true },
        { text: 'Elő meccs követés', included: false },
        { text: 'Liga indítási lehetőség', included: false },
        { text: 'Részletes leg statisztikák', included: false },
      ],
      gradient: 'from-gray-500 to-gray-700',
      popular: false,
      icon: IconStar
    },
    {
      name: 'Alap',
      price: '0',
      period: ' Ft/hó',
      description: 'Tökéletes választás a rendszer kipróbálására',
      features: [
        { text: 'Havi 2 verseny/klub', included: true },
        { text: 'Korlátlan felhasználó', included: true },
        { text: 'Elő meccs követés', included: false },
        { text: 'Liga indítási lehetőség', included: true },
        { text: 'Részletes leg statisztikák', included: false },
      ],
      gradient: 'from-blue-500 to-blue-700',
      popular: false,
      icon: IconTrophy
    },
    {
      name: 'Pro',
      price: '0',
      period: ' Ft/hó',
      description: 'Kiválló aktív kluboknak',
      features: [
        { text: 'Havi 4 verseny/klub', included: true },
        { text: 'Korlátlan felhasználó', included: true },
        { text: 'Elő meccs követés', included: false },
        { text: 'Liga indítási lehetőség', included: true },
        { text: 'Részletes leg statisztikák', included: true },
      ],
      gradient: 'from-purple-500 to-purple-700',
      popular: true,
      icon: IconCrown
    },
    {
      name: 'Enterprise',
      price: '0',
      period: ' Ft/hó',
      description: 'Korlátlan hozzáférés nagyobb szervezeteknek',
      features: [
        { text: 'Korlátlan havi verseny', included: true },
        { text: 'Korlátlan felhasználó', included: true },
        { text: 'Elő meccs követés', included: true },
        { text: 'Liga indítási lehetőség', included: true },
        { text: 'Részletes leg statisztikák', included: true },
      ],
      gradient: 'from-red-500 to-red-700',
      popular: false,
      icon: IconInfinity
    }
  ];

  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-gradient-red mb-6">
            Válaszd ki a Tökéletes Csomagot
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Minden méretű klub és verseny szervezőnek megfelelő árazás
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {packages.map((pkg, index) => (
            <div 
              key={index}
              className={`relative depth-card group hover:scale-105 transition-all duration-500 ${
                pkg.popular ? 'ring-2 ring-red-500 scale-105' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-red-500 to-red-700 text-white px-4 py-2 rounded-full text-sm font-bold">
                    Legnépszerűbb
                  </span>
                </div>
              )}

              {/* Package Icon */}
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${pkg.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <pkg.icon className="w-8 h-8 text-white" />
              </div>

              {/* Package Info */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">{pkg.price}</span>
                  <span className="text-gray-400">{pkg.period}</span>
                </div>
                <p className="text-gray-400 text-sm">{pkg.description}</p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {pkg.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center">
                    {feature.included ? (
                      <IconCheck className="w-5 h-5 text-green-500 mr-3" />
                    ) : (
                      <IconX className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-white' : 'text-gray-500'}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button className="w-full glass-button push-button py-3 text-center">
                {pkg.name === 'Ingyenes' ? 'Kezdés Most' : 'Teszt Üzem'}
              </button>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/5 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            * Egyelőre teszt üzemben működik az oldal. Az előfizetői model hamarosan elérhető lesz.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection; 