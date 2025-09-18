import { CreditSystemConfig, SpendRequest, TransactionHistoryParams } from '../types';
export declare class Validators {
    static validateEmail(email: string): boolean;
    static validateAmount(amount: number): void;
    static validateSpendRequest(request: SpendRequest): void;
    static validateConfig(config: CreditSystemConfig): void;
    static validateTransactionHistoryParams(params: TransactionHistoryParams): void;
    static isTokenExpired(expiresAt: Date, bufferMs?: number): boolean;
}
//# sourceMappingURL=validators.d.ts.map