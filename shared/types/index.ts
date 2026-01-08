export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface JWTPayload {
    userId: string;
    userType: 'client' | 'driver' | 'both';
    phoneNumber: string;
    iat?: number;
    exp?: number;
}

export interface LocationCoords {
    latitude: number;
    longitude: number;
}

export interface RouteSearchParams {
    fromCity: string;
    toCity: string;
    date: string;
    timeFilter?: 'all' | 'morning' | 'afternoon' | 'evening';
    genderFilter?: 'all' | 'male' | 'female';
    vehicleType?: string;
    page?: number;
    limit?: number;
}

export interface WebSocketMessage {
    event: string;
    data: any;
    timestamp: string;
}

export const ErrorCodes = {
    // Authentication
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INVALID_OTP: 'INVALID_OTP',
    OTP_EXPIRED: 'OTP_EXPIRED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',

    // Users
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',

    // Booking
    BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
    INSUFFICIENT_SEATS: 'INSUFFICIENT_SEATS',
    ROUTE_NOT_AVAILABLE: 'ROUTE_NOT_AVAILABLE',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

    // Server
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR: 'DATABASE_ERROR',
} as const;
