import { MessageType } from '../types';
import { AuthManager } from '../auth/AuthManager';
import { ApiClient } from '../api/ApiClient';
import { CreditError, Validators, logger, debounce } from '../utils';
export class CreditSystem {
    constructor(config) {
        console.log('[SDK-CreditSystem] Constructor called with config:', config);
        this.eventHandlers = {};
        this.balanceCache = null;
        this.balanceCacheExpiry = 30000; // 30 seconds
        this.initialized = false;
        this.refreshBalanceSilently = debounce(async () => {
            try {
                await this.getBalance(false);
            }
            catch (error) {
                logger.debug('Silent balance refresh failed:', error);
            }
        }, 1000);
        Validators.validateConfig(config);
        this.config = this.normalizeConfig(config);
        console.log('[SDK-CreditSystem] Normalized config:', this.config);

        this.authManager = new AuthManager(this.config);
        this.apiClient = new ApiClient(this.authManager.getAxiosInstance(), this.config.parentOrigin, this.config.authMode);
        this.setupEventListeners();
        this.setupErrorHandler();

        console.log('[SDK-CreditSystem] CreditSystem instance created');
    }
    normalizeConfig(config) {
        console.log('[SDK-CreditSystem] normalizeConfig() called');

        // Auto-detect if in iframe and set appropriate mode
        let isInIframe = false;
        try {
            isInIframe = typeof window !== 'undefined' && window.self !== window.top;
            console.log('[SDK-CreditSystem] Iframe detection in normalizeConfig:', {
                'typeof window': typeof window,
                'window.self': typeof window !== 'undefined' ? window.self : 'N/A',
                'window.top': typeof window !== 'undefined' ? window.top : 'N/A',
                'isInIframe': isInIframe
            });
        } catch (e) {
            // Cross-origin iframe, assume we're in iframe
            console.log('[SDK-CreditSystem] Cross-origin iframe detected (error accessing window.top)');
            isInIframe = true;
        }

        const defaultAuthMode = isInIframe ? 'jwt' : 'standalone';
        let finalAuthMode = config.authMode || defaultAuthMode;

        // IMPORTANT: Override authMode if we're in iframe but user specified standalone
        if (isInIframe && config.authMode === 'standalone') {
            console.warn('[SDK-CreditSystem] WARNING: Detected iframe environment but authMode is set to "standalone".');
            console.warn('[SDK-CreditSystem] Overriding to "jwt" mode for iframe compatibility.');
            console.warn('[SDK-CreditSystem] Remove authMode from config to use auto-detection.');
            finalAuthMode = 'jwt'; // Force JWT mode in iframe
        }

        console.log('[SDK-CreditSystem] Auth mode decision:', {
            isInIframe,
            userProvidedAuthMode: config.authMode,
            defaultAuthMode,
            finalAuthMode,
            parentOrigin: config.parentOrigin
        });

        // PROMINENT MODE DISPLAY
        console.log('\n' + '='.repeat(60));
        console.log('🔐 CREDIT SYSTEM SDK - AUTHENTICATION MODE');
        console.log('='.repeat(60));
        console.log(`📍 ENVIRONMENT: ${isInIframe ? '🖼️  IFRAME (EMBEDDED)' : '🖥️  STANDALONE'}`);
        console.log(`🔑 AUTH MODE: ${finalAuthMode === 'jwt' ? '🎫 JWT (PARENT TOKEN)' : '🔐 STANDALONE (EMAIL/PASSWORD)'}`);
        console.log(`✅ RUNNING IN: *** ${finalAuthMode.toUpperCase()} MODE ***`);
        console.log('='.repeat(60) + '\n');

        logger.info('CreditSystem configuration', {
            isInIframe,
            configuredAuthMode: config.authMode,
            finalAuthMode,
            parentOrigin: config.parentOrigin
        });

        return {
            ...config,
            apiUrl: config.apiUrl.replace(/\/$/, ''), // Remove trailing slash
            authMode: finalAuthMode,
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
            case MessageType.BALANCE_UPDATE:
                if (message.balance !== undefined) {
                    this.updateBalanceCache(message.balance);
                    if (this.eventHandlers.onBalanceChanged) {
                        this.eventHandlers.onBalanceChanged(message.balance);
                    }
                }
                break;
            case MessageType.AUTHENTICATION_ERROR:
                this.handleError(CreditError.authenticationFailed(message.error));
                break;
            case MessageType.ERROR:
                this.handleError(new Error(message.message || 'Unknown error'));
                break;
        }
    }
    handleError(error) {
        logger.error('Error occurred:', error);
        if (this.eventHandlers.onError) {
            const creditError = error instanceof CreditError
                ? error
                : CreditError.fromApiResponse({ error: error.message });
            this.eventHandlers.onError(creditError);
        }
    }
    /**
     * Check if running in iframe
     */
    isInIframe() {
        return this.authManager.isInIframe();
    }

