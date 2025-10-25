// The base URL of your FastAPI backend
const API_URL = "http://127.0.0.1:8000";

// A helper function to handle API requests and errors
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem("token");
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
        const errorData = await response.json();
        if (errorData.detail && Array.isArray(errorData.detail)) {
            const firstError = errorData.detail[0];
            errorMessage = `${firstError.msg} in ${firstError.loc.join(' -> ')}`;
        }
        else if (errorData.detail) {
            errorMessage = errorData.detail;
        }
    } catch (e) {
        // No JSON body
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// --- API Functions ---

export function getSummary() {
  return apiRequest('/dashboard/summary');
}
export function getMarketSkills() {
  return apiRequest('/skills/market');
}
export function getMySkills() {
    return apiRequest('/skills/mine');
}
export function addSkill(skillData) {
  return apiRequest('/skills', 'POST', skillData);
}
export function deleteSkill(skillId) {
    return apiRequest(`/skills/${skillId}`, 'DELETE');
}
export function requestExchange(skillId, message) {
  return apiRequest('/requests', 'POST', { skill_id: skillId, message });
}
export function respondToRequest(requestId, action) {
  return apiRequest(`/requests/${requestId}/respond`, 'PUT', { action });
}
export function getSentRequests() {
  return apiRequest('/requests/sent');
}

// ✅ THIS FUNCTION WAS MISSING
export function getChatHistory(requestId) {
  return apiRequest(`/chat/${requestId}`);
}

export function getChatConnections() {
  return apiRequest('/chats/connections');
}