"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const axios_1 = __importDefault(require("axios"));
const types_1 = require("../types");
const utils_1 = require("../utils");
class AuthManager {
    constructor(config) {
        this.jwtToken = null;
        this.tokenExpiresAt = null;
        this.user = null;
        this.refreshTimer = null;
        this.isInitialized = false;
        this.config = config;
        this.axiosInstance = axios_1.default.create({
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
                utils_1.logger.info('Token expired, attempting refresh...');
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
            utils_1.logger.debug('AuthManager already initialized');
            return;
        }
        if (this.config.authMode === 'jwt' && this.isInIframe()) {
            await this.initIframeAuth();
        }
        this.isInitialized = true;
    }
    isInIframe() {
        try {
            return window.self !== window.top;
        }
        catch (e) {
            return true;
        }
    }
    async initIframeAuth() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(utils_1.CreditError.authenticationFailed('Timeout waiting for parent authentication'));
            }, 10000);
            const handleMessage = (event) => {
                if (this.config.parentOrigin && event.origin !== this.config.parentOrigin) {
                    utils_1.logger.warn('Ignored message from unauthorized origin:', event.origin);
                    return;
                }
                const message = event.data;
                if (message.type === types_1.MessageType.JWT_TOKEN) {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handleMessage);
                    if (message.token && message.expiresAt && message.user) {
                        this.setToken(message.token, new Date(message.expiresAt), message.user);
                        resolve();
                    }
                    else {
                        reject(utils_1.CreditError.authenticationFailed('Invalid token data from parent'));
                    }
                }
                else if (message.type === types_1.MessageType.AUTHENTICATION_ERROR) {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handleMessage);
                    reject(utils_1.CreditError.authenticationFailed(message.error || 'Authentication failed'));
                }
            };
            window.addEventListener('message', handleMessage);
            // Request credentials from parent
            if (this.config.parentOrigin) {
                window.parent.postMessage({ type: types_1.MessageType.REQUEST_CREDENTIALS }, this.config.parentOrigin);
            }
        });
    }
    async authenticate(credentials) {
        if (!utils_1.Validators.validateEmail(credentials.email)) {
            throw utils_1.CreditError.validationError('Invalid email format');
        }
        if (!credentials.password) {
            throw utils_1.CreditError.validationError('Password is required');
        }
        try {
            const response = await this.axiosInstance.post('/auth', credentials);
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.authenticationFailed(response.data.message);
            }
            const { token, expires_at, user } = response.data.data;
            this.setToken(token, new Date(expires_at), user);
            utils_1.logger.info('Authentication successful', { userId: user.id });
            return user;
        }
        catch (error) {
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            if (error.response?.status === 401) {
                throw utils_1.CreditError.authenticationFailed('Invalid email or password');
            }
            throw utils_1.CreditError.networkError(error);
        }
    }
    async authenticateWithToken(token) {
        try {
            const payload = (0, utils_1.parseJWT)(token);
            const expiresAt = new Date(payload.exp * 1000);
            if (utils_1.Validators.isTokenExpired(expiresAt)) {
                throw utils_1.CreditError.tokenExpired();
            }
            // Validate token with backend
            this.jwtToken = token;
            const response = await this.axiosInstance.get('/validate');
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.authenticationFailed('Invalid token');
            }
            const user = response.data.data.user;
            this.setToken(token, expiresAt, user);
            utils_1.logger.info('Token authentication successful', { userId: user.id });
            return user;
        }
        catch (error) {
            this.jwtToken = null; // Clear invalid token
            if (error instanceof utils_1.CreditError) {
                throw error;
            }
            throw utils_1.CreditError.authenticationFailed('Token validation failed');
        }
    }
    setToken(token, expiresAt, user) {
        this.jwtToken = token;
        this.tokenExpiresAt = expiresAt;
        this.user = user;
        if (this.config.autoRefreshToken !== false) {
            this.scheduleTokenRefresh();
        }
        // Notify parent if in iframe
        if (this.isInIframe() && this.config.parentOrigin) {
            window.parent.postMessage({
                type: types_1.MessageType.USER_CREDENTIALS,
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
                    utils_1.logger.error('Token refresh failed:', error);
                    this.handleTokenExpiry();
                });
            }, refreshTime);
            utils_1.logger.debug(`Token refresh scheduled in ${refreshTime}ms`);
        }
    }
    async refreshToken() {
        if (!this.jwtToken) {
            throw utils_1.CreditError.authenticationFailed('No token to refresh');
        }
        try {
            const response = await this.axiosInstance.post('/refresh-token');
            if (!response.data.success || !response.data.data) {
                throw utils_1.CreditError.authenticationFailed('Token refresh failed');
            }
            const { token, expires_at } = response.data.data;
            this.jwtToken = token;
            this.tokenExpiresAt = new Date(expires_at);
            this.scheduleTokenRefresh();
            utils_1.logger.info('Token refreshed successfully');
            if (this.config.onTokenExpired) {
                this.config.onTokenExpired();
            }
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw utils_1.CreditError.tokenExpired();
            }
            throw utils_1.CreditError.networkError(error);
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
        utils_1.logger.warn('Session expired');
    }
    logout() {
        this.handleTokenExpiry();
        utils_1.logger.info('User logged out');
    }
    isAuthenticated() {
        if (!this.jwtToken || !this.tokenExpiresAt) {
            return false;
        }
        return !utils_1.Validators.isTokenExpired(this.tokenExpiresAt, 0);
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
exports.AuthManager = AuthManager;
//# sourceMappingURL=AuthManager.js.map