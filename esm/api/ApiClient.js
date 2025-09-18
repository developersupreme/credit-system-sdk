import { MessageType } from '../types';
import { CreditError, Validators, logger, retry } from '../utils';
export class ApiClient {
    constructor(axiosInstance, parentOrigin) {
        this.axiosInstance = axiosInstance;
        this.parentOrigin = parentOrigin;
    }
    async getBalance() {
        try {
            logger.debug('Fetching balance...');
            const response = await retry(() => this.axiosInstance.get('/balance'), 3, 1000);
            if (!response.data.success || response.data.data === undefined) {
                throw CreditError.fromApiResponse(response.data);
            }
            const balance = {
                balance: response.data.data.balance,
                lastUpdated: new Date()
            };
            // Notify parent if in iframe
            this.notifyParent(MessageType.BALANCE_UPDATE, { balance: balance.balance });
            logger.info('Balance fetched:', balance.balance);
            return balance;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.data) {
                throw CreditError.fromApiResponse(error.response.data);
            }
            throw CreditError.networkError(error);
        }
    }
    async spend(request) {
        Validators.validateSpendRequest(request);
        try {
            logger.debug('Processing spend request:', request);
            const response = await this.axiosInstance.post('/spend', request);
            if (!response.data.success || !response.data.data) {
                throw CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            // Notify parent if in iframe
            this.notifyParent(MessageType.OPERATION_COMPLETE, {
                operation: 'spend',
                details: request,
                newBalance: response.data.data.new_balance
            });
            logger.info('Spend successful:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.status === 400) {
                const message = error.response.data?.message || error.response.data?.error;
                if (message?.includes('insufficient')) {
                    const match = message.match(/Available: (\d+)/);
                    const available = match ? parseInt(match[1]) : 0;
                    throw CreditError.insufficientCredits(request.amount, available);
                }
                throw CreditError.validationError(message || 'Invalid spend request');
            }
            if (error.response?.data) {
                throw CreditError.fromApiResponse(error.response.data);
            }
            throw CreditError.networkError(error);
        }
    }
    async addCredits(request) {
        Validators.validateAmount(request.amount);
        try {
            logger.debug('Adding credits:', request);
            const response = await this.axiosInstance.post('/add-credits', request);
            if (!response.data.success || !response.data.data) {
                throw CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            // Notify parent if in iframe
            this.notifyParent(MessageType.OPERATION_COMPLETE, {
                operation: 'add_credits',
                details: request,
                newBalance: response.data.data.new_balance
            });
            logger.info('Credits added:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.data) {
                throw CreditError.fromApiResponse(error.response.data);
            }
            throw CreditError.networkError(error);
        }
    }
    async getTransactionHistory(params) {
        if (params) {
            Validators.validateTransactionHistoryParams(params);
        }
        try {
            logger.debug('Fetching transaction history:', params);
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
            const url = `/history${queryParams.toString() ? `?${queryParams}` : ''}`;
            const response = await this.axiosInstance.get(url);
            if (!response.data.success || !response.data.data) {
                throw CreditError.fromApiResponse(response.data);
            }
            const transactions = response.data.data.transactions.map(tx => this.normalizeTransaction(tx));
            logger.info('Transaction history fetched:', {
                count: transactions.length,
                total: response.data.data.total
            });
            return transactions;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.data) {
                throw CreditError.fromApiResponse(error.response.data);
            }
            throw CreditError.networkError(error);
        }
    }
    async getTransaction(transactionId) {
        try {
            logger.debug('Fetching transaction:', transactionId);
            const response = await this.axiosInstance.get(`/transaction/${transactionId}`);
            if (!response.data.success || !response.data.data) {
                throw CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            logger.info('Transaction fetched:', transaction.id);
            return transaction;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.status === 404) {
                throw CreditError.validationError(`Transaction ${transactionId} not found`);
            }
            if (error.response?.data) {
                throw CreditError.fromApiResponse(error.response.data);
            }
            throw CreditError.networkError(error);
        }
    }
    async refund(transactionId, reason) {
        try {
            logger.debug('Processing refund:', { transactionId, reason });
            const response = await this.axiosInstance.post(`/refund/${transactionId}`, { reason });
            if (!response.data.success || !response.data.data) {
                throw CreditError.fromApiResponse(response.data);
            }
            const transaction = this.normalizeTransaction(response.data.data.transaction);
            // Notify parent if in iframe
            this.notifyParent(MessageType.OPERATION_COMPLETE, {
                operation: 'refund',
                details: { transactionId, reason },
                newBalance: response.data.data.new_balance
            });
            logger.info('Refund successful:', {
                transactionId: transaction.id,
                amount: transaction.amount
            });
            return transaction;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.status === 404) {
                throw CreditError.validationError(`Transaction ${transactionId} not found`);
            }
            if (error.response?.status === 400) {
                const message = error.response.data?.message || error.response.data?.error;
                throw CreditError.validationError(message || 'Refund not allowed for this transaction');
            }
            if (error.response?.data) {
                throw CreditError.fromApiResponse(error.response.data);
            }
            throw CreditError.networkError(error);
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
//# sourceMappingURL=ApiClient.js.map