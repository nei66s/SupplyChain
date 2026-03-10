import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />

        <section className="py-24 bg-slate-50 dark:bg-slate-900/30">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold font-headline text-slate-900 dark:text-white">
              Pronto para acelerar sua logística?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Junte-se a centenas de empresas que já transformaram seus armazéns em centros de tecnologia.
            </p>
            <div className="flex justify-center">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 rounded-2xl h-14 px-8 text-lg font-bold" asChild>
                <Link href="/register">
                  Testar Grátis <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
      <WhatsAppButton />
    </div>
  );
}
