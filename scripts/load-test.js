import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const responseTimeTrend = new Trend("response_time");
const successfulRequests = new Counter("successful_requests");
const failedRequests = new Counter("failed_requests");

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - verify basic functionality
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "1m",
      startTime: "0s",
    },
    // Load test - normal load
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 10 },
        { duration: "5m", target: 10 },
        { duration: "2m", target: 0 },
      ],
      startTime: "1m",
    },
    // Stress test - above normal load
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 20 },
        { duration: "5m", target: 20 },
        { duration: "2m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "2m", target: 0 },
      ],
      startTime: "10m",
    },
    // Spike test - sudden traffic spike
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "10s", target: 0 },
      ],
      startTime: "26m",
    },
    // Soak test - sustained load
    soak: {
      executor: "constant-vus",
      vus: 10,
      duration: "30m",
      startTime: "28m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95% under 500ms, 99% under 1s
    http_req_failed: ["rate<0.01"], // Less than 1% errors
    errors: ["rate<0.05"], // Less than 5% error rate
    checks: ["rate>0.95"], // 95% of checks pass
  },
};

const BASE_URL = __ENV.BASE_URL || "https://api.petswipe.com";
const API_KEY = __ENV.API_KEY || "";

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Test scenarios: smoke, load, stress, spike, soak`);
}

export default function () {
  const scenarios = [
    testHealthEndpoint,
    testGetPets,
    testSwipePet,
    testGetMatches,
    testUserProfile,
  ];

  // Randomly execute one of the scenarios
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    "health check status is 200": (r) => r.status === 200,
    "health check response time < 200ms": (r) => r.timings.duration < 200,
  });

  recordMetrics(res);
}

function testGetPets() {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const res = http.get(`${BASE_URL}/api/pets?limit=20`, { headers });

  check(res, {
    "get pets status is 200": (r) => r.status === 200,
    "get pets has data": (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.pets) && data.pets.length > 0;
      } catch (e) {
        return false;
      }
    },
    "get pets response time < 500ms": (r) => r.timings.duration < 500,
  });

  recordMetrics(res);
}

function testSwipePet() {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const payload = JSON.stringify({
    petId: `pet_${Math.floor(Math.random() * 1000)}`,
    direction: Math.random() > 0.5 ? "right" : "left",
  });

  const res = http.post(`${BASE_URL}/api/swipe`, payload, { headers });

  check(res, {
    "swipe status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "swipe response time < 300ms": (r) => r.timings.duration < 300,
  });

  recordMetrics(res);
}

function testGetMatches() {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const res = http.get(`${BASE_URL}/api/matches`, { headers });

  check(res, {
    "get matches status is 200": (r) => r.status === 200,
    "get matches has data": (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.matches);
      } catch (e) {
        return false;
      }
    },
    "get matches response time < 400ms": (r) => r.timings.duration < 400,
  });

  recordMetrics(res);
}

function testUserProfile() {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const res = http.get(`${BASE_URL}/api/user/profile`, { headers });

  check(res, {
    "user profile status is 200": (r) => r.status === 200,
    "user profile has data": (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.userId !== undefined;
      } catch (e) {
        return false;
      }
    },
    "user profile response time < 250ms": (r) => r.timings.duration < 250,
  });

  recordMetrics(res);
}

function recordMetrics(res) {
  const isError = res.status >= 400;

  errorRate.add(isError);
  responseTimeTrend.add(res.timings.duration);

  if (isError) {
    failedRequests.add(1);
  } else {
    successfulRequests.add(1);
  }
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "load-test-results.json": JSON.stringify(data),
    "load-test-report.html": htmlReport(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || "";
  const lines = [
    "",
    indent + "=".repeat(60),
    indent + "  Load Test Summary",
    indent + "=".repeat(60),
    "",
    indent + `Total Requests: ${data.metrics.http_reqs.values.count}`,
    indent + `Failed Requests: ${data.metrics.http_req_failed.values.passes}`,
    indent + `Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s`,
    "",
    indent + "Response Times:",
    indent + `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    indent + `  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms`,
    indent + `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms`,
    indent +
      `  P50: ${data.metrics.http_req_duration.values["p(50)"].toFixed(2)}ms`,
    indent +
      `  P95: ${data.metrics.http_req_duration.values["p(95)"].toFixed(2)}ms`,
    indent +
      `  P99: ${data.metrics.http_req_duration.values["p(99)"].toFixed(2)}ms`,
    "",
    indent + "=".repeat(60),
    "",
  ];

  return lines.join("\n");
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .metric { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Load Test Report</h1>
  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td class="metric">Total Requests</td><td>${data.metrics.http_reqs.values.count}</td></tr>
    <tr><td class="metric">Failed Requests</td><td>${data.metrics.http_req_failed.values.passes}</td></tr>
    <tr><td class="metric">Average Response Time</td><td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td></tr>
    <tr><td class="metric">P95 Response Time</td><td>${data.metrics.http_req_duration.values["p(95)"].toFixed(2)}ms</td></tr>
    <tr><td class="metric">P99 Response Time</td><td>${data.metrics.http_req_duration.values["p(99)"].toFixed(2)}ms</td></tr>
  </table>
</body>
</html>
  `;
}
