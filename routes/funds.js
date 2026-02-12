/**
 * Routes for wallet and payment management
 * Endpoints: /api/funds/add, /api/funds/verify
 */

const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const paystack = require('../services/paystack')
const firebase = require('../services/firebase')
const { authenticateUser, validateInput } = require('../middleware/auth')

/**
 * POST /api/funds/add
 * Initialize a payment to add funds to wallet
 * Body: { amount, currency }
 */
router.post('/add', authenticateUser, validateInput(['amount']), async (req, res) => {
  try {
    const { amount } = req.body
    const uid = req.user.uid
    const email = req.user.email

    // Validate amount
    if (amount < 1 || amount > 100000) {
      return res.status(400).json({ success: false, error: 'Invalid amount' })
    }

    // Generate unique reference
    const reference = `PSH-${uid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    // Initialize payment with Paystack
    const paymentResult = await paystack.initializePayment(
      email,
      Math.round(amount * 100), // Convert to cents
      reference
    )

    if (!paymentResult.success) {
      return res.status(400).json({ success: false, error: paymentResult.error })
    }

    // Save pending transaction to database
    await firebase.saveTransaction({
      uid,
      amount,
      currency: 'USD',
      paystackReference: reference,
      authorizationUrl: paymentResult.authorizationUrl,
      status: 'pending',
      type: 'wallet_topup'
    })

    res.json({
      success: true,
      authorizationUrl: paymentResult.authorizationUrl,
      accessCode: paymentResult.accessCode,
      reference: reference,
      amount: amount,
      message: 'Payment initialized. Redirecting to Paystack...'
    })
  } catch (error) {
    console.error('POST /api/funds/add error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/funds/verify
 * Verify payment and add funds to wallet
 * Body: { reference }
 */
router.post('/verify', authenticateUser, validateInput(['reference']), async (req, res) => {
  try {
    const { reference } = req.body
    const uid = req.user.uid

    // Verify payment with Paystack
    const verifyResult = await paystack.verifyPayment(reference)
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.error })
    }

    // Add funds to wallet
    const walletResult = await firebase.addToWallet(uid, verifyResult.amount)
    if (!walletResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to update wallet' })
    }

    // Update transaction status to completed
    // Note: In a production app, would have a way to identify the transaction by reference
    // For now, we rely on the saveTransaction storing it correctly

    res.json({
      success: true,
      message: `Wallet topped up with $${verifyResult.amount}`,
      newBalance: walletResult.newBalance,
      amount: verifyResult.amount,
      reference: reference
    })
  } catch (error) {
    console.error('POST /api/funds/verify error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/funds/public-key
 * Get Paystack public key for frontend
 */
router.get('/public-key', (req, res) => {
  res.json({
    publicKey: paystack.PAYSTACK_PUBLIC_KEY,
    message: 'Paystack public key for frontend initialization'
  })
})

module.exports = router
