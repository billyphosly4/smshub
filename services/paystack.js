/**
 * Paystack Payment Service
 * Handles wallet top-up and payment verification
 */

const axios = require('axios')

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || ''
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
})

/**
 * Initialize a payment transaction
 * @param {string} email - Customer email
 * @param {number} amount - Amount in cents (e.g., 1000 = $10)
 * @param {string} reference - Unique reference ID
 * @returns {Promise} Payment initialization response
 */
async function initializePayment(email, amount, reference) {
  try {
    const response = await paystackClient.post('/transaction/initialize', {
      email,
      amount,
      reference
    })

    if (response.data && response.data.status) {
      return {
        success: true,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference
      }
    }

    return { success: false, error: 'Failed to initialize payment' }
  } catch (error) {
    console.error('Paystack initializePayment error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Verify a payment transaction
 * @param {string} reference - Transaction reference
 * @returns {Promise} Payment verification result
 */
async function verifyPayment(reference) {
  try {
    const response = await paystackClient.get(`/transaction/verify/${reference}`)

    if (response.data && response.data.status) {
      const data = response.data.data
      
      if (data.status === 'success') {
        return {
          success: true,
          status: 'success',
          reference: data.reference,
          amount: data.amount / 100, // Convert from cents to dollars
          currency: data.currency,
          customerId: data.customer.id,
          email: data.customer.email,
          paidAt: data.paid_at
        }
      }
    }

    return { success: false, status: data?.status || 'failed', error: 'Payment verification failed' }
  } catch (error) {
    console.error('Paystack verifyPayment error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Charge authorization
 * @param {string} authorizationCode - Authorization code from payment
 * @param {string} email - Customer email
 * @param {number} amount - Amount in cents
 * @returns {Promise} Charge response
 */
async function chargeAuthorization(authorizationCode, email, amount) {
  try {
    const response = await paystackClient.post('/transaction/charge_authorization', {
      authorization_code: authorizationCode,
      email,
      amount
    })

    if (response.data && response.data.status) {
      return {
        success: true,
        reference: response.data.data.reference,
        amount: response.data.data.amount / 100
      }
    }

    return { success: false, error: 'Charge failed' }
  } catch (error) {
    console.error('Paystack chargeAuthorization error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

/**
 * Get list of banks for transfers
 * @returns {Promise} List of banks
 */
async function getBanks() {
  try {
    const response = await paystackClient.get('/bank')

    if (response.data && response.data.status) {
      return {
        success: true,
        banks: response.data.data
      }
    }

    return { success: false, error: 'Failed to fetch banks' }
  } catch (error) {
    console.error('Paystack getBanks error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  chargeAuthorization,
  getBanks,
  PAYSTACK_PUBLIC_KEY
}
