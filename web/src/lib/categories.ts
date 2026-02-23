import { Home, Utensils, Car, Lightbulb, Heart, GraduationCap, Pizza, ShieldCheck, Landmark, TrendingUp } from 'lucide-react';

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
    { id: 'ingresos', name: 'Ingresos', icon: TrendingUp, color: '#4ade80', keywords: ['sueldo', 'pago', 'ingreso', 'comision', 'honorario', 'adelanto'] },
];

export const EMOJI_MAP: Record<string, string> = {
    // Transporte & Vehículos
    'transporte': '🚗', 'carro': '🚗', 'coche': '🚗', 'vehiculo': '🚗', 'auto': '🚗',
    'cochera': '🅿️', 'estacionamiento': '🅿️', 'parking': '🅿️', 'garage': '🅿️',
    'combustible': '⛽', 'gasolina': '⛽', 'grifo': '⛽', 'petroleo': '⛽',
    'taller': '🛠️', 'mecanico': '🛠️', 'repuesto': '⚙️', 'mantenimiento': '🔧',
    'multa': '⚠️', 'peaje': '🛣️', 'soat': '📄', 'lavado': '🧽', 'uber': '📱', 'taxi': '🚕', 'cabify': '🚕',

    // Vivienda & Hogar
    'casa': '🏠', 'hogar': '🏠', 'depa': '🏢', 'departamento': '🏢', 'alquiler': '🔑', 'renta': '🔑',
    'condominio': '🏢', 'mantenimiento_edificio': '🏗️', 'arbitrios': '🏛️', 'impuesto': '🧾',
    'limpieza': '🧹', 'lavanderia': '🧺', 'planchado': '👔', 'reparacion': '🛠️',
    'mueble': '🪑', 'decoracion': '🖼️', 'jardin': '🪴', 'ferreteria': '🔨',

    // Servicios
    'luz': '⚡', 'electricidad': '⚡', 'recibo_luz': '⚡', 'enel': '⚡', 'luz_del_sur': '⚡',
    'agua': '💧', 'sedapal': '💧', 'recibo_agua': '💧',
    'gas': '🔥', 'calidda': '🔥', 'balon_gas': '🔥',
    'internet': '📶', 'wifi': '📶', 'fibra': '📶', 'movistar': '📶', 'claro': '📶', 'entel': '📶', 'win': '📶',
    'cable': '📺', 'netflix': '🎬', 'disney': '🎬', 'hbo': '🎬', 'spotify': '🎵', 'youtube': '📺',
    'celular': '📱', 'telefono': '📞', 'movil': '📱', 'postpago': '📱', 'recarga': '💳',

    // Alimentación
    'alimentacion': '🍕', 'comida': '🍔', 'almuerzo': '🍛', 'cena': '🍱', 'desayuno': '☕',
    'supermercado': '🛒', 'market': '🛒', 'tottus': '🛒', 'plaza_vea': '🛒', 'wong': '🛒', 'metro': '🛒', 'tambo': '🛒', 'oxxo': '🛒',
    'restaurante': '🍽️', 'cafe': '☕', 'starbucks': '☕', 'panaderia': '🥐', 'bodega': '🏪',
    'pizza': '🍕', 'hamburguesa': '🍔', 'kfc': '🍗', 'pollo': '🍗', 'parrillada': '🥩', 'sushi': '🍣',
    'dulces': '🍬', 'golosinas': '🍭', 'snack': '🍿', 'fruta': '🍎', 'verdura': '🥦',
    'delivery': '🛵', 'rappi': '🛵', 'pedidosya': '🛵',

    // Ocio & Entretenimiento
    'ocio': '🎮', 'diversion': '🎡', 'cine': '🎟️', 'pelicula': '🎬', 'teatro': '🎭', 'concierto': '🎸',
    'bar': '🍻', 'discoteca': '💃', 'fiesta': '🎉', 'cumpleaños': '🎂', 'salida': '👯',
    'juego': '🎮', 'playstation': '🎮', 'xbox': '🎮', 'nintendo': '🎮', 'vapor': '🎮',
    'viaje': '✈️', 'vuelo': '✈️', 'hotel': '🏨', 'turismo': '🗺️', 'vacaciones': '🏖️',
    'hospedaje': '🛌', 'airbnb': '🏠',

    // Salud & Bienestar
    'salud': '❤️', 'medico': '👨‍⚕️', 'doctor': '👨‍⚕️', 'clinica': '🏥', 'hospital': '🏥',
    'farmacia': '💊', 'medicina': '💊', 'dentista': '🦷', 'terapia': '🧠', 'psicologo': '🧠',
    'seguro': '🛡️', 'eps': '🛡️', 'rimac': '🛡️', 'pacifico': '🛡️', 'mapfre': '🛡️',
    'belleza': '✨', 'peluqueria': '💇', 'barberia': '💈', 'corte': '💇', 'maquillaje': '💄', 'skincare': '🧴',
    'gym': '💪', 'gimnasio': '🏋️', 'entrenamiento': '🏃', 'deporte': '⚽', 'futbol': '⚽', 'padel': '🎾',

    // Educación
    'educacion': '🎓', 'universidad': '🏫', 'colegio': '🏫', 'academia': '📚',
    'curso': '💻', 'diplomado': '📜', 'matricula': '📝', 'pension': '💰',
    'libro': '📖', 'utiles': '✏️', 'papeleria': '📎',

    // Compras & Otros
    'compras': '🛍️', 'ropa': '👕', 'zapato': '👟', 'zapatilla': '👟', 'accesorio': '💍', 'joya': '💎',
    'regalo': '🎁', 'donacion': '🤝', 'propina': '🪙',
    'tecnologia': '💻', 'laptop': '💻', 'computadora': '💻', 'gadget': '⌚',
    'mascota': '🐶', 'perro': '🐶', 'gato': '🐱', 'veterinaria': '🏥', 'arena': '🐈',

    // Trabajo & Dinero
    'trabajo': '💼', 'oficina': '🏢', 'sueldo': '💰', 'ingreso': '💵', 'pago': '💸',
    'banco': '🏦', 'ahorro': '💰', 'inversion': '📈', 'bolsa': '📊',
    'prestamo': '🏦', 'deuda': '🛑', 'cuota': '🗓️', 'interes': '📉', 'bcp': '🏦', 'interbank': '🏦', 'bbva': '🏦', 'scotiabank': '🏦',
};

export const getEmojiForCategory = (text: string): string => {
    const normalized = text.toLowerCase().trim();

    // 1. Intento de coincidencia exacta o palabra contenida
    for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
        if (normalized === key || normalized.includes(key)) {
            return emoji;
        }
    }

    // 2. Intento con las keywords de las categorías principales para fallback
    const cat = getCategoryByText(text);
    if (cat && EMOJI_MAP[cat.id]) return EMOJI_MAP[cat.id];

    return '📦'; // Default
};

export const getCategoryByText = (text: string) => {
    const normalized = text.toLowerCase();
    const category = CATEGORIES.find(cat =>
        cat.keywords.some(keyword => normalized.includes(keyword))
    );
    return category || CATEGORIES.find(cat => cat.id === 'casa')!; // Default to Casa
};
