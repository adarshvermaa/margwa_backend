import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseInitialized = false;

export function initializeFirebase() {
    if (firebaseInitialized) {
        return;
    }

    try {
        // Initialize Firebase Admin SDK
        // In production, use service account JSON file
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else if (process.env.FIREBASE_PROJECT_ID) {
            // For development, use application default credentials
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
        } else {
            logger.warn('Firebase credentials not configured. Push notifications will not work.');
            return;
        }

        firebaseInitialized = true;
        logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
}

export async function sendPushNotification(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<boolean> {
    if (!firebaseInitialized) {
        logger.warn('Firebase not initialized. Cannot send push notification.');
        return false;
    }

    try {
        const message: admin.messaging.Message = {
            token: deviceToken,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'margwa_notifications',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        logger.info('Push notification sent successfully', { messageId: response });
        return true;
    } catch (error) {
        logger.error('Failed to send push notification:', error);
        return false;
    }
}

export async function sendMulticastNotification(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<number> {
    if (!firebaseInitialized || deviceTokens.length === 0) {
        return 0;
    }

    try {
        const message: admin.messaging.MulticastMessage = {
            tokens: deviceTokens,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'margwa_notifications',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        logger.info('Multicast notification sent', {
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
        return response.successCount;
    } catch (error) {
        logger.error('Failed to send multicast notification:', error);
        return 0;
    }
}
