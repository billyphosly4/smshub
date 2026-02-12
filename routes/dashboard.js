/**
 * Routes for dashboard and user data
 * Endpoints: /api/dashboard, /api/transactions
 */

const express = require('express')
const router = express.Router()
const firebase = require('../services/firebase')
const { authenticateUser } = require('../middleware/auth')

/**
 * GET /api/dashboard
 * Get dashboard data: wallet balance, active numbers, recent transactions
 */
router.get('/dashboard', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid

    // Get user data
    const user = await firebase.getUser(uid)
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Get user's orders
    const ordersResult = await firebase.getUserOrders(uid)
    const orders = ordersResult.orders || []

    // Get active numbers (orders with status: pending or received)
    const activeNumbers = orders.filter(o => 
      o.status === 'pending' || o.status === 'received'
    )

    // Get recent transactions (last 5)
    const transactionsResult = await firebase.getUserTransactions(uid)
    const recentTransactions = (transactionsResult.transactions || []).slice(0, 5)

    // Calculate statistics
    const totalOrders = orders.length
    const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0)

    res.json({
      success: true,
      wallet: user.wallet || 0,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      activeNumbersCount: activeNumbers.length,
      totalOrdersCount: totalOrders,
      activeNumbers: activeNumbers.map(o => ({
        id: o.id,
        phoneNumber: o.phoneNumber,
        service: o.service,
        country: o.country,
        status: o.status,
        expiresAt: o.expiresAt,
        sms: o.sms,
        code: o.code
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        currency: t.currency || 'USD',
        reference: t.paystackReference,
        status: t.status || 'success',
        createdAt: t.createdAt
      }))
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/transactions
 * Get all user transactions (wallet top-ups and number purchases)
 */
router.get('/transactions', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid

    // Get user's orders
    const ordersResult = await firebase.getUserOrders(uid)
    const orders = ordersResult.orders || []

    // Get user's transactions (wallet top-ups)
    const transactionsResult = await firebase.getUserTransactions(uid)
    const transactions = transactionsResult.transactions || []

    // Format orders as "number purchase" transactions
    const numberTransactions = orders.map(o => ({
      id: o.id,
      type: 'number_purchase',
      date: o.createdAt,
      service: o.service,
      country: o.country,
      phoneNumber: o.phoneNumber,
      price: o.price,
      status: o.status,
      orderId: o.id
    }))

    // Format wallet transactions
    const walletTransactions = transactions.map(t => ({
      id: t.id,
      type: 'wallet_topup',
      date: t.createdAt,
      amount: t.amount,
      currency: t.currency,
      status: 'completed',
      reference: t.paystackReference
    }))

    // Combine and sort by date
    const allTransactions = [...numberTransactions, ...walletTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({
      success: true,
      transactions: allTransactions,
      count: allTransactions.length
    })
  } catch (error) {
    console.error('GET /api/transactions error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
