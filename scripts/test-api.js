#!/usr/bin/env node

/**
 * Quick Test Script for Margwa Backend API
 * 
 * This script tests the basic functionality of all services
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

async function testEndpoint(name, method, url, data = null) {
    try {
        let response;
        if (method === 'GET') {
            response = await axios.get(url);
        } else {
            response = await axios.post(url, data);
        }
        console.log(`${colors.green}✓${colors.reset} ${name}: ${response.status}`);
        return { success: true, data: response.data };
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${name}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Margwa Backend API Test Suite${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

    const results = {
        passed: 0,
        failed: 0
    };

    // Test 1: API Gateway Health
    console.log(`${colors.yellow}Testing API Gateway...${colors.reset}`);
    const gateway = await testEndpoint('Gateway Health', 'GET', 'http://localhost:3000/health');
    gateway.success ? results.passed++ : results.failed++;

    // Test 2: Route Service Health
    console.log(`\n${colors.yellow}Testing Route Service...${colors.reset}`);
    const routeHealth = await testEndpoint('Route Service Health', 'GET', 'http://localhost:3002/health');
    routeHealth.success ? results.passed++ : results.failed++;

    // Test 3: Real-time Service Health
    console.log(`\n${colors.yellow}Testing Real-time Service...${colors.reset}`);
    const realtimeHealth = await testEndpoint('Real-time Service Health', 'GET', 'http://localhost:3004/health');
    realtimeHealth.success ? results.passed++ : results.failed++;

    // Test 4: Chat Service Health
    console.log(`\n${colors.yellow}Testing Chat Service...${colors.reset}`);
    const chatHealth = await testEndpoint('Chat Service Health', 'GET', 'http://localhost:3005/health');
    chatHealth.success ? results.passed++ : results.failed++;

    // Test 5: Notification Service Health
    console.log(`\n${colors.yellow}Testing Notification Service...${colors.reset}`);
    const notificationHealth = await testEndpoint('Notification Service Health', 'GET', 'http://localhost:3006/health');
    notificationHealth.success ? results.passed++ : results.failed++;

    // Test 6: Payment Service Health
    console.log(`\n${colors.yellow}Testing Payment Service...${colors.reset}`);
    const paymentHealth = await testEndpoint('Payment Service Health', 'GET', 'http://localhost:3007/health');
    paymentHealth.success ? results.passed++ : results.failed++;

    // Test 7: Analytics Service Health
    console.log(`\n${colors.yellow}Testing Analytics Service...${colors.reset}`);
    const analyticsHealth = await testEndpoint('Analytics Service Health', 'GET', 'http://localhost:3008/health');
    analyticsHealth.success ? results.passed++ : results.failed++;

    // Test 8: Route Search (Public endpoint - no auth required)
    console.log(`\n${colors.yellow}Testing Route Search...${colors.reset}`); const search = await testEndpoint('Search Routes', 'POST', `${API_BASE}/routes/search`, {
        fromCity: 'Indore',
        toCity: 'Bhopal',
        page: 1,
        limit: 10
    });
    if (search.success) {
        results.passed++;
        if (search.data.success) {
            console.log(`  ${colors.green}→${colors.reset} Found ${search.data.data.pagination.total} routes`);
        }
    } else {
        results.failed++;
    }

    // Test 9: Popular Routes
    console.log(`\n${colors.yellow}Testing Popular Routes...${colors.reset}`); const popular = await testEndpoint('Get Popular Routes', 'GET', `${API_BASE}/routes/popular`);
    if (popular.success) {
        results.passed++;
        if (popular.data.success) {
            console.log(`  ${colors.green}→${colors.reset} Found ${popular.data.data.length} popular routes`);
        }
    } else {
        results.failed++;
    }

    // Summary
    console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Test Results${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
    console.log(`  ${colors.green}Passed:${colors.reset} ${results.passed}`);
    console.log(`  ${colors.red}Failed:${colors.reset} ${results.failed}`);
    console.log(`  ${colors.yellow}Total:${colors.reset}  ${results.passed + results.failed}\n`);

    if (results.failed === 0) {
        console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
    } else {
        console.log(`${colors.red}⚠️  Some tests failed. Check service logs.${colors.reset}\n`);
    }
}

// Run tests
console.log('Starting tests in 2 seconds...');
setTimeout(runTests, 2000);
