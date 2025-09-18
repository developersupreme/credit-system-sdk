import { CreditSystemError, ErrorCode } from '../types';
export declare class CreditError extends Error implements CreditSystemError {
    code: ErrorCode;
    statusCode?: number;
    details?: any;
    constructor(message: string, code?: ErrorCode, statusCode?: number, details?: any);
    static authenticationFailed(message?: string): CreditError;
    static tokenExpired(message?: string): CreditError;
    static insufficientCredits(required: number, available: number): CreditError;
    static invalidAmount(amount: number): CreditError;
    static networkError(originalError?: any): CreditError;
    static validationError(message: string, details?: any): CreditError;
    static notInitialized(): CreditError;
    static invalidConfiguration(message: string): CreditError;
    static fromApiResponse(response: any): CreditError;
}
//# sourceMappingURL=errors.d.ts.map