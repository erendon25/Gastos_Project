export const SERVICE_LOGOS: Record<string, { emoji: string; color: string; keywords: string[] }> = {
    netflix: { emoji: '🎬', color: '#E50914', keywords: ['netflix'] },
    spotify: { emoji: '🎵', color: '#1DB954', keywords: ['spotify'] },
    hbo: { emoji: '📺', color: '#000000', keywords: ['hbo', 'max'] },
    antigravity: { emoji: '🚀', color: '#818cf8', keywords: ['antigravity'] },
    disney: { emoji: '🏰', color: '#006E99', keywords: ['disney'] },
    youtube: { emoji: '📹', color: '#FF0000', keywords: ['youtube'] },
    amazon: { emoji: '📦', color: '#FF9900', keywords: ['amazon', 'prime'] },
    apple: { emoji: '🍎', color: '#A2AAAD', keywords: ['apple', 'cloud', 'music'] },
};

export const isSubscriptionItem = (data: any): boolean => {
    const desc = (data.description || '').toLowerCase();
    const cat = (data.category || '').toLowerCase();

    return cat.includes('ocio') ||
        cat.includes('digital') ||
        data.isSubscription ||
        Object.values(SERVICE_LOGOS).some(s => s.keywords.some(k => desc.includes(k)));
};
