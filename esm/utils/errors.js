import { ErrorCode } from '../types';
export class CreditError extends Error {
    constructor(message, code = ErrorCode.UNKNOWN_ERROR, statusCode, details) {
        super(message);
        this.name = 'CreditSystemError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CreditError);
        }
    }
    static authenticationFailed(message = 'Authentication failed') {
        return new CreditError(message, ErrorCode.AUTHENTICATION_FAILED, 401);
    }
    static tokenExpired(message = 'Token has expired') {
        return new CreditError(message, ErrorCode.TOKEN_EXPIRED, 401);
    }
    static insufficientCredits(required, available) {
        return new CreditError(`Insufficient credits. Required: ${required}, Available: ${available}`, ErrorCode.INSUFFICIENT_CREDITS, 400, { required, available });
    }
    static invalidAmount(amount) {
        return new CreditError(`Invalid amount: ${amount}. Amount must be a positive number.`, ErrorCode.INVALID_AMOUNT, 400, { amount });
    }
    static networkError(originalError) {
        return new CreditError('Network error occurred while communicating with the credit system', ErrorCode.NETWORK_ERROR, undefined, originalError);
    }
    static validationError(message, details) {
        return new CreditError(message, ErrorCode.VALIDATION_ERROR, 400, details);
    }
    static notInitialized() {
        return new CreditError('Credit system is not initialized. Please call init() first.', ErrorCode.NOT_INITIALIZED);
    }
    static invalidConfiguration(message) {
        return new CreditError(message, ErrorCode.INVALID_CONFIGURATION);
    }
    static fromApiResponse(response) {
        const message = response?.error || response?.message || 'Unknown error occurred';
        const statusCode = response?.statusCode;
        // Map common API errors to specific error codes
        if (statusCode === 401) {
            return CreditError.authenticationFailed(message);
        }
        if (message.toLowerCase().includes('insufficient')) {
            return new CreditError(message, ErrorCode.INSUFFICIENT_CREDITS, statusCode);
        }
        if (message.toLowerCase().includes('invalid')) {
            return new CreditError(message, ErrorCode.VALIDATION_ERROR, statusCode);
        }
        return new CreditError(message, ErrorCode.UNKNOWN_ERROR, statusCode);
    }
}
//# sourceMappingURL=errors.js.map