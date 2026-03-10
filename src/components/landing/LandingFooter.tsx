import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export function LandingFooter() {
    return (
        <footer className="bg-white dark:bg-slate-950 pt-20 pb-10 border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
                    <div className="col-span-2 lg:col-span-2 space-y-6">
                        <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
                            <Logo size="lg" isPlatform={true} />
                        </Link>
                        <p className="text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                            Transformando a logística operacional em uma vantagem competitiva através de tecnologia inteligente e dados em tempo real.
                        </p>
                        <div className="flex items-center gap-4">
                            <Link href="#" className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
                                <Twitter className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
                                <Linkedin className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
                                <Github className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Produto</h5>
                        <ul className="space-y-4">
                            <li><Link href="#features" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Funcionalidades</Link></li>
                            <li><Link href="#pricing" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Preços</Link></li>
                            <li><Link href="/roadmap" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Roadmap</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Suporte</h5>
                        <ul className="space-y-4">
                            <li><Link href="#" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Central de Ajuda</Link></li>
                            <li><Link href="#" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">API Docs</Link></li>
                            <li><Link href="#" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Status</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Legal</h5>
                        <ul className="space-y-4">
                            <li><Link href="/privacy" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Privacidade</Link></li>
                            <li><Link href="/terms" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Termos de Uso</Link></li>
                            <li><Link href="/security" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">Segurança</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-10 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-sm text-slate-500 dark:text-slate-600">
                        © 2026 Black Tower X. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="mailto:contato@inventarioagil.com" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-600 hover:text-indigo-600 transition-colors">
                            <Mail className="h-4 w-4" /> contato@inventarioagil.com
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
