/**
 * Shared Utility Functions for Prime SMS Hub
 * Handles API calls, error management, and common DOM operations
 */

// ============================================================
// CONFIGURATION - Set Backend URL
// ============================================================
// The backend URL is hardcoded to the Render deployment
// This ensures HTTPS is used and CORS is configured correctly
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'

// Debug: Log the backend URL for troubleshooting
console.log('[Config] Backend URL:', BACKEND_URL)

// ============================================================
// API CALLER - Centralized fetch helper with enhanced error handling
// ============================================================
async function apiCall(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    showErrors = true,
  } = options;

  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    // Build full URL with proper backend
    let fullUrl = endpoint;
    if (typeof BACKEND_URL !== 'undefined' && BACKEND_URL && !endpoint.startsWith('http')) {
      // Ensure endpoint starts with /api if not already
      const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      // Remove trailing slash from BACKEND_URL if present
      const baseUrl = BACKEND_URL.replace(/\/$/, '')
      fullUrl = `${baseUrl}${apiEndpoint}`;
    } else if (!endpoint.startsWith('http')) {
      // Local development fallback - prepend /api if not present
      fullUrl = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    }

    console.log(`[API] ${method} ${fullUrl}`)

    const response = await fetch(fullUrl, config);
    
    // Try to parse JSON response
    let data = {};
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: response.statusText };
    }

    // Handle authentication errors
    if (response.status === 401) {
      console.error('[API] Unauthorized - redirecting to login')
      if (showErrors) {
        showError('Session expired. Please login again.');
      }
      setTimeout(() => {
        window.location.href = 'login.html'
      }, 1000)
      return null;
    }

    // Handle client errors (4xx)
    if (response.status >= 400 && response.status < 500) {
      const errorMsg = data.message || data.error || `Error: ${response.statusText}`;
      console.error(`[API] Client Error (${response.status}):`, errorMsg)
      if (showErrors) {
        showError(errorMsg);
      }
      return null;
    }

    // Handle server errors (5xx)
    if (response.status >= 500) {
      const errorMsg = data.message || `Server Error: ${response.statusText}`;
      console.error(`[API] Server Error (${response.status}):`, errorMsg)
      if (showErrors) {
        showError('Server error. Please try again later.');
      }
      return null;
    }

    // Handle success
    if (!response.ok) {
      if (showErrors) {
        showError(data.message || `Error: ${response.statusText}`);
      }
      return null;
    }

    return data;

  } catch (error) {
    console.error('[API] Network Error:', error);
    if (showErrors) {
      // Check if it's a network error or CORS error
      if (error.message.includes('Failed to fetch')) {
        showError('Network error: Cannot reach the server. Check your internet connection and backend URL.');
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        showError('CORS error: Backend server may not allow requests from this origin.');
      } else {
        showError(`Error: ${error.message || 'Unknown error'}. Please try again.`);
      }
    }
    return null;
  }
}

// ============================================================
// UI HELPERS
// ============================================================

/**
 * Show loading spinner/indicator
 */
function showLoading(container, message = 'Loading...') {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Show error message to user
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-alert';
  errorDiv.innerHTML = `
    <div class="error-content">
      <span class="error-icon">❌</span>
      <p>${message}</p>
      <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>
  `;
  document.body.insertBefore(errorDiv, document.body.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 5000);
}

/**
 * Show success message to user
 */
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-alert';
  successDiv.innerHTML = `
    <div class="success-content">
      <span class="success-icon">✅</span>
      <p>${message}</p>
    </div>
  `;
  document.body.insertBefore(successDiv, document.body.firstChild);
  
  setTimeout(() => {
    if (successDiv.parentElement) {
      successDiv.remove();
    }
  }, 4000);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

/**
 * Format date to readable format
 */
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date.toDate ? date.toDate() : date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Disable button and show loading text
 */
function setButtonLoading(button, isLoading = true) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerText;
    button.innerText = '⏳ Processing...';
  } else {
    button.disabled = false;
    button.innerText = button.dataset.originalText || 'Submit';
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showSuccess('Copied to clipboard!');
  }).catch(() => {
    showError('Failed to copy');
  });
}

/**
 * Check if user is authenticated (basic check)
 */
async function checkAuth() {
  const response = await fetch('/api/auth/check', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    window.location.href = 'login.html';
    return false;
  }
  
  return true;
}

// ============================================================
// CSS STYLES FOR ALERTS AND LOADING
// ============================================================
if (!document.getElementById('utils-styles')) {
  const style = document.createElement('style');
  style.id = 'utils-styles';
  style.innerHTML = `
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #0066ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-alert, .success-alert {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(500px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .error-alert {
      background: #fee2e2;
      border: 1px solid #fecaca;
    }

    .success-alert {
      background: #dcfce7;
      border: 1px solid #bbf7d0;
    }

    .error-content, .success-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .error-icon, .success-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .error-content p {
      margin: 0;
      color: #991b1b;
      font-size: 14px;
      flex: 1;
    }

    .success-content p {
      margin: 0;
      color: #166534;
      font-size: 14px;
      flex: 1;
    }

    .error-content button {
      background: #dc2626;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .error-content button:hover {
      background: #b91c1c;
    }

    @media (max-width: 480px) {
      .error-alert, .success-alert {
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);
}
