export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTHENTICATION_FAILED"] = "AUTH_FAILED";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["INSUFFICIENT_CREDITS"] = "INSUFFICIENT_CREDITS";
    ErrorCode["INVALID_AMOUNT"] = "INVALID_AMOUNT";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    ErrorCode["NOT_INITIALIZED"] = "NOT_INITIALIZED";
    ErrorCode["INVALID_CONFIGURATION"] = "INVALID_CONFIG";
})(ErrorCode || (ErrorCode = {}));
export var MessageType;
(function (MessageType) {
    MessageType["REQUEST_CREDENTIALS"] = "REQUEST_CREDENTIALS";
    MessageType["JWT_TOKEN"] = "JWT_TOKEN";
    MessageType["USER_CREDENTIALS"] = "USER_CREDENTIALS";
    MessageType["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    MessageType["BALANCE_UPDATE"] = "BALANCE_UPDATE";
    MessageType["OPERATION_COMPLETE"] = "OPERATION_COMPLETE";
    MessageType["ERROR"] = "ERROR";
    MessageType["RESIZE_IFRAME"] = "RESIZE_IFRAME";
})(MessageType || (MessageType = {}));
//# sourceMappingURL=index.js.map