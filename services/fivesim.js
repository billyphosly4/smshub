/**
 * 5sim API Service
 * Handles all interactions with 5sim API for virtual number purchasing, OTP fetching, and order management
 * API Key: 14a33d6b3ced4d2f94276607603a0086
 */

const axios = require('axios')

const FIVESIM_API_KEY = '14a33d6b3ced4d2f94276607603a0086'
const FIVESIM_BASE_URL = 'https://5sim.net/v1'

const fivesimClient = axios.create({
  baseURL: FIVESIM_BASE_URL,
  headers: {
    'Authorization': `Bearer ${FIVESIM_API_KEY}`,
    'Accept': 'application/json'
  }
})

/**
 * Buy a virtual number for a specific service
 * @param {string} country - Country code (e.g., 'US', 'UK', 'NG')
 * @param {string} service - Service name (e.g., 'google', 'whatsapp', 'telegram')
 * @returns {Promise} Order data with phone number, order ID, and price
 */
async function buyNumber(country, service) {
  try {
    const response = await fivesimClient.post(`/user/buy/activation/${country}/any/${service}`)
    
    if (response.data && response.data.data) {
      const order = response.data.data
      return {
        success: true,
        orderId: order.id,
        phoneNumber: order.phone,
        service: order.service,
        country: order.country,
        price: order.cost,
        status: order.status,
        expiresAt: order.expires,
        createdAt: new Date().toISOString()
      }
    }
    
    return { success: false, error: 'Invalid response from 5sim' }
  } catch (error) {
    console.error('5sim buyNumber error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Check for SMS/OTP for an order
 * @param {number} orderId - Order ID from 5sim
 * @returns {Promise} SMS data with code and status
 */
async function checkSMS(orderId) {
  try {
    const response = await fivesimClient.get(`/user/check/${orderId}`)
    
    if (response.data && response.data.data) {
      const order = response.data.data
      return {
        success: true,
        status: order.status, // 'pending', 'received', 'cancelled', 'timeout'
        sms: order.sms || null,
        code: order.sms ? order.sms.split(' ').find(s => /^\d{4,}$/.test(s)) : null,
        expiresAt: order.expires
      }
    }
    
    return { success: false, status: 'error', error: 'Invalid response from 5sim' }
  } catch (error) {
    console.error('5sim checkSMS error:', error.response?.data || error.message)
    return {
      success: false,
      status: 'error',
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Cancel an order
 * @param {number} orderId - Order ID from 5sim
 * @returns {Promise} Cancellation status
 */
async function cancelOrder(orderId) {
  try {
    const response = await fivesimClient.post(`/user/cancel/${orderId}`)
    
    if (response.data) {
      return {
        success: true,
        status: 'cancelled',
        message: 'Order cancelled successfully'
      }
    }
    
    return { success: false, error: 'Failed to cancel order' }
  } catch (error) {
    console.error('5sim cancelOrder error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Finish an order (mark as completed)
 * @param {number} orderId - Order ID from 5sim
 * @returns {Promise} Finish status
 */
async function finishOrder(orderId) {
  try {
    const response = await fivesimClient.post(`/user/finish/${orderId}`)
    
    if (response.data) {
      return {
        success: true,
        status: 'completed',
        message: 'Order finished successfully'
      }
    }
    
    return { success: false, error: 'Failed to finish order' }
  } catch (error) {
    console.error('5sim finishOrder error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Get user account balance
 * @returns {Promise} User balance data
 */
async function getBalance() {
  try {
    const response = await fivesimClient.get('/user/profile')
    
    if (response.data && response.data.data) {
      const profile = response.data.data
      return {
        success: true,
        balance: profile.balance,
        frozen: profile.frozen,
        rating: profile.rating
      }
    }
    
    return { success: false, error: 'Invalid response from 5sim' }
  } catch (error) {
    console.error('5sim getBalance error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Get available services for a country
 * @param {string} country - Country code
 * @returns {Promise} List of available services
 */
async function getServices(country) {
  try {
    const response = await fivesimClient.get(`/products/${country}/any`)
    
    if (response.data && response.data.data) {
      return {
        success: true,
        services: response.data.data
      }
    }
    
    return { success: false, error: 'Invalid response from 5sim' }
  } catch (error) {
    console.error('5sim getServices error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

module.exports = {
  buyNumber,
  checkSMS,
  cancelOrder,
  finishOrder,
  getBalance,
  getServices
}
