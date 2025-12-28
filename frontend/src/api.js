const API_URL = process.env.REACT_APP_API_URL;

async function safeFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export function getHealthSummary() {
  return safeFetch(`${API_URL}/api/health/summary`);
}

export function getHealthMetrics() {
  return safeFetch(`${API_URL}/api/health/metrics`);
}
