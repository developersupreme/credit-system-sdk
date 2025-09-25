"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const types_1 = require("../types");
const utils_1 = require("../utils");
class ApiClient {
    constructor(axiosInstance, parentOrigin, authMode) {
        this.axiosInstance = axiosInstance;
        this.parentOrigin = parentOrigin;
        this.authMode = authMode || 'standalone';
        // Determine API prefix based on auth mode
        this.apiPrefix = this.authMode === 'jwt' ? '/secure-credits/iframe' : '/secure-credits/standalone';
    }
    async getBalance() {
        try {
            utils_1.logger.debug('Fetching balance...');
            const response = await (0, utils_1.retry)(() => this.axiosInstance.get(`${this.apiPrefix}/balance`), 3, 1000);
            if (!response.data.success || response.data.data === undefined) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const balance = {
                balance: response.data.data.balance,
                lastUpdated: new Date()
            };
            // Notify parent if in iframe
            this.notifyParent(types_1.MessageType.BALANCE_UPDATE, { balance: balance.balance });
            utils_1.logger.info('Balance fetched:', balance.balance);
            return balance;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.data) {
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }
    async spend(request) {
        utils_1.Validators.validateSpendRequest(request);
        try {
            utils_1.logger.debug('Processing spend request:', request);
            const response = await this.axiosInstance.post(`${this.apiPrefix}/spend`, request);
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            // Notify parent if in iframe
            this.notifyParent(types_1.MessageType.OPERATION_COMPLETE, {
                operation: 'spend',
                details: request,
                newBalance: response.data.data.new_balance
            });
            utils_1.logger.info('Spend successful:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.status === 400) {
                const message = error.response.data?.message || error.response.data?.error;
                if (message?.includes('insufficient')) {
                    const match = message.match(/Available: (\d+)/);
                    const available = match ? parseInt(match[1]) : 0;
                    throw utils_1.CreditError.insufficientCredits(request.amount, available);
                }
                throw utils_1.CreditError.validationError(message || 'Invalid spend request');
            }
            if (error.response?.data) {
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }
    async addCredits(request) {
        utils_1.Validators.validateAmount(request.amount);
        try {
            utils_1.logger.debug('Adding credits:', request);
            const response = await this.axiosInstance.post(`${this.apiPrefix}/add`, request);
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            // Notify parent if in iframe
            this.notifyParent(types_1.MessageType.OPERATION_COMPLETE, {
                operation: 'add_credits',
                details: request,
                newBalance: response.data.data.new_balance
            });
            utils_1.logger.info('Credits added:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.data) {
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }
    async getTransactionHistory(params) {
        if (params) {
            utils_1.Validators.validateTransactionHistoryParams(params);
        }
        try {
            utils_1.logger.debug('Fetching transaction history:', params);
            const queryParams = new URLSearchParams();
            if (params?.limit)
                queryParams.append('limit', params.limit.toString());
            if (params?.offset)
                queryParams.append('offset', params.offset.toString());
            if (params?.type)
                queryParams.append('type', params.type);
            if (params?.startDate) {
                queryParams.append('start_date', params.startDate.toISOString());
            }
            if (params?.endDate) {
                queryParams.append('end_date', params.endDate.toISOString());
            }
            const url = `${this.apiPrefix}/history${queryParams.toString() ? `?${queryParams}` : ''}`;
            const response = await this.axiosInstance.get(url);
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const transactions = response.data.data.transactions.map(tx => this.normalizeTransaction(tx));
            utils_1.logger.info('Transaction history fetched:', {
                count: transactions.length,
                total: response.data.data.total
            });
            return transactions;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.data) {
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }
    async getTransaction(transactionId) {
        try {
            utils_1.logger.debug('Fetching transaction:', transactionId);
            // Note: This endpoint is not currently implemented in the API
            // You can get transaction details from the history endpoint instead
            throw new Error('getTransaction endpoint not available. Use getTransactionHistory() to retrieve transaction details.');
        }
    }
    async refund(transactionId, reason) {
        try {
            utils_1.logger.debug('Processing refund:', { transactionId, reason });
            // Note: This endpoint is not currently implemented in the API
            // Refunds should be handled through a different process
            throw new Error('Refund endpoint not available. Please contact support for refund requests.');
        }
    }
    normalizeTransaction(transaction) {
        return {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            createdAt: new Date(transaction.created_at || transaction.createdAt),
            status: transaction.status,
            metadata: transaction.metadata
        };
    }
    notifyParent(type, data) {
        if (typeof window !== 'undefined' && window.parent !== window && this.parentOrigin) {
            window.parent.postMessage({ type, ...data }, this.parentOrigin);
        }
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=ApiClient.js.map