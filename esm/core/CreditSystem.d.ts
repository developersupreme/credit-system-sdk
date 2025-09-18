import { CreditSystemConfig, User, AuthCredentials, Transaction, TransactionHistoryParams, EventHandlers } from '../types';
import { LogLevel } from '../utils';
export declare class CreditSystem {
    private config;
    private authManager;
    private apiClient;
    private eventHandlers;
    private balanceCache;
    private balanceCacheExpiry;
    private initialized;
    constructor(config: CreditSystemConfig);
    private normalizeConfig;
    private setupEventListeners;
    private setupErrorHandler;
    private handleIframeMessage;
    private handleError;
    /**
     * Initialize the credit system
     * Must be called before using other methods
     */
    init(): Promise<void>;
    /**
     * Set log level for debugging
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Register event handlers
     */
    on(event: keyof EventHandlers, handler: Function): void;
    /**
     * Remove event handler
     */
    off(event: keyof EventHandlers): void;
    /**
     * Authenticate user with email and password
     */
    login(credentials: AuthCredentials): Promise<User>;
    /**
     * Authenticate with an existing JWT token
     */
    loginWithToken(token: string): Promise<User>;
    /**
     * Log out the current user
     */
    logout(): void;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Get current authenticated user
     */
    getUser(): User | null;
    /**
     * Get current credit balance
     */
    getBalance(useCache?: boolean): Promise<number>;
    /**
     * Spend credits
     */
    spend(amount: number, description: string, metadata?: Record<string, any>): Promise<Transaction>;
    /**
     * Add credits to account
     */
    addCredits(amount: number, description?: string, metadata?: Record<string, any>): Promise<Transaction>;
    /**
     * Get transaction history
     */
    getTransactionHistory(params?: TransactionHistoryParams): Promise<Transaction[]>;
    /**
     * Get a specific transaction
     */
    getTransaction(transactionId: string | number): Promise<Transaction>;
    /**
     * Refund a transaction
     */
    refundTransaction(transactionId: string | number, reason?: string): Promise<Transaction>;
    /**
     * Check if user has sufficient credits
     */
    hasSufficientCredits(amount: number): Promise<boolean>;
    /**
     * Refresh authentication token manually
     */
    refreshToken(): Promise<void>;
    private ensureInitialized;
    private ensureAuthenticated;
    private updateBalanceCache;
    private isBalanceCacheValid;
    private refreshBalanceSilently;
    /**
     * Create iframe element for embedded credit system
     */
    static createIframe(containerId: string, iframeUrl: string, config?: Partial<CreditSystemConfig>): HTMLIFrameElement;
}
//# sourceMappingURL=CreditSystem.d.ts.map