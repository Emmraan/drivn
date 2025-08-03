'use client';

import React from 'react';

export const dynamic = 'force-dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ComparisonSection from '@/components/landing/ComparisonSection';
import FAQSection from '@/components/landing/FAQSection';
import { LandingPageTransition } from '@/components/ui/PageTransition';

export default function Home() {
  return (
    <LandingPageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroSection />
          <FeaturesSection />
          <ComparisonSection />
          <FAQSection />
        </main>
        <Footer />
      </div>
    </LandingPageTransition>
  );
}
