# Prime SMS Hub - Frontend JavaScript Setup Guide

This guide documents the production-ready JavaScript logic for Prime SMS Hub frontend pages.

## 📁 File Structure

```
js/
├── utils.js              # Shared utilities and API helper
├── buy-number.js         # Buy Numbers page logic
├── usa-numbers.js        # USA Numbers page logic
├── dashboard.js          # Dashboard page logic
└── transactions.js       # Transactions page logic

css/
└── pages.css            # Styling for all pages
```

## 🚀 Quick Start

### 1. Add Script & Style References to HTML Pages

#### buy-numbers.html
```html
<head>
    <link rel="stylesheet" href="css/pages.css">
</head>
<body>
    <!-- Your HTML content -->
    
    <script src="js/utils.js"></script>
    <script src="js/buy-number.js"></script>
</body>
```

#### usa-numbers.html
```html
<head>
    <link rel="stylesheet" href="css/pages.css">
</head>
<body>
    <!-- Your HTML content -->
    
    <script src="js/utils.js"></script>
    <script src="js/usa-numbers.js"></script>
</body>
```

#### dashboard.html
```html
<head>
    <link rel="stylesheet" href="css/pages.css">
</head>
<body>
    <!-- Your HTML content -->
    
    <script src="js/utils.js"></script>
    <script src="js/dashboard.js"></script>
</body>
```

#### transactions.html
```html
<head>
    <link rel="stylesheet" href="css/pages.css">
</head>
<body>
    <!-- Your HTML content -->
    
    <script src="js/utils.js"></script>
    <script src="js/transactions.js"></script>
</body>
```

## 📋 HTML Structure Requirements

### buy-numbers.html

```html
<div id="walletDisplay">
    <p id="wallet">Wallet: Loading...</p>
</div>

<form id="buyForm">
    <select id="country" required></select>
    <select id="service" required></select>
    <p>Price: <span id="price">-</span></p>
    <button type="submit">Buy Number</button>
</form>

<div id="resultContainer"></div>
```

### usa-numbers.html

```html
<div id="countryInfo"></div>

<div id="walletDisplay">
    <p id="wallet">Wallet: Loading...</p>
</div>

<form id="buyForm">
    <select id="service" required></select>
    <p>Price: <span id="price">-</span></p>
    <button type="submit">Buy USA Number</button>
</form>

<div id="resultContainer"></div>
```

### dashboard.html

```html
<div id="walletDisplay"></div>
<button id="refreshBtn">Refresh</button>

<div id="activeNumbers"></div>

<div id="recentTransactions"></div>
```

### transactions.html

```html
<div id="transactionsContainer"></div>
<button id="exportBtn">Export CSV</button>

<!-- Optional: Filter buttons -->
<div class="filter-buttons">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="completed">Completed</button>
    <button class="filter-btn" data-filter="pending">Pending</button>
    <button class="filter-btn" data-filter="failed">Failed</button>
</div>
```

## 🔌 API Endpoints

All requests go through the backend. Never expose API keys client-side.

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | GET | Get dashboard data (wallet, numbers, transactions) |
| `/api/number/buy` | POST | Purchase a virtual number |
| `/api/transactions` | GET | Get transaction history |
| `/api/auth/check` | GET | Check if user is authenticated |

### Request/Response Examples

#### POST /api/number/buy
```javascript
// Request
{
  "country": "USA",
  "service": "google"
}

// Response
{
  "success": true,
  "phone_number": "+1-234-567-8900",
  "order_id": "ORD-12345678",
  "service": "google",
  "expires_at": "2024-03-12T10:30:00Z",
  "status": "Active"
}
```

#### GET /api/dashboard
```javascript
// Response
{
  "wallet": 45.50,
  "total_spent": 155.25,
  "active_numbers_count": 3,
  "active_numbers": [
    {
      "phone_number": "+1-234-567-8900",
      "order_id": "ORD-12345678",
      "service": "google",
      "country": "USA",
      "country_flag": "🇺🇸",
      "status": "Active",
      "expires_at": "2024-03-12T10:30:00Z"
    }
  ],
  "recent_transactions": [
    {
      "date": "2024-02-12T10:30:00Z",
      "service": "facebook",
      "country": "USA",
      "phone_number": "+1-234-567-8900",
      "price": 0.49,
      "status": "Completed",
      "order_id": "ORD-12345678"
    }
  ]
}
```

#### GET /api/transactions
```javascript
// Response
{
  "transactions": [
    {
      "date": "2024-02-12T10:30:00Z",
      "service": "google",
      "country": "USA",
      "phone_number": "+1-234-567-8900",
      "price": 0.49,
      "status": "Completed",
      "order_id": "ORD-12345678"
    }
  ]
}
```

## 🛠 Utility Functions

### Shared Functions (utils.js)

#### apiCall(endpoint, options)
```javascript
// Centralized fetch helper with error handling
const data = await apiCall('/api/dashboard');

// With POST request
const result = await apiCall('/api/number/buy', {
  method: 'POST',
  body: {
    country: 'USA',
    service: 'google'
  }
});
```

