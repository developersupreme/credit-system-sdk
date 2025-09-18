export interface CreditSystemConfig {
    apiUrl: string;
    authMode?: 'jwt' | 'standalone';
    parentOrigin?: string;
    autoRefreshToken?: boolean;
    tokenRefreshBuffer?: number;
    onTokenExpired?: () => void;
    onBalanceUpdate?: (balance: number) => void;
    onError?: (error: CreditSystemError) => void;
}
export interface User {
    id: string | number;
    name: string;
    email: string;
}
export interface AuthCredentials {
    email: string;
    password: string;
}
export interface JWTToken {
    token: string;
    expiresAt: Date;
    user: User;
}
export interface Balance {
    balance: number;
    currency?: string;
    lastUpdated?: Date;
}
export interface Transaction {
    id: string | number;
    type: 'credit' | 'debit' | 'spend' | 'refund';
    amount: number;
    description?: string;
    createdAt: Date;
    status?: 'pending' | 'completed' | 'failed';
    metadata?: Record<string, any>;
}
export interface SpendRequest {
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}
export interface AddCreditsRequest {
    amount: number;
    description?: string;
    metadata?: Record<string, any>;
}
export interface TransactionHistoryParams {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    type?: Transaction['type'];
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    statusCode?: number;
}
export interface CreditSystemError extends Error {
    code: ErrorCode;
    statusCode?: number;
    details?: any;
}
export declare enum ErrorCode {
    AUTHENTICATION_FAILED = "AUTH_FAILED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
    INVALID_AMOUNT = "INVALID_AMOUNT",
    NETWORK_ERROR = "NETWORK_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    NOT_INITIALIZED = "NOT_INITIALIZED",
    INVALID_CONFIGURATION = "INVALID_CONFIG"
}
export interface IframeMessage {
    type: MessageType;
    data?: any;
    token?: string;
    expiresAt?: string;
    user?: User;
    balance?: number;
    error?: string;
    message?: string;
}
export declare enum MessageType {
    REQUEST_CREDENTIALS = "REQUEST_CREDENTIALS",
    JWT_TOKEN = "JWT_TOKEN",
    USER_CREDENTIALS = "USER_CREDENTIALS",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    BALANCE_UPDATE = "BALANCE_UPDATE",
    OPERATION_COMPLETE = "OPERATION_COMPLETE",
    ERROR = "ERROR",
    RESIZE_IFRAME = "RESIZE_IFRAME"
}
export interface EventHandlers {
    onAuthenticated?: (user: User) => void;
    onBalanceChanged?: (balance: number) => void;
    onTransactionComplete?: (transaction: Transaction) => void;
    onError?: (error: CreditSystemError) => void;
    onTokenRefreshed?: (token: JWTToken) => void;
    onSessionExpired?: () => void;
}
//# sourceMappingURL=index.d.ts.map