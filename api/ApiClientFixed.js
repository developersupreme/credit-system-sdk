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

        // FIX: Determine API prefix based on auth mode and existing base URL
        const baseURL = this.axiosInstance.defaults.baseURL || '';

        if (baseURL.includes('/secure-credits')) {
            // URL already has /secure-credits, just add the mode
            this.apiPrefix = this.authMode === 'jwt' ? '/iframe' : '/standalone';
            console.log('[SDK-ApiClient] Base URL already contains /secure-credits, using short prefix:', this.apiPrefix);
        } else {
            // URL doesn't have /secure-credits, add full path
            this.apiPrefix = this.authMode === 'jwt' ? '/secure-credits/iframe' : '/secure-credits/standalone';
            console.log('[SDK-ApiClient] Base URL does not contain /secure-credits, using full prefix:', this.apiPrefix);
        }

        console.log('[SDK-ApiClient] Initialized with baseURL:', baseURL, 'apiPrefix:', this.apiPrefix);
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
                newBalance: response.data.data.updated_balance || response.data.data.new_balance
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
            if (error.response?.status === 402 || error.response?.status === 400) {
                const message = error.response.data?.message || error.response.data?.error;
                if (message?.includes('Insufficient') || message?.includes('insufficient')) {
                    const match = message.match(/Available: (\d+)|Current balance: (\d+)/);
                    const available = match ? parseInt(match[1] || match[2]) : 0;
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
            console.log('[SDK-ApiClient] Calling add credits endpoint:', `${this.apiPrefix}/add`, 'with data:', request);

            const response = await this.axiosInstance.post(`${this.apiPrefix}/add`, {
                amount: request.amount,
                type: 'manual',
                description: request.description || 'Manual credit addition'
            });

            console.log('[SDK-ApiClient] Add credits response:', response.data);

            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }

            const transaction = this.normalizeTransaction(response.data.data.transaction);

            // Notify parent if in iframe
            this.notifyParent(types_1.MessageType.OPERATION_COMPLETE, {
                operation: 'add_credits',
                details: request,
                newBalance: response.data.data.updated_balance || response.data.data.new_balance
            });

            utils_1.logger.info('Credits added:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            console.error('[SDK-ApiClient] Add credits error:', error);
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.data) {
                console.error('[SDK-ApiClient] Add credits API error:', error.response.data);
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }

    async getTransactionHistory(params) {
        try {
            utils_1.logger.debug('Fetching transaction history...', params);
            const response = await this.axiosInstance.get(`${this.apiPrefix}/history`, { params });
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const transactions = (response.data.data.transactions || []).map(tx => this.normalizeTransaction(tx));
            utils_1.logger.info('Transaction history fetched:', transactions.length);
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
            const response = await this.axiosInstance.get(`${this.apiPrefix}/transaction/${transactionId}`);
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data);
            utils_1.logger.info('Transaction fetched:', transaction.id);
            return transaction;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.status === 404) {
                throw utils_1.CreditError.validationError('Transaction not found');
            }
            if (error.response?.data) {
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }

    async refund(transactionId, reason) {
        try {
            utils_1.logger.debug('Processing refund:', { transactionId, reason });
            const response = await this.axiosInstance.post(`${this.apiPrefix}/refund`, {
                transactionId,
                reason
            });
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            // Notify parent if in iframe
            this.notifyParent(types_1.MessageType.OPERATION_COMPLETE, {
                operation: 'refund',
                details: { transactionId, reason },
                newBalance: response.data.data.new_balance
            });
            utils_1.logger.info('Refund successful:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.status === 404) {
                throw utils_1.CreditError.validationError('Transaction not found');
            }
            if (error.response?.data) {
                throw utils_1.CreditError.fromApiResponse(error.response.data);
            }
            throw utils_1.CreditError.networkError(error);
        }
    }

    normalizeTransaction(tx) {
        return {
            id: tx.id,
            type: tx.type,
            amount: Math.abs(tx.amount), // Ensure amount is positive for display
            description: tx.description,
            createdAt: new Date(tx.created_at || tx.createdAt),
            status: tx.status || 'completed',
            metadata: tx.metadata
        };
    }

    notifyParent(type, data) {
        if (typeof window === 'undefined' || !this.parentOrigin || !window.parent) {
            return;
        }
        try {
            window.parent.postMessage({
                type,
                ...data,
                timestamp: new Date().toISOString()
            }, this.parentOrigin);
        }
        catch (error) {
            utils_1.logger.debug('Failed to notify parent:', error);
        }
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=ApiClient.js.map