#### showLoading(container, message)
```javascript
showLoading(document.getElementById('myContainer'), 'Loading data...');
```

#### showError(message)
```javascript
showError('Insufficient balance. Please add funds.');
```

#### showSuccess(message)
```javascript
showSuccess('Number purchased successfully!');
```

#### formatCurrency(amount)
```javascript
formatCurrency(45.50); // Returns: $45.50
```

#### formatDate(date)
```javascript
formatDate(new Date()); // Returns: Feb 12, 2024, 10:30 AM
```

#### setButtonLoading(button, isLoading)
```javascript
setButtonLoading(submitBtn, true);  // Show loading state
setButtonLoading(submitBtn, false); // Reset button
```

#### copyToClipboard(text)
```javascript
copyToClipboard('+1-234-567-8900'); // Copies to clipboard and shows success message
```

## 🎨 CSS Classes

Key CSS classes for styling:

- `.wallet-card` - Wallet display card
- `.numbers-grid` - Grid layout for active numbers
- `.number-card` - Individual number card
- `.service-badge` - Service name badge
- `.status-badge` - Status indicator
- `.status-active` - Green status
- `.status-pending` - Yellow/warning status
- `.status-completed` - Green status
- `.status-failed` - Red status
- `.success-result` - Success message container
- `.empty-state` - Empty data state display
- `.transactions-table` - Transaction history table

## 🔐 Security Notes

1. **No API Key Exposure**: All API calls go through the backend
2. **Authentication**: Cookies/headers handle user authentication
3. **Error Handling**: User-friendly errors without exposing sensitive info
4. **Validation**: Input validation before API calls
5. **CSRF Protection**: Backend should handle CSRF tokens

## 📱 Responsive Design

All pages are fully responsive:
- Desktop (1025px+)
- Tablet (769px - 1024px)
- Mobile Landscape (481px - 599px)
- Mobile (320px - 480px)

Mobile tables automatically convert to card layout.

## 🐛 Error Handling

### Automatic Error Handling

1. **401 Unauthorized**: Auto-redirect to login
2. **Network Error**: User-friendly message
3. **API Errors**: Display backend error message
4. **Form Validation**: Show validation errors

### Custom Error Handling

```javascript
const data = await apiCall('/api/endpoint', { showErrors: false });
if (!data) {
    // Handle error manually
    showError('Custom error message');
}
```

## 🔄 Refresh & Update Patterns

### Dashboard Auto-Refresh
```javascript
// Click refresh button to reload all dashboard data
refreshBtn.addEventListener('click', loadDashboardData);
```

### Wallet Balance Update
Automatically refreshes after successful purchase.

### Transaction History
Shows 5 most recent transactions on dashboard.
Full history available on transactions.html.

## 📊 Features Implemented

### Buy Numbers (buy-number.html)
- ✅ Country selection with 10+ countries
- ✅ Dynamic service loading per country
- ✅ Real-time price calculation
- ✅ Loading indicator during purchase
- ✅ Success display with copy buttons
- ✅ Error handling (balance, availability)

### USA Numbers (usa-numbers.html)
- ✅ Fixed country (USA only)
- ✅ Service selection from 14 USA services
- ✅ Fixed pricing for USA ($0.49)
- ✅ Country info banner
- ✅ Purchase success with tips
- ✅ Copy-to-clipboard functionality

### Dashboard (dashboard.html)
- ✅ Wallet balance display
- ✅ Active numbers grid
- ✅ Recent transactions list
- ✅ Quick action buttons
- ✅ Auto-refresh on load
- ✅ Responsive cards

### Transactions (transactions.html)
- ✅ Full transaction history table
- ✅ Filter by status (All, Completed, Pending, Failed)
- ✅ Export to CSV
- ✅ Human-readable date formatting
- ✅ Copy order IDs and phone numbers
- ✅ Mobile responsive (card layout)
- ✅ Statistics (total, spent, count)

## 🚀 Performance Tips

1. **Lazy Load**: Load data only when needed
2. **Cache**: Consider caching dashboard data
3. **Debounce**: Debounce filter operations
4. **Lazy Images**: Use lazy loading for country flags
5. **Minify**: Minify JS/CSS in production

## 🧪 Testing

Test the following flows:

1. **Buy Number Flow**
   - Select country → Select service → View price → Submit → Success

2. **USA Number Flow**
   - Select service → View price → Submit → Success

3. **Dashboard Flow**
   - Load page → Display data → Click refresh → Update data

4. **Transaction Flow**
   - Load page → Display transactions → Filter by status → Export CSV

5. **Error Flows**
   - Insufficient balance error
   - Network error
   - Authentication error (redirect to login)

## 📝 Notes

- All scripts use vanilla JavaScript (no frameworks)
- Compatible with modern browsers (Chrome, Firefox, Safari, Edge)
- No external dependencies except Bootstrap CSS (if used)
- Production-ready error handling
- Clean, readable, well-commented code

## 🔗 Integration

1. Ensure backend API endpoints are implemented
2. Add script references to HTML pages
3. Ensure proper DOM element IDs match
4. Test all flows in development
5. Deploy to production

For questions or issues, refer to API documentation or backend logs.