    /**
     * Get current auth mode
     */
    getAuthMode() {
        return this.config.authMode;
    }

    /**
     * Initialize the credit system
     * Must be called before using other methods
     */
    async init() {
        console.log('[SDK-CreditSystem] init() called', {
            alreadyInitialized: this.initialized,
            authMode: this.config.authMode
        });

        if (this.initialized) {
            logger.debug('CreditSystem already initialized');
            console.log('[SDK-CreditSystem] Already initialized, skipping');
            return;
        }

        try {
            console.log('[SDK-CreditSystem] Calling authManager.init()...');

            // Mark as initialized BEFORE authManager.init() so that event handlers can use SDK methods
            this.initialized = true;

            await this.authManager.init();
            console.log('[SDK-CreditSystem] authManager.init() completed');

            // Check authentication status
            const isAuth = this.authManager.isAuthenticated();
            const user = this.authManager.getUser();
            console.log('[SDK-CreditSystem] Post-init auth check:', {
                isAuthenticated: isAuth,
                hasUser: !!user,
                userId: user?.id
            });

            // If authenticated via iframe, trigger authenticated event
            if (isAuth) {
                if (user && this.eventHandlers.onAuthenticated) {
                    console.log('[SDK-CreditSystem] Triggering onAuthenticated event');
                    this.eventHandlers.onAuthenticated(user);
                }
                // Fetch initial balance for iframe auth
                console.log('[SDK-CreditSystem] Fetching initial balance...');
                this.refreshBalanceSilently();
            }

            logger.info('CreditSystem initialized successfully');
            console.log('[SDK-CreditSystem] Initialization complete');
        }
        catch (error) {
            console.error('[SDK-CreditSystem] Initialization failed:', error);
            // Reset initialized flag if init fails
            this.initialized = false;
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Set log level for debugging
     */
    setLogLevel(level) {
        logger.setLevel(level);
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
            const user = await this.authManager.authenticateWithToken(token, false);
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
     * Authenticate with an iframe JWT token (skips backend validation)
     */
    async loginWithIframeToken(token, userData) {
        console.log('[SDK-CreditSystem] loginWithIframeToken() called');
        this.ensureInitialized();
        try {
            // Parse the token to get expiry
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiresAt = new Date(payload.exp * 1000);

            // Set the token directly without validation since it's from trusted parent
            this.authManager.setToken(token, expiresAt, userData);

            if (this.eventHandlers.onAuthenticated) {
                this.eventHandlers.onAuthenticated(userData);
            }

            // Fetch initial balance
            this.refreshBalanceSilently();

            logger.info('Iframe token authentication successful', { userId: userData.id });
            return userData;
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
        logger.info('User logged out');
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
            logger.info('Token refreshed manually');
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw CreditError.notInitialized();
        }
    }
    ensureAuthenticated() {
        this.ensureInitialized();
        if (!this.authManager.isAuthenticated()) {
            throw CreditError.authenticationFailed('User is not authenticated');
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
//# sourceMappingURL=CreditSystem.js.map