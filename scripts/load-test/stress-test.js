import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Stress test configuration - rapid spike to trigger auto-scaling
export const options = {
    stages: [
        { duration: '30s', target: 5000 },  // Spike to 5000 users in 30 seconds
        { duration: '5m', target: 5000 },   // Hold at 5000 users for 5 minutes
        { duration: '30s', target: 0 },     // Drop to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // Allow up to 2s during scaling
        http_req_failed: ['rate<0.1'], // Allow up to 10% failures during scale-up
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:80';

export default function () {
    // Stress test with health checks to observe auto-scaling
    let res = http.get(`${BASE_URL}/api/v1/health`);

    check(res, {
        'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    });

    responseTime.add(res.timings.duration);
    errorRate.add(res.status >= 400);

    sleep(0.5); // Shorter sleep for higher load
}

export function handleSummary(data) {
    console.log('\n========================================');
    console.log('STRESS TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
    console.log(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`);
    console.log(`\nResponse Times:`);
    console.log(`  P50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms`);
    console.log(`  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    console.log(`  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
    console.log(`\nError Rate: ${((data.metrics.errors?.values.rate || 0) * 100).toFixed(2)}%`);
    console.log('========================================\n');

    return {
        'stress-test-summary.json': JSON.stringify(data, null, 2),
    };
}
