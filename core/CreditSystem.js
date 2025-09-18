"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditSystem = void 0;
const types_1 = require("../types");
const AuthManager_1 = require("../auth/AuthManager");
const ApiClient_1 = require("../api/ApiClient");
const utils_1 = require("../utils");
class CreditSystem {
    constructor(config) {
        this.eventHandlers = {};
        this.balanceCache = null;
        this.balanceCacheExpiry = 30000; // 30 seconds
        this.initialized = false;
        this.refreshBalanceSilently = (0, utils_1.debounce)(async () => {
            try {
                await this.getBalance(false);
            }
            catch (error) {
                utils_1.logger.debug('Silent balance refresh failed:', error);
            }
        }, 1000);
        utils_1.Validators.validateConfig(config);
        this.config = this.normalizeConfig(config);
        this.authManager = new AuthManager_1.AuthManager(this.config);
        this.apiClient = new ApiClient_1.ApiClient(this.authManager.getAxiosInstance(), this.config.parentOrigin);
        this.setupEventListeners();
        this.setupErrorHandler();
    }
    normalizeConfig(config) {
        // Auto-detect if in iframe and set appropriate mode
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        const defaultAuthMode = isInIframe ? 'jwt' : 'standalone';

        return {
            ...config,
            apiUrl: config.apiUrl.replace(/\/$/, ''), // Remove trailing slash
            authMode: config.authMode || defaultAuthMode,
            autoRefreshToken: config.autoRefreshToken !== false,
            tokenRefreshBuffer: config.tokenRefreshBuffer || 60000 // Default 1 minute
        };
    }
    setupEventListeners() {
        if (typeof window === 'undefined') {
            return;
        }
        // Listen for messages from iframe parent
        window.addEventListener('message', (event) => {
            if (this.config.parentOrigin && event.origin !== this.config.parentOrigin) {
                return;
            }
            const message = event.data;
            this.handleIframeMessage(message);
        });
        // Setup visibility change listener for auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.authManager.isAuthenticated()) {
                this.refreshBalanceSilently();
            }
        });
    }
    setupErrorHandler() {
        if (this.config.onError) {
            this.eventHandlers.onError = this.config.onError;
        }
        if (this.config.onTokenExpired) {
            // Override config handler to also trigger event handler
            const originalHandler = this.config.onTokenExpired;
            this.config.onTokenExpired = () => {
                originalHandler();
                if (this.eventHandlers.onSessionExpired) {
                    this.eventHandlers.onSessionExpired();
                }
            };
        }
    }
    handleIframeMessage(message) {
        switch (message.type) {
            case types_1.MessageType.BALANCE_UPDATE:
                if (message.balance !== undefined) {
                    this.updateBalanceCache(message.balance);
                    if (this.eventHandlers.onBalanceChanged) {
                        this.eventHandlers.onBalanceChanged(message.balance);
                    }
                }
                break;
            case types_1.MessageType.AUTHENTICATION_ERROR:
                this.handleError(utils_1.CreditError.authenticationFailed(message.error));
                break;
            case types_1.MessageType.ERROR:
                this.handleError(new Error(message.message || 'Unknown error'));
                break;
        }
    }
    handleError(error) {
        utils_1.logger.error('Error occurred:', error);
        if (this.eventHandlers.onError) {
            const creditError = error instanceof utils_1.CreditError
                ? error
                : utils_1.CreditError.fromApiResponse({ error: error.message });
            this.eventHandlers.onError(creditError);
        }
    }
    /**
     * Initialize the credit system
     * Must be called before using other methods
     */
    async init() {
        if (this.initialized) {
            utils_1.logger.debug('CreditSystem already initialized');
            return;
        }
        try {
            await this.authManager.init();
            this.initialized = true;

            // If authenticated via iframe, trigger authenticated event
            if (this.authManager.isAuthenticated()) {
                const user = this.authManager.getUser();
                if (user && this.eventHandlers.onAuthenticated) {
                    this.eventHandlers.onAuthenticated(user);
                }
                // Fetch initial balance for iframe auth
                this.refreshBalanceSilently();
            }

            utils_1.logger.info('CreditSystem initialized successfully');
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Set log level for debugging
     */
    setLogLevel(level) {
        utils_1.logger.setLevel(level);
    }
    /**
     * Register event handlers
     */
    on(event, handler) {
        this.eventHandlers[event] = handler;
    }
    /**
     * Remove event handler
     */
    off(event) {
        delete this.eventHandlers[event];
    }
    /**
     * Authenticate user with email and password
     */
    async login(credentials) {
        this.ensureInitialized();
        try {
            const user = await this.authManager.authenticate(credentials);
            if (this.eventHandlers.onAuthenticated) {
                this.eventHandlers.onAuthenticated(user);
            }
            // Fetch initial balance
            this.refreshBalanceSilently();
            return user;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Authenticate with an existing JWT token
     */
    async loginWithToken(token) {
        this.ensureInitialized();
        try {
            const user = await this.authManager.authenticateWithToken(token);
            if (this.eventHandlers.onAuthenticated) {
                this.eventHandlers.onAuthenticated(user);
            }
            // Fetch initial balance
            this.refreshBalanceSilently();
            return user;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Log out the current user
     */
    logout() {
        this.authManager.logout();
        this.balanceCache = null;
        utils_1.logger.info('User logged out');
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.authManager.isAuthenticated();
    }
    /**
     * Get current authenticated user
     */
    getUser() {
        return this.authManager.getUser();
    }
    /**
     * Get current credit balance
     */
    async getBalance(useCache = true) {
        this.ensureAuthenticated();
        try {
            if (useCache && this.balanceCache && this.isBalanceCacheValid()) {
                return this.balanceCache.balance;
            }
            const balance = await this.apiClient.getBalance();
            this.updateBalanceCache(balance.balance);
            if (this.eventHandlers.onBalanceChanged) {
                this.eventHandlers.onBalanceChanged(balance.balance);
            }
            return balance.balance;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Spend credits
     */
    async spend(amount, description, metadata) {
        this.ensureAuthenticated();
        try {
            const request = { amount, description, metadata };
            const transaction = await this.apiClient.spend(request);
            // Invalidate balance cache
            this.balanceCache = null;
            if (this.eventHandlers.onTransactionComplete) {
                this.eventHandlers.onTransactionComplete(transaction);
            }
            // Refresh balance in background
            this.refreshBalanceSilently();
            return transaction;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Add credits to account
     */
    async addCredits(amount, description, metadata) {
        this.ensureAuthenticated();
        try {
            const request = { amount, description, metadata };
            const transaction = await this.apiClient.addCredits(request);
            // Invalidate balance cache
            this.balanceCache = null;
            if (this.eventHandlers.onTransactionComplete) {
                this.eventHandlers.onTransactionComplete(transaction);
            }
            // Refresh balance in background
            this.refreshBalanceSilently();
            return transaction;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Get transaction history
     */
    async getTransactionHistory(params) {
        this.ensureAuthenticated();
        try {
            return await this.apiClient.getTransactionHistory(params);
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Get a specific transaction
     */
    async getTransaction(transactionId) {
        this.ensureAuthenticated();
        try {
            return await this.apiClient.getTransaction(transactionId);
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Refund a transaction
     */
    async refundTransaction(transactionId, reason) {
        this.ensureAuthenticated();
        try {
            const transaction = await this.apiClient.refund(transactionId, reason);
            // Invalidate balance cache
            this.balanceCache = null;
            if (this.eventHandlers.onTransactionComplete) {
                this.eventHandlers.onTransactionComplete(transaction);
            }
            // Refresh balance in background
            this.refreshBalanceSilently();
            return transaction;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Check if user has sufficient credits
     */
    async hasSufficientCredits(amount) {
        const balance = await this.getBalance();
        return balance >= amount;
    }
    /**
     * Refresh authentication token manually
     */
    async refreshToken() {
        this.ensureAuthenticated();
        try {
            await this.authManager.refreshToken();
            utils_1.logger.info('Token refreshed manually');
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw utils_1.CreditError.notInitialized();
        }
    }
    ensureAuthenticated() {
        this.ensureInitialized();
        if (!this.authManager.isAuthenticated()) {
            throw utils_1.CreditError.authenticationFailed('User is not authenticated');
        }
    }
    updateBalanceCache(balance) {
        this.balanceCache = {
            balance,
            lastUpdated: new Date()
        };
        if (this.config.onBalanceUpdate) {
            this.config.onBalanceUpdate(balance);
        }
    }
    isBalanceCacheValid() {
        if (!this.balanceCache || !this.balanceCache.lastUpdated) {
            return false;
        }
        const age = Date.now() - this.balanceCache.lastUpdated.getTime();
        return age < this.balanceCacheExpiry;
    }
    /**
     * Create iframe element for embedded credit system
     */
    static createIframe(containerId, iframeUrl, config) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        const iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
        container.appendChild(iframe);
        // Auto-resize iframe based on content
        window.addEventListener('message', (event) => {
            if (config?.parentOrigin && event.origin !== config.parentOrigin) {
                return;
            }
            if (event.data.type === 'RESIZE_IFRAME' && event.data.height) {
                iframe.style.height = `${event.data.height}px`;
            }
        });
        return iframe;
    }
}
exports.CreditSystem = CreditSystem;
//# sourceMappingURL=CreditSystem.js.map