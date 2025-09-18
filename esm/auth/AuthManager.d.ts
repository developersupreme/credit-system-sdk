import { AxiosInstance } from 'axios';
import { AuthCredentials, User, CreditSystemConfig } from '../types';
export declare class AuthManager {
    private jwtToken;
    private tokenExpiresAt;
    private user;
    private refreshTimer;
    private config;
    private axiosInstance;
    private isInitialized;
    constructor(config: CreditSystemConfig);
    init(): Promise<void>;
    private isInIframe;
    private initIframeAuth;
    authenticate(credentials: AuthCredentials): Promise<User>;
    authenticateWithToken(token: string): Promise<User>;
    private setToken;
    private scheduleTokenRefresh;
    refreshToken(): Promise<void>;
    private handleTokenExpiry;
    logout(): void;
    isAuthenticated(): boolean;
    getUser(): User | null;
    getToken(): string | null;
    getAxiosInstance(): AxiosInstance;
}
//# sourceMappingURL=AuthManager.d.ts.map