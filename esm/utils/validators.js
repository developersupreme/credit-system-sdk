import { CreditError } from './errors';
export class Validators {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static validateAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw CreditError.invalidAmount(amount);
        }
        if (amount <= 0) {
            throw CreditError.invalidAmount(amount);
        }
        if (amount > Number.MAX_SAFE_INTEGER) {
            throw CreditError.validationError(`Amount ${amount} exceeds maximum safe integer`);
        }
    }
    static validateSpendRequest(request) {
        this.validateAmount(request.amount);
        if (!request.description || request.description.trim().length === 0) {
            throw CreditError.validationError('Description is required for spend requests');
        }
        if (request.description.length > 255) {
            throw CreditError.validationError('Description must be 255 characters or less');
        }
    }
    static validateConfig(config) {
        if (!config.apiUrl) {
            throw CreditError.invalidConfiguration('API URL is required');
        }
        try {
            new URL(config.apiUrl);
        }
        catch {
            throw CreditError.invalidConfiguration('Invalid API URL format');
        }
        if (config.authMode && !['jwt', 'standalone'].includes(config.authMode)) {
            throw CreditError.invalidConfiguration('Auth mode must be either "jwt" or "standalone"');
        }
        if (config.tokenRefreshBuffer && config.tokenRefreshBuffer < 0) {
            throw CreditError.invalidConfiguration('Token refresh buffer must be a positive number');
        }
    }
    static validateTransactionHistoryParams(params) {
        if (params.limit !== undefined) {
            if (params.limit <= 0 || params.limit > 1000) {
                throw CreditError.validationError('Limit must be between 1 and 1000');
            }
        }
        if (params.offset !== undefined && params.offset < 0) {
            throw CreditError.validationError('Offset must be a positive number');
        }
        if (params.startDate && params.endDate) {
            if (params.startDate > params.endDate) {
                throw CreditError.validationError('Start date must be before end date');
            }
        }
        if (params.type) {
            const validTypes = ['credit', 'debit', 'spend', 'refund'];
            if (!validTypes.includes(params.type)) {
                throw CreditError.validationError(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
            }
        }
    }
    static isTokenExpired(expiresAt, bufferMs = 30000) {
        const now = new Date().getTime();
        const expiry = expiresAt.getTime();
        return now >= (expiry - bufferMs);
    }
}
//# sourceMappingURL=validators.js.map