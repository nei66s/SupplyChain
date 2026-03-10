import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LegalLayout({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            <LandingHeader />
            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-extrabold font-headline mb-8 text-slate-900 dark:text-white">
                        {title}
                    </h1>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        {children}
                    </div>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
}
