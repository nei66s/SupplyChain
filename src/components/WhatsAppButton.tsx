'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

export function WhatsAppButton() {
    const phoneNumber = '5519990029187'; // Número atualizado do USER
    const message = encodeURIComponent('Olá! Vim pelo site do Inventário Ágil e gostaria de mais informações sobre o piloto.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-24 right-6 lg:bottom-6 z-50 flex items-center justify-center w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl shadow-emerald-500/40 transition-all hover:scale-110 active:scale-95 group"
            aria-label="Falar conosco no WhatsApp"
        >
            <div className="absolute -top-12 right-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 rounded-xl text-sm font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-100 dark:border-slate-700">
                Fale com um Especialista 🚀
            </div>
            <MessageSquare className="w-7 h-7 fill-current" />
        </a>
    );
}
