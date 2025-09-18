"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditError = void 0;
const types_1 = require("../types");
class CreditError extends Error {
    constructor(message, code = types_1.ErrorCode.UNKNOWN_ERROR, statusCode, details) {
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
        return new CreditError(message, types_1.ErrorCode.AUTHENTICATION_FAILED, 401);
    }
    static tokenExpired(message = 'Token has expired') {
        return new CreditError(message, types_1.ErrorCode.TOKEN_EXPIRED, 401);
    }
    static insufficientCredits(required, available) {
        return new CreditError(`Insufficient credits. Required: ${required}, Available: ${available}`, types_1.ErrorCode.INSUFFICIENT_CREDITS, 400, { required, available });
    }
    static invalidAmount(amount) {
        return new CreditError(`Invalid amount: ${amount}. Amount must be a positive number.`, types_1.ErrorCode.INVALID_AMOUNT, 400, { amount });
    }
    static networkError(originalError) {
        return new CreditError('Network error occurred while communicating with the credit system', types_1.ErrorCode.NETWORK_ERROR, undefined, originalError);
    }
    static validationError(message, details) {
        return new CreditError(message, types_1.ErrorCode.VALIDATION_ERROR, 400, details);
    }
    static notInitialized() {
        return new CreditError('Credit system is not initialized. Please call init() first.', types_1.ErrorCode.NOT_INITIALIZED);
    }
    static invalidConfiguration(message) {
        return new CreditError(message, types_1.ErrorCode.INVALID_CONFIGURATION);
    }
    static fromApiResponse(response) {
        const message = response?.error || response?.message || 'Unknown error occurred';
        const statusCode = response?.statusCode;
        // Map common API errors to specific error codes
        if (statusCode === 401) {
            return CreditError.authenticationFailed(message);
        }
        if (message.toLowerCase().includes('insufficient')) {
            return new CreditError(message, types_1.ErrorCode.INSUFFICIENT_CREDITS, statusCode);
        }
        if (message.toLowerCase().includes('invalid')) {
            return new CreditError(message, types_1.ErrorCode.VALIDATION_ERROR, statusCode);
        }
        return new CreditError(message, types_1.ErrorCode.UNKNOWN_ERROR, statusCode);
    }
}
exports.CreditError = CreditError;
//# sourceMappingURL=errors.js.map