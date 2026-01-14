import * as dotenv from 'dotenv';
dotenv.config();

import { getDatabase } from '../shared/database/src/index';
import {
    users,
    driverProfiles,
    vehicles,
    routes,
    routeInstances
} from '../shared/database/src/schema';

const db = getDatabase();

async function seed() {
    console.log('🌱 Starting database seeding...');

    try {
        // Create sample users
        console.log('Creating users...');

        const [driver1] = await db.insert(users).values({
            phoneNumber: '+919876543210',
            phoneCountryCode: '+91',
            fullName: 'Rajesh Kumar',
            email: 'rajesh.kumar@example.com',
            userType: 'driver',
            isVerified: true,
            languagePreference: 'hi',
        }).returning();

        const [driver2] = await db.insert(users).values({
            phoneNumber: '+919876543211',
            phoneCountryCode: '+91',
            fullName: 'Amit Sharma',
            email: 'amit.sharma@example.com',
            userType: 'driver',
            isVerified: true,
            languagePreference: 'en',
        }).returning();

        const [client1] = await db.insert(users).values({
            phoneNumber: '+919876543212',
            phoneCountryCode: '+91',
            fullName: 'Priya Singh',
            email: 'priya.singh@example.com',
            userType: 'client',
            isVerified: true,
            languagePreference: 'hi',
        }).returning();

        const [client2] = await db.insert(users).values({
            phoneNumber: '+919876543213',
            phoneCountryCode: '+91',
            fullName: 'Rahul Patel',
            email: 'rahul.patel@example.com',
            userType: 'client',
            isVerified: true,
            languagePreference: 'en',
        }).returning();

        console.log('✅ Created 4 users (2 drivers, 2 clients)');

        // Create driver profiles
        console.log('Creating driver profiles...');

        const [driverProfile1] = await db.insert(driverProfiles).values({
            userId: driver1.id,
            licenseNumber: 'DL1234567890',
            licenseExpiry: '2028-12-31',
            backgroundCheckStatus: 'approved',
            totalTrips: 156,
            totalEarnings: '45600.00',
            averageRating: '4.8',
            isOnline: true,
            currentLatitude: '22.7196',
            currentLongitude: '75.8577',
        }).returning();

        const [driverProfile2] = await db.insert(driverProfiles).values({
            userId: driver2.id,
            licenseNumber: 'DL0987654321',
            licenseExpiry: '2027-06-30',
            backgroundCheckStatus: 'approved',
            totalTrips: 203,
            totalEarnings: '58900.00',
            averageRating: '4.9',
            isOnline: true,
            currentLatitude: '23.2599',
            currentLongitude: '77.4126',
        }).returning();

        console.log('✅ Created 2 driver profiles');

        // Create vehicles
        console.log('Creating vehicles...');

        const [vehicle1] = await db.insert(vehicles).values({
            driverId: driverProfile1.id,
            vehicleName: 'Toyota Innova Crysta',
            vehicleType: 'suv',
            vehicleNumber: 'MP09AB1234',
            vehicleColor: 'White',
            manufacturingYear: 2022,
            totalSeats: 7,
            rcNumber: 'RC1234567890',
            insuranceNumber: 'INS1234567890',
            insuranceExpiry: '2025-12-31',
            verificationStatus: 'verified',
            isActive: true,
        }).returning();

        const [vehicle2] = await db.insert(vehicles).values({
            driverId: driverProfile2.id,
            vehicleName: 'Maruti Ertiga',
            vehicleType: 'van',
            vehicleNumber: 'MP09CD5678',
            vehicleColor: 'Silver',
            manufacturingYear: 2021,
            totalSeats: 7,
            rcNumber: 'RC0987654321',
            insuranceNumber: 'INS0987654321',
            insuranceExpiry: '2025-06-30',
            verificationStatus: 'verified',
            isActive: true,
        }).returning();

        const [vehicle3] = await db.insert(vehicles).values({
            driverId: driverProfile1.id,
            vehicleName: 'Honda City',
            vehicleType: 'sedan',
            vehicleNumber: 'MP09EF9012',
            vehicleColor: 'Black',
            manufacturingYear: 2023,
            totalSeats: 4,
            rcNumber: 'RC1122334455',
            insuranceNumber: 'INS1122334455',
            insuranceExpiry: '2026-03-31',
            verificationStatus: 'verified',
            isActive: true,
        }).returning();

        console.log('✅ Created 3 vehicles');

        // Create routes
        console.log('Creating routes...');

        const route1 = await db.insert(routes).values({
            driverId: driverProfile1.id,
            vehicleId: vehicle1.id,
            fromCity: 'Indore',
            fromLatitude: '22.7196',
            fromLongitude: '75.8577',
            toCity: 'Bhopal',
            toLatitude: '23.2599',
            toLongitude: '77.4126',
            departureTime: '09:00:00',
            arrivalTime: '12:00:00',
            estimatedDurationMinutes: 180,
            distanceKm: '195',
            basePricePerSeat: '450',
            totalSeats: 6,
            genderPreference: 'any',
            pickupRadiusKm: 5,
            dropRadiusKm: 5,
            amenities: ['AC', 'WiFi', 'Music'],
            isActive: true,
            recurringDays: [1, 3, 5], // Monday, Wednesday, Friday
        }).returning();

        const route2 = await db.insert(routes).values({
            driverId: driverProfile2.id,
            vehicleId: vehicle2.id,
            fromCity: 'Bhopal',
            fromLatitude: '23.2599',
            fromLongitude: '77.4126',
            toCity: 'Indore',
            toLatitude: '22.7196',
            toLongitude: '75.8577',
            departureTime: '15:00:00',
            arrivalTime: '18:00:00',
            estimatedDurationMinutes: 180,
            distanceKm: '195',
            basePricePerSeat: '400',
            totalSeats: 6,
            genderPreference: 'any',
            pickupRadiusKm: 5,
            dropRadiusKm: 5,
            amenities: ['AC', 'Music'],
            isActive: true,
            recurringDays: [1, 2, 3, 4, 5], // Weekdays
        }).returning();

        const route3 = await db.insert(routes).values({
            driverId: driverProfile1.id,
            vehicleId: vehicle3.id,
            fromCity: 'Indore',
            fromLatitude: '22.7196',
            fromLongitude: '75.8577',
            toCity: 'Ujjain',
            toLatitude: '23.1765',
            toLongitude: '75.7885',
            departureTime: '07:00:00',
            arrivalTime: '08:30:00',
            estimatedDurationMinutes: 90,
            distanceKm: '55',
            basePricePerSeat: '200',
            totalSeats: 3,
            genderPreference: 'any',
            pickupRadiusKm: 3,
            dropRadiusKm: 3,
            amenities: ['AC'],
            isActive: true,
            recurringDays: [0, 6], // Weekend
        }).returning();

        console.log('✅ Created 3 routes');

        // Create route instances for today and tomorrow
        console.log('Creating route instances...');

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        await db.insert(routeInstances).values({
            routeId: route1[0].id,
            driverId: driverProfile1.id,
            vehicleId: vehicle1.id,
            scheduledDate: today.toISOString()?.split('T')[0],
            departureTime: new Date(`${today.toISOString()?.split('T')[0]}T09:00:00`),
            seatsAvailable: 6,
            status: 'scheduled',
        });

        await db.insert(routeInstances).values({
            routeId: route2[0].id,
            driverId: driverProfile2.id,
            vehicleId: vehicle2.id,
            scheduledDate: today.toISOString()?.split('T')[0],
            departureTime: new Date(`${today.toISOString()?.split('T')[0]}T15:00:00`),
            seatsAvailable: 6,
            status: 'scheduled',
        });

        await db.insert(routeInstances).values({
            routeId: route1[0].id,
            driverId: driverProfile1.id,
            vehicleId: vehicle1.id,
            scheduledDate: tomorrow.toISOString()?.split('T')[0],
            departureTime: new Date(`${tomorrow.toISOString()?.split('T')[0]}T09:00:00`),
            seatsAvailable: 6,
            status: 'scheduled',
        });

        console.log('✅ Created 3 route instances');

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  - Users: 4 (2 drivers, 2 clients)');
        console.log('  - Driver Profiles: 2');
        console.log('  - Vehicles: 3');
        console.log('  - Routes: 3');
        console.log('  - Route Instances: 3');
        console.log('\n💡 You can now test the API with these accounts:');
        console.log('  Driver 1: +919876543210 (Rajesh Kumar)');
        console.log('  Driver 2: +919876543211 (Amit Sharma)');
        console.log('  Client 1: +919876543212 (Priya Singh)');
        console.log('  Client 2: +919876543213 (Rahul Patel)');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }

    process.exit(0);
}

seed();
