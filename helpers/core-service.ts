export const BASE_URL: string = 'https://bustling-back.onrender.com';

export class ServiceType<T = any> {
    success: boolean;
    message: string;
    data: T | null;

    constructor(
        success: boolean = false,
        message: string = '',
        data: T | null = null
    ) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static fromApi<T = any>(obj: any = {}): ServiceType<T> {
        return new ServiceType<T>(
            obj.success ?? false,
            obj.message ?? '',
            obj.data ?? null
        );
    }
}

export class CoreService {
    BASE_URL: string;

    constructor() {
        this.BASE_URL = BASE_URL;
    }

    setBaseUrl(url: string): void {
        this.BASE_URL = url;
    }

    async send<T = any>(endpoint: string, payload: any = {}): Promise<ServiceType<T>> {
        try {
            const res = await fetch(`${this.BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            return ServiceType.fromApi<T>(result);
        } catch (e: any) {
            return new ServiceType<T>(
                false,
                e.message || 'Something went wrong',
                null
            );
        }
    }
    async put<T = any>(endpoint: string, payload: any = {}): Promise<ServiceType<T>> {
        try {
            const res = await fetch(`${this.BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            return ServiceType.fromApi<T>(result);
        } catch (e: any) {
            return new ServiceType<T>(
                false,
                e.message || 'Something went wrong',
                null
            );
        }
    }

    async get<T = any>(endpoint: string): Promise<ServiceType<T>> {
        try {
            const res = await fetch(`${this.BASE_URL}${endpoint}`);
            const result = await res.json();
            return ServiceType.fromApi<T>(result);
        } catch (e: any) {
            return new ServiceType<T>(
                false,
                e.message || 'Something went wrong',
                null
            );
        }
    }
}