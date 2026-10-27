'use client';
import { createContext, useContext } from 'react';
import type { DescricoesDasMetricas } from '@/lib/painel/catalogo';
export const ExplicacoesDoPainel = createContext<DescricoesDasMetricas>({});
export const useExplicacoesDoPainel = () => useContext(ExplicacoesDoPainel);
