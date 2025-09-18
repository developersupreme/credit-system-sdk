export * from './errors';
export * from './validators';
export * from './logger';
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
export const formatCurrency = (amount, currency = 'credits') => {
    return `${amount.toLocaleString()} ${currency}`;
};
export const parseJWT = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''));
        return JSON.parse(jsonPayload);
    }
    catch (error) {
        throw new Error('Invalid JWT token');
    }
};
export const debounce = (func, wait) => {
    let timeout = null;
    return (...args) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
export const retry = async (fn, maxAttempts = 3, delayMs = 1000, backoff = true) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts) {
                throw lastError;
            }
            const delay = backoff ? delayMs * attempt : delayMs;
            await sleep(delay);
        }
    }
    throw lastError;
};
//# sourceMappingURL=index.js.map