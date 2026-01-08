import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
    stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users over 2 minutes
        { duration: '3m', target: 500 },   // Ramp up to 500 users over 3 minutes
        { duration: '5m', target: 1000 },  // Ramp up to 1000 users over 5 minutes
        { duration: '10m', target: 1000 }, // Stay at 1000 users for 10 minutes
        { duration: '2m', target: 0 },     // Ramp down to 0 users over 2 minutes
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms, 99% below 1s
        http_req_failed: ['rate<0.01'], // Error rate must be less than 1%
        errors: ['rate<0.05'], // Custom error rate must be less than 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:80';

// Test data
const users = [
    { phone: '+1234567890', role: 'client' },
    { phone: '+1234567891', role: 'driver' },
];

export default function () {
    // Test 1: Health check
    let healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health check status is 200': (r) => r.status === 200,
    });

    // Test 2: API Gateway health
    let apiHealthRes = http.get(`${BASE_URL}/api/v1/health`);
    check(apiHealthRes, {
        'api health status is 200': (r) => r.status === 200,
    });

    responseTime.add(apiHealthRes.timings.duration);
    requestCount.add(1);
    errorRate.add(apiHealthRes.status >= 400);

    sleep(1);

    // Test 3: Send OTP (Auth Service)
    const user = users[Math.floor(Math.random() * users.length)];
    const otpPayload = JSON.stringify({
        phone: user.phone,
        role: user.role,
    });

    const otpHeaders = {
        'Content-Type': 'application/json',
    };

    let otpRes = http.post(`${BASE_URL}/api/v1/auth/send-otp`, otpPayload, {
        headers: otpHeaders,
    });

    check(otpRes, {
        'send OTP status is 200': (r) => r.status === 200,
        'send OTP response has data': (r) => r.json('data') !== null,
    });

    responseTime.add(otpRes.timings.duration);
    requestCount.add(1);
    errorRate.add(otpRes.status >= 400);

    sleep(1);

    // Test 4: Search routes (Route Service)
    const searchPayload = JSON.stringify({
        origin: {
            lat: 40.7128,
            lng: -74.0060,
            address: 'New York, NY',
        },
        destination: {
            lat: 40.7580,
            lng: -73.9855,
            address: 'Times Square, NY',
        },
        departureTime: new Date(Date.now() + 3600000).toISOString(),
        passengers: 2,
    });

    let searchRes = http.post(`${BASE_URL}/api/v1/routes/search`, searchPayload, {
        headers: otpHeaders,
    });

    check(searchRes, {
        'search routes status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });

    responseTime.add(searchRes.timings.duration);
    requestCount.add(1);
    errorRate.add(searchRes.status >= 500); // Only count 5xx as errors

    sleep(2);

    // Test 5: Get profile (if authenticated)
    // This will likely fail without proper auth, but tests the endpoint
    let profileRes = http.get(`${BASE_URL}/api/v1/auth/profile`);

    check(profileRes, {
        'profile status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });

    responseTime.add(profileRes.timings.duration);
    requestCount.add(1);
    errorRate.add(profileRes.status >= 500);

    sleep(1);
}

export function handleSummary(data) {
    return {
        'load-test-summary.json': JSON.stringify(data, null, 2),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
}

function textSummary(data, options) {
    const indent = options.indent || '';
    const enableColors = options.enableColors !== false;

    let summary = `
${indent}Test Summary
${indent}============
${indent}
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}
${indent}Response Times:
${indent}  - Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  - P50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
${indent}  - P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  - P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  - Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
${indent}
${indent}Errors:
${indent}  - Failed Requests: ${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%
${indent}  - Error Rate: ${((data.metrics.errors?.values.rate || 0) * 100).toFixed(2)}%
${indent}
${indent}Thresholds:
`;

    for (const [name, threshold] of Object.entries(data.metrics)) {
        if (threshold.thresholds) {
            for (const [thresholdName, thresholdValue] of Object.entries(threshold.thresholds)) {
                const passed = thresholdValue.ok ? '✓' : '✗';
                summary += `${indent}  ${passed} ${name}: ${thresholdName}\n`;
            }
        }
    }

    return summary;
}
