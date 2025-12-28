const API_URL = process.env.REACT_APP_API_URL;

export async function getHealthSummary() {
  const res = await fetch(`${API_URL}/health/summary`);
  return res.json();
}

export async function getHealthMetrics() {
  const res = await fetch(`${API_URL}/health/metrics`);
  return res.json();
}
