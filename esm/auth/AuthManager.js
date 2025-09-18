import axios from 'axios';
import { MessageType } from '../types';
import { CreditError, Validators, logger, parseJWT } from '../utils';
export class AuthManager {
    constructor(config) {
        this.jwtToken = null;
        this.tokenExpiresAt = null;
        this.user = null;
        this.refreshTimer = null;
        this.isInitialized = false;
        this.config = config;
        this.axiosInstance = axios.create({
            baseURL: config.apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        // Add request interceptor to include auth token
        this.axiosInstance.interceptors.request.use((request) => {
            if (this.jwtToken) {
                request.headers.Authorization = `Bearer ${this.jwtToken}`;
            }
            return request;
        }, (error) => Promise.reject(error));
        // Add response interceptor to handle auth errors
        this.axiosInstance.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 401 && this.config.autoRefreshToken) {
                logger.info('Token expired, attempting refresh...');
                try {
                    await this.refreshToken();
                    // Retry the original request
                    const originalRequest = error.config;
                    originalRequest.headers.Authorization = `Bearer ${this.jwtToken}`;
                    return this.axiosInstance(originalRequest);
                }
                catch (refreshError) {
                    this.handleTokenExpiry();
                    throw refreshError;
                }
            }
            return Promise.reject(error);
        });
    }
    async init() {
        if (this.isInitialized) {
            logger.debug('AuthManager already initialized');
            return;
        }
        // Auto-detect iframe mode and initialize accordingly
        if (this.isInIframe() && (this.config.authMode === 'jwt' || this.config.authMode === 'auto')) {
            logger.info('Detected iframe environment, initializing iframe authentication');
            try {
                await this.initIframeAuth();
            } catch (error) {
                logger.warn('Iframe authentication failed, falling back to standalone mode', error);
                // Don't throw, allow fallback to standalone mode
            }
        }
        this.isInitialized = true;
    }
    isInIframe() {
        try {
            const inIframe = window.self !== window.top;
            logger.debug('Iframe detection:', { inIframe, windowSelf: window.self === window.top });
            return inIframe;
        }
        catch (e) {
            logger.debug('Iframe detection error, assuming iframe:', e);
            return true;
        }
    }
    async initIframeAuth() {
        return new Promise((resolve, reject) => {
            logger.info('Starting iframe authentication process');

            const timeout = setTimeout(() => {
                logger.error('Iframe auth timeout - no response from parent');
                reject(CreditError.authenticationFailed('Timeout waiting for parent authentication'));
            }, 10000);

            const handleMessage = (event) => {
                logger.debug('Received message in iframe:', {
                    origin: event.origin,
                    expectedOrigin: this.config.parentOrigin,
                    messageType: event.data?.type,
                    hasToken: !!event.data?.token
                });

                // If parentOrigin is not set, accept from any origin (less secure but more flexible)
                if (this.config.parentOrigin && event.origin !== this.config.parentOrigin) {
                    logger.warn('Ignored message from unauthorized origin:', event.origin);
                    return;
                }

                const message = event.data;
                if (message.type === MessageType.JWT_TOKEN || message.type === 'JWT_TOKEN') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handleMessage);

                    if (message.token && message.user) {
                        // Handle both expiresAt and expires_at formats
                        const expiresAt = message.expiresAt || message.expires_at;
                        this.setToken(message.token, expiresAt ? new Date(expiresAt) : null, message.user);
                        logger.info('Iframe authentication successful', { userId: message.user.id });
                        resolve();
                    }
                    else {
                        logger.error('Invalid token data from parent:', message);
                        reject(CreditError.authenticationFailed('Invalid token data from parent'));
                    }
                }
                else if (message.type === MessageType.AUTHENTICATION_ERROR || message.type === 'AUTHENTICATION_ERROR') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handleMessage);
                    logger.error('Authentication error from parent:', message.error);
                    reject(CreditError.authenticationFailed(message.error || 'Authentication failed'));
                }
            };

            window.addEventListener('message', handleMessage);

            // Request credentials from parent
            const targetOrigin = this.config.parentOrigin || '*';
            logger.info('Requesting credentials from parent window', { targetOrigin });
            window.parent.postMessage({
                type: MessageType.REQUEST_CREDENTIALS,
                source: 'credit-system-sdk'
            }, targetOrigin);
        });
    }
    async authenticate(credentials) {
        if (!Validators.validateEmail(credentials.email)) {
            throw CreditError.validationError('Invalid email format');
        }
        if (!credentials.password) {
            throw CreditError.validationError('Password is required');
        }
        try {
            const response = await this.axiosInstance.post('/standalone/auth', credentials);
            if (!response.data.success) {
                throw CreditError.authenticationFailed(response.data.message || 'Authentication failed');
            }
            const { token, expires_at, user } = response.data;
            this.setToken(token, new Date(expires_at), user);
            logger.info('Authentication successful', { userId: user.id });
            return user;
        }
        catch (error) {
            if (error instanceof CreditError) {
                throw error;
            }
            if (error.response?.status === 401) {
                throw CreditError.authenticationFailed('Invalid email or password');
            }
            throw CreditError.networkError(error);
        }
    }
    async authenticateWithToken(token) {
        try {
            const payload = parseJWT(token);
            const expiresAt = new Date(payload.exp * 1000);
            if (Validators.isTokenExpired(expiresAt)) {
                throw CreditError.tokenExpired();
            }
            // Validate token with backend
            this.jwtToken = token;
            const response = await this.axiosInstance.get('/standalone/validate');
            if (!response.data.success || !response.data.data) {
                throw CreditError.authenticationFailed('Invalid token');
            }
            const user = response.data.data.user;
            this.setToken(token, expiresAt, user);
            logger.info('Token authentication successful', { userId: user.id });
            return user;
        }
        catch (error) {
            this.jwtToken = null; // Clear invalid token
            if (error instanceof CreditError) {
                throw error;
            }
            throw CreditError.authenticationFailed('Token validation failed');
        }
    }
    setToken(token, expiresAt, user) {
        this.jwtToken = token;
        this.tokenExpiresAt = expiresAt;
        this.user = user;

        logger.debug('Token set successfully', {
            hasToken: !!token,
            expiresAt: expiresAt?.toISOString(),
            userId: user?.id
        });

        if (this.config.autoRefreshToken !== false && expiresAt) {
            this.scheduleTokenRefresh();
        }

        // Notify parent if in iframe
        if (this.isInIframe() && this.config.parentOrigin) {
            window.parent.postMessage({
                type: MessageType.USER_CREDENTIALS,
                user
            }, this.config.parentOrigin);
        }
    }
    scheduleTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        if (!this.tokenExpiresAt) {
            return;
        }
        const bufferTime = this.config.tokenRefreshBuffer || 60000; // Default 1 minute
        const timeUntilExpiry = this.tokenExpiresAt.getTime() - Date.now();
        const refreshTime = Math.max(0, timeUntilExpiry - bufferTime);
        if (refreshTime > 0) {
            this.refreshTimer = setTimeout(() => {
                this.refreshToken().catch((error) => {
                    logger.error('Token refresh failed:', error);
                    this.handleTokenExpiry();
                });
            }, refreshTime);
            logger.debug(`Token refresh scheduled in ${refreshTime}ms`);
        }
    }
    async refreshToken() {
        if (!this.jwtToken) {
            throw CreditError.authenticationFailed('No token to refresh');
        }
        try {
            const response = await this.axiosInstance.post('/standalone/refresh-token');
            if (!response.data.success || !response.data.data) {
                throw CreditError.authenticationFailed('Token refresh failed');
            }
            const { token, expires_at } = response.data.data;
            this.jwtToken = token;
            this.tokenExpiresAt = new Date(expires_at);
            this.scheduleTokenRefresh();
            logger.info('Token refreshed successfully');
            if (this.config.onTokenExpired) {
                this.config.onTokenExpired();
            }
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw CreditError.tokenExpired();
            }
            throw CreditError.networkError(error);
        }
    }
    handleTokenExpiry() {
        this.jwtToken = null;
        this.tokenExpiresAt = null;
        this.user = null;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        if (this.config.onTokenExpired) {
            this.config.onTokenExpired();
        }
        logger.warn('Session expired');
    }
    logout() {
        this.handleTokenExpiry();
        logger.info('User logged out');
    }
    isAuthenticated() {
        if (!this.jwtToken || !this.tokenExpiresAt) {
            return false;
        }
        return !Validators.isTokenExpired(this.tokenExpiresAt, 0);
    }
    getUser() {
        return this.user;
    }
    getToken() {
        return this.jwtToken;
    }
    getAxiosInstance() {
        return this.axiosInstance;
    }
}
//# sourceMappingURL=AuthManager.js.map