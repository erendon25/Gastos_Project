export interface Currency {
    code: string;
    symbol: string;
    name: string;
    flag: string;
}

export const CURRENCIES: Currency[] = [
    { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', flag: '🇵🇪' },
    { code: 'USD', symbol: '$', name: 'Dólar Americano', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'COP', symbol: 'COL$', name: 'Peso Colombiano', flag: '🇨🇴' },
    { code: 'MXN', symbol: 'MX$', name: 'Peso Mexicano', flag: '🇲🇽' },
    { code: 'ARS', symbol: '$', name: 'Peso Argentino', flag: '🇦🇷' },
    { code: 'CLP', symbol: 'CLP$', name: 'Peso Chileno', flag: '🇨🇱' },
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileño', flag: '🇧🇷' },
    { code: 'GBP', symbol: '£', name: 'Libra Esterlina', flag: '🇬🇧' },
    { code: 'JPY', symbol: '¥', name: 'Yen Japonés', flag: '🇯🇵' },
    { code: 'CAD', symbol: 'CA$', name: 'Dólar Canadiense', flag: '🇨🇦' },
    { code: 'BOB', symbol: 'Bs.', name: 'Boliviano', flag: '🇧🇴' },
    { code: 'PYG', symbol: '₲', name: 'Guaraní Paraguayo', flag: '🇵🇾' },
    { code: 'UYU', symbol: '$U', name: 'Peso Uruguayo', flag: '🇺🇾' },
    { code: 'VES', symbol: 'Bs.S', name: 'Bolívar Venezolano', flag: '🇻🇪' },
];

// Cache key for localStorage
const EXCHANGE_RATES_CACHE_KEY = 'exchangeRatesCache';
// Cache expiration time: 24 hours in milliseconds
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

interface ExchangeRatesCache {
    timestamp: number;
    rates: Record<string, number>;
}

/**
 * Fetches exchange rates from ExchangeRate-API (base USD) or retrieves them from localStorage cache.
 * Rates are cached for 24 hours.
 * @returns A promise that resolves to an object of exchange rates (currency code to value relative to 1 USD).
 */
export async function fetchLiveRates(): Promise<Record<string, number>> {
    try {
        const cachedDataString = localStorage.getItem(EXCHANGE_RATES_CACHE_KEY);
        if (cachedDataString) {
            const cachedData: ExchangeRatesCache = JSON.parse(cachedDataString);
            if (Date.now() - cachedData.timestamp < CACHE_EXPIRATION_MS) {
                console.log('Using cached exchange rates.');
                return cachedData.rates;
            }
        }

        console.log('Fetching fresh exchange rates from API...');
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.result === 'success' && data.rates) {
            const rates: Record<string, number> = data.rates;
            const newCache: ExchangeRatesCache = {
                timestamp: Date.now(),
                rates: rates,
            };
            localStorage.setItem(EXCHANGE_RATES_CACHE_KEY, JSON.stringify(newCache));
            return rates;
        } else {
            throw new Error('API response indicates failure or missing rates.');
        }
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback to a minimal set of default rates if API fails
        return {
            USD: 1,
            EUR: 0.92, // Approx.
            GBP: 0.79, // Approx.
            JPY: 149,  // Approx.
            CAD: 1.36, // Approx.
            PEN: 3.72, // Approx.
            // Add other common currencies if needed, or just rely on 1:1 for unknown
        };
    }
}

/**
 * Converts an amount from one currency to another using live (or cached) exchange rates.
 * @param amount The amount to convert.
 * @param fromCode The currency code of the original amount.
 * @param toCode The currency code to convert to.
 * @returns A promise that resolves to the converted amount.
 */
export async function convertCurrency(amount: number, fromCode: string, toCode: string): Promise<number> {
    if (fromCode === toCode) return amount;

    const rates = await fetchLiveRates();

    // Get the rate of 1 USD in 'fromCode' currency
    // If rates[fromCode] is 3.72 for PEN, it means 1 USD = 3.72 PEN
    // So, 1 PEN = 1/3.72 USD
    const fromRate = rates[fromCode];
    const toRate = rates[toCode];

    if (fromRate === undefined || toRate === undefined) {
        console.warn(`Exchange rate for ${fromCode} or ${toCode} not found. Falling back to 1:1 for missing currency.`);
        // If a rate is missing, treat it as 1:1 with USD for conversion purposes
        const effectiveFromRate = fromRate ?? 1;
        const effectiveToRate = toRate ?? 1;

        // Convert to USD first, then to target
        const inUSD = amount / effectiveFromRate;
        return inUSD * effectiveToRate;
    }

    // Convert to USD first, then to target
    // amount (in fromCode) / fromRate (fromCode per USD) = amount in USD
    // amount in USD * toRate (toCode per USD) = amount in toCode
    const inUSD = amount / fromRate;
    return inUSD * toRate;
}

export function getCurrencyByCode(code: string): Currency {
    return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}
