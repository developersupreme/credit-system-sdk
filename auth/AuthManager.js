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
        console.log('[SDK-AuthManager] init() called', {
            isInitialized: this.isInitialized,
            authMode: this.config.authMode
        });

        if (this.isInitialized) {
            utils_1.logger.debug('AuthManager already initialized');
            console.log('[SDK-AuthManager] Already initialized, skipping');
            return;
        }

        // SDK no longer handles iframe authentication - application should handle it
        console.log('[SDK-AuthManager] Auth mode:', this.config.authMode);
        this.isInitialized = true;
        console.log('[SDK-AuthManager] Initialization complete');
    }
    // Removed iframe-related methods - application handles iframe detection and parent communication
    async authenticate(credentials) {
        if (!utils_1.Validators.validateEmail(credentials.email)) {
            throw utils_1.CreditError.validationError('Invalid email format');
        }
        if (!credentials.password) {
            throw utils_1.CreditError.validationError('Password is required');
        }
        try {
            const response = await this.axiosInstance.post('/secure-credits/standalone/auth', credentials);
            if (!response.data.success) {
                throw utils_1.CreditError.authenticationFailed(response.data.message || 'Authentication failed');
            }
            const { token, expires_at, user } = response.data;
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
    async authenticateWithToken(token, skipValidation = false) {
        try {
            const payload = (0, utils_1.parseJWT)(token);
            const expiresAt = new Date(payload.exp * 1000);
            if (utils_1.Validators.isTokenExpired(expiresAt)) {
                throw utils_1.CreditError.tokenExpired();
            }

            // For iframe tokens, we can skip backend validation as they're already trusted from parent
            if (skipValidation && payload.user) {
                // Use the user data from JWT payload for iframe tokens
                const user = payload.user;
                this.setToken(token, expiresAt, user);
                utils_1.logger.info('Token authentication successful (iframe mode)', { userId: user.id });
                return user;
            }

            // For standalone mode, we trust the token and decode user info from it
            // Note: There's no validate endpoint for standalone mode in the API
            this.jwtToken = token;
            const user = payload.user || { id: payload.sub, email: payload.email };
            this.setToken(token, expiresAt, user);
            utils_1.logger.info('Token authentication successful (standalone mode)', { userId: user.id });
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

        utils_1.logger.debug('Token set successfully', {
            hasToken: !!token,
            expiresAt: expiresAt?.toISOString(),
            userId: user?.id
        });

        if (this.config.autoRefreshToken !== false && expiresAt) {
            console.log('[TOKEN-REFRESH] Auto-refresh is enabled, scheduling token refresh');
            this.scheduleTokenRefresh();
        } else {
            console.log('[TOKEN-REFRESH] Auto-refresh is disabled or no expiry date');
        }

        // SDK no longer sends messages to parent - application handles communication
    }
    scheduleTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        if (!this.tokenExpiresAt) {
            console.log('[TOKEN-REFRESH] No token expiry date, skipping refresh scheduling');
            return;
        }
        const bufferTime = this.config.tokenRefreshBuffer || 60000; // Default 1 minute
        const timeUntilExpiry = this.tokenExpiresAt.getTime() - Date.now();
        const refreshTime = Math.max(0, timeUntilExpiry - bufferTime);

        console.log('[TOKEN-REFRESH] Token refresh scheduling details:', {
            authMode: this.config.authMode,
            tokenExpiresAt: this.tokenExpiresAt.toISOString(),
            currentTime: new Date().toISOString(),
            timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + ' seconds',
            bufferTime: bufferTime / 1000 + ' seconds',
            refreshScheduledIn: Math.round(refreshTime / 1000) + ' seconds'
        });

        if (refreshTime > 0) {
            this.refreshTimer = setTimeout(() => {
                console.log('[TOKEN-REFRESH] Attempting to refresh token now...');
                this.refreshToken().catch((error) => {
                    console.error('[TOKEN-REFRESH] Token refresh failed:', error.message);
                    utils_1.logger.error('Token refresh failed:', error);
                    this.handleTokenExpiry();
                });
            }, refreshTime);
            console.log(`[TOKEN-REFRESH] Token refresh scheduled successfully, will refresh in ${Math.round(refreshTime / 1000)} seconds`);
            utils_1.logger.debug(`Token refresh scheduled in ${refreshTime}ms`);
        } else {
            console.log('[TOKEN-REFRESH] Token already expired or about to expire, triggering immediate refresh');
            this.refreshToken().catch((error) => {
                console.error('[TOKEN-REFRESH] Immediate token refresh failed:', error.message);
                this.handleTokenExpiry();
            });
        }
    }
    async refreshToken() {
        console.log('[TOKEN-REFRESH] refreshToken() called in standalone mode');
        console.log('[TOKEN-REFRESH] Current auth mode:', this.config.authMode);

        if (!this.jwtToken) {
            console.error('[TOKEN-REFRESH] No token to refresh');
            throw utils_1.CreditError.authenticationFailed('No token to refresh');
        }

        // Note: There's no refresh-token endpoint for standalone mode in the API
        // The application should handle re-authentication when token expires
        console.warn('[TOKEN-REFRESH] Token refresh not available for standalone mode. User needs to re-authenticate.');
        console.log('[TOKEN-REFRESH] Token expiry details:', {
            tokenExpiresAt: this.tokenExpiresAt?.toISOString(),
            currentTime: new Date().toISOString(),
            isExpired: this.tokenExpiresAt ? this.tokenExpiresAt < new Date() : true
        });

        utils_1.logger.warn('Token refresh not available for standalone mode. Please re-authenticate.');
        throw utils_1.CreditError.tokenExpired();
    }
    handleTokenExpiry() {
        console.log('[TOKEN-REFRESH] handleTokenExpiry() called - Token has expired');
        console.log('[TOKEN-REFRESH] Clearing authentication state');

        this.jwtToken = null;
        this.tokenExpiresAt = null;
        this.user = null;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        if (this.config.onTokenExpired) {
            console.log('[TOKEN-REFRESH] Calling onTokenExpired callback');
            this.config.onTokenExpired();
        }
        utils_1.logger.warn('Session expired');
        console.warn('[TOKEN-REFRESH] Session expired - User needs to login again');
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