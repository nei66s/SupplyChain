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
            className="flex items-center justify-center p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500 transition-colors"
            title="Fale com um Especialista"
            aria-label="Falar conosco no WhatsApp"
        >
            <MessageSquare className="w-5 h-5 fill-current" />
        </a>
    );
}
