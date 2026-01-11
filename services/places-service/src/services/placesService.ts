import { Client, PlaceAutocompleteType, AddressType } from '@googlemaps/google-maps-services-js';
import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

interface PlaceAutocompleteResult {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

interface PlaceDetails {
    placeId: string;
    name: string;
    address: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
}

class PlacesService {
    private googleMapsClient: Client;
    private redisClient: RedisClientType | null = null;
    private apiKey: string;
    private readonly CACHE_TTL = 86400; // 24 hours

    constructor() {
        this.googleMapsClient = new Client({});
        this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';

        if (!this.apiKey) {
            logger.warn('GOOGLE_PLACES_API_KEY not set');
        }
    }

    async initialize() {
        try {
            this.redisClient = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });

            this.redisClient.on('error', (err) => logger.error('Redis Client Error', err));
            await this.redisClient.connect();
            logger.info('Redis connected for Places Service');
        } catch (error) {
            logger.error('Redis connection failed', error);
            // Continue without caching
        }
    }

    async autocomplete(query: string, sessionToken?: string): Promise<PlaceAutocompleteResult[]> {
        if (!query || query.length < 2) {
            return [];
        }

        // Try cache first
        const cacheKey = `autocomplete:${query.toLowerCase()}`;
        if (this.redisClient) {
            try {
                const cached = await this.redisClient.get(cacheKey);
                if (cached) {
                    logger.debug(`Cache hit for autocomplete: ${query}`);
                    return JSON.parse(cached);
                }
            } catch (error) {
                logger.error('Cache read error', error);
            }
        }

        try {
            const response = await this.googleMapsClient.placeAutocomplete({
                params: {
                    input: query,
                    key: this.apiKey,
                    sessiontoken: sessionToken,
                    components: ['country:in'], // Limit to India
                    language: 'en',
                },
            });

            const predictions = response.data.predictions.map(prediction => ({
                placeId: prediction.place_id,
                description: prediction.description,
                mainText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text || '',
            }));

            // Cache the results
            if (this.redisClient) {
                try {
                    await this.redisClient.setEx(
                        cacheKey,
                        this.CACHE_TTL,
                        JSON.stringify(predictions)
                    );
                } catch (error) {
                    logger.error('Cache write error', error);
                }
            }

            return predictions;
        } catch (error: any) {
            // Log the actual error details for debugging
            if (error.response) {
                logger.error('Google Places autocomplete API error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                });
            } else {
                logger.error('Google Places autocomplete error:', error.message);
            }
            throw new Error(`Failed to fetch autocomplete results: ${error.response?.data?.error_message || error.message || 'Unknown error'}`);
        }
    }

    async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
        if (!placeId) {
            throw new Error('Place ID is required');
        }

        // Try cache first
        const cacheKey = `place:${placeId}`;
        if (this.redisClient) {
            try {
                const cached = await this.redisClient.get(cacheKey);
                if (cached) {
                    logger.debug(`Cache hit for place details: ${placeId}`);
                    return JSON.parse(cached);
                }
            } catch (error) {
                logger.error('Cache read error', error);
            }
        }

        try {
            const response = await this.googleMapsClient.placeDetails({
                params: {
                    place_id: placeId,
                    key: this.apiKey,
                    fields: ['name', 'formatted_address', 'geometry'],
                },
            });

            const result = response.data.result;
            const placeDetails: PlaceDetails = {
                placeId,
                name: result.name || '',
                address: result.formatted_address || '',
                coordinates: {
                    latitude: result.geometry?.location.lat || 0,
                    longitude: result.geometry?.location.lng || 0,
                },
            };

            // Cache the results
            if (this.redisClient) {
                try {
                    await this.redisClient.setEx(
                        cacheKey,
                        this.CACHE_TTL,
                        JSON.stringify(placeDetails)
                    );
                } catch (error) {
                    logger.error('Cache write error', error);
                }
            }

            return placeDetails;
        } catch (error: any) {
            logger.error('Google Places details error', error);
            throw new Error('Failed to fetch place details');
        }
    }

    async reverseGeocode(latitude: number, longitude: number): Promise<string> {
        if (!latitude || !longitude) {
            throw new Error('Latitude and longitude are required');
        }

        // Try cache first
        const cacheKey = `geocode:${latitude},${longitude}`;
        if (this.redisClient) {
            try {
                const cached = await this.redisClient.get(cacheKey);
                if (cached) {
                    logger.debug(`Cache hit for geocode: ${latitude},${longitude}`);
                    return cached;
                }
            } catch (error) {
                logger.error('Cache read error', error);
            }
        }

        try {
            const response = await this.googleMapsClient.reverseGeocode({
                params: {
                    latlng: { lat: latitude, lng: longitude },
                    key: this.apiKey,
                },
            });

            const address = response.data.results[0]?.formatted_address || '';

            // Cache the results
            if (this.redisClient) {
                try {
                    await this.redisClient.setEx(cacheKey, this.CACHE_TTL, address);
                } catch (error) {
                    logger.error('Cache write error', error);
                }
            }

            return address;
        } catch (error: any) {
            logger.error('Google geocode error', error);
            throw new Error('Failed to reverse geocode');
        }
    }

    async disconnect() {
        if (this.redisClient) {
            await this.redisClient.disconnect();
        }
    }
}

export default PlacesService;
