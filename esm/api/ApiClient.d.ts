import { AxiosInstance } from 'axios';
import { Balance, Transaction, SpendRequest, AddCreditsRequest, TransactionHistoryParams } from '../types';
export declare class ApiClient {
    private axiosInstance;
    private parentOrigin?;
    constructor(axiosInstance: AxiosInstance, parentOrigin?: string);
    getBalance(): Promise<Balance>;
    spend(request: SpendRequest): Promise<Transaction>;
    addCredits(request: AddCreditsRequest): Promise<Transaction>;
    getTransactionHistory(params?: TransactionHistoryParams): Promise<Transaction[]>;
    getTransaction(transactionId: string | number): Promise<Transaction>;
    refund(transactionId: string | number, reason?: string): Promise<Transaction>;
    private normalizeTransaction;
    private notifyParent;
}
//# sourceMappingURL=ApiClient.d.ts.map