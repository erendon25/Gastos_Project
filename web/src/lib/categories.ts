import { Home, Utensils, Car, Lightbulb, Heart, GraduationCap, Pizza, ShoppingBag, CreditCard, HelpCircle, Smartphone, DollarSign, ShieldCheck, Landmark } from 'lucide-react';

export const CATEGORIES = [
    { id: 'casa', name: 'Casa', icon: Home, color: '#3b82f6', keywords: ['casa', 'alquiler', 'hogar', 'depa', 'departamento'] },
    { id: 'alimentacion', name: 'Alimentación', icon: Utensils, color: '#f59e0b', keywords: ['comida', 'restaurante', 'cena', 'almuerzo', 'desayuno', 'supermercado', 'compras', 'pizza', 'hamburguesa', 'kfc'] },
    { id: 'transporte', name: 'Transporte', icon: Car, color: '#10b981', keywords: ['transporte', 'uber', 'taxi', 'micro', 'bus', 'gasolina', 'combustible', 'pasaje'] },
    { id: 'servicios', name: 'Servicios', icon: Lightbulb, color: '#ef4444', keywords: ['luz', 'agua', 'internet', 'telefono', 'gas', 'servicios', 'recibo', 'movistar', 'claro', 'entel'] },
    { id: 'seguros', name: 'Seguros', icon: ShieldCheck, color: '#06b6d4', keywords: ['seguro', 'rimac', 'pacifico', 'mapfre', 'soat', 'eps', 'oncologico'] },
    { id: 'prestamos', name: 'Préstamos', icon: Landmark, color: '#8b5cf6', keywords: ['prestamo', 'banco', 'bcp', 'interbank', 'scotiabank', 'bbva', 'cuota', 'credito'] },
    { id: 'ocio', name: 'Ocio', icon: Pizza, color: '#f43f5e', keywords: ['ocio', 'cine', 'bar', 'fiesta', 'salida', 'netflix', 'spotify', 'juego', 'diversion'] },
    { id: 'salud', name: 'Salud', icon: Heart, color: '#ec4899', keywords: ['salud', 'medico', 'farmacia', 'medicina', 'dentista', 'clinica', 'hospital'] },
    { id: 'educacion', name: 'Educación', icon: GraduationCap, color: '#6366f1', keywords: ['educacion', 'universidad', 'colegio', 'curso', 'libro', 'pension', 'matricula'] },
];

export const getCategoryByText = (text: string) => {
    const normalized = text.toLowerCase();
    const category = CATEGORIES.find(cat =>
        cat.keywords.some(keyword => normalized.includes(keyword))
    );
    return category || CATEGORIES.find(cat => cat.id === 'casa')!; // Default to Casa or etc
};
