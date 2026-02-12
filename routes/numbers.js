/**
 * Routes for virtual number purchasing
 * Endpoints: /api/number/buy, /api/number/sms, /api/number/cancel, /api/number/finish
 */

const express = require('express')
const router = express.Router()
const fivesim = require('../services/fivesim')
const firebase = require('../services/firebase')
const { authenticateUser, validateInput } = require('../middleware/auth')

/**
 * POST /api/number/buy
 * Buy a virtual number for a service
 * Body: { country, service }
 */
router.post('/buy', authenticateUser, validateInput(['country', 'service']), async (req, res) => {
  try {
    const { country, service } = req.body
    const uid = req.user.uid

    // Get user data
    const user = await firebase.getUser(uid)
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Check wallet balance
    if ((user.wallet || 0) < 1) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' })
    }

    // Buy number from 5sim
    const buyResult = await fivesim.buyNumber(country, service)
    if (!buyResult.success) {
      return res.status(400).json({ success: false, error: buyResult.error })
    }

    // Save order to database
    const orderData = {
      uid,
      fivesimOrderId: buyResult.orderId,
      phoneNumber: buyResult.phoneNumber,
      service,
      country,
      price: buyResult.price,
      status: 'pending', // pending, received, completed, cancelled, timeout
      sms: null,
      expiresAt: buyResult.expiresAt,
      createdAt: new Date().toISOString()
    }

    const saveResult = await firebase.saveOrder(orderData)
    if (!saveResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to save order' })
    }

    // Deduct from wallet
    await firebase.addToWallet(uid, -buyResult.price)

    // Return success response
    res.json({
      success: true,
      orderId: saveResult.orderId,
      phoneNumber: buyResult.phoneNumber,
      service,
      country,
      price: buyResult.price,
      expiresAt: buyResult.expiresAt,
      message: `Number purchased: ${buyResult.phoneNumber}`
    })
  } catch (error) {
    console.error('POST /api/number/buy error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/number/sms/:orderId
 * Get SMS/OTP for an order
 * Polls 5sim for updates
 */
router.get('/sms/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params
    const uid = req.user.uid

    // Get order from database
    const order = await firebase.getOrder(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' })
    }

    // Verify ownership
    if (order.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    // Check SMS from 5sim
    const smsResult = await fivesim.checkSMS(order.fivesimOrderId)
    if (!smsResult.success) {
      return res.status(400).json({ success: false, error: smsResult.error })
    }

    // Update order status in database if SMS received
    if (smsResult.status === 'received' && smsResult.code) {
      await firebase.updateOrder(orderId, {
        status: 'received',
        sms: smsResult.sms,
        code: smsResult.code,
        receivedAt: new Date().toISOString()
      })
    }

    // Return SMS info
    res.json({
      success: true,
      status: smsResult.status, // pending, received, cancelled, timeout
      sms: smsResult.sms,
      code: smsResult.code,
      message: smsResult.status === 'received' ? 'SMS received' : `Status: ${smsResult.status}`
    })
  } catch (error) {
    console.error('GET /api/number/sms/:orderId error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/number/cancel/:orderId
 * Cancel an order and refund wallet
 */
router.post('/cancel/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params
    const uid = req.user.uid

    // Get order from database
    const order = await firebase.getOrder(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' })
    }

    // Verify ownership
    if (order.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    // Cancel on 5sim
    const cancelResult = await fivesim.cancelOrder(order.fivesimOrderId)
    if (!cancelResult.success) {
      return res.status(400).json({ success: false, error: cancelResult.error })
    }

    // Update order status
    await firebase.updateOrder(orderId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    })

    // Refund wallet
    const refundAmount = order.price * 0.9 // 90% refund
    await firebase.addToWallet(uid, refundAmount)

    res.json({
      success: true,
      message: 'Order cancelled',
      refunded: refundAmount
    })
  } catch (error) {
    console.error('POST /api/number/cancel/:orderId error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/number/finish/:orderId
 * Finish an order (mark as completed)
 */
router.post('/finish/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params
    const uid = req.user.uid

    // Get order from database
    const order = await firebase.getOrder(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' })
    }

    // Verify ownership
    if (order.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    // Finish on 5sim
    const finishResult = await fivesim.finishOrder(order.fivesimOrderId)
    if (!finishResult.success) {
      return res.status(400).json({ success: false, error: finishResult.error })
    }

    // Update order status
    await firebase.updateOrder(orderId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    })

    res.json({
      success: true,
      message: 'Order completed',
      status: 'completed'
    })
  } catch (error) {
    console.error('POST /api/number/finish/:orderId error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
