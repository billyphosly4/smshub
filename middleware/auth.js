/**
 * Authentication and Validation Middleware
 */

const admin = require('firebase-admin')

/**
 * Middleware to authenticate user from Firebase token
 * Token can be in Authorization header as "Bearer <token>"
 * or in cookies as "idToken"
 */
async function authenticateUser(req, res, next) {
  try {
    let token = null

    // Try to get token from Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    // Try to get token from cookies
    else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {})
      token = cookies.idToken
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'No authentication token provided' })
    }

    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.user = decodedToken
    next()
  } catch (error) {
    console.error('Authentication error:', error.message)
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

/**
 * Middleware to validate required input fields
 * @param {array} requiredFields - Array of required field names
 */
function validateInput(requiredFields) {
  return (req, res, next) => {
    const body = req.body || {}
    const missing = requiredFields.filter(field => !body[field])

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      })
    }

    next()
  }
}

/**
 * Middleware for rate limiting
 * Simple in-memory implementation; use Redis in production
 */
const requestLimits = new Map()

function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const key = `${req.ip}-${req.path}`
    const now = Date.now()
    
    if (!requestLimits.has(key)) {
      requestLimits.set(key, [])
    }

    const requests = requestLimits.get(key)
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs)
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      })
    }

    validRequests.push(now)
    requestLimits.set(key, validRequests)
    next()
  }
}

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err)
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

module.exports = {
  authenticateUser,
  validateInput,
  rateLimit,
  errorHandler
}
