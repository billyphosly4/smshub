/**
 * Firebase Database Service
 * Handles all database operations for users, orders, and transactions
 */

const admin = require('firebase-admin')

// Initialize Firebase Admin (ensure FIREBASE_CREDENTIALS is set in environment)
let db = null

try {
  if (!admin.apps.length) {
    const firebaseConfig = process.env.FIREBASE_CREDENTIALS 
      ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
      : require('../firebase-config.json') // Fallback to local file
    
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig)
    })
  }
  db = admin.firestore()
} catch (error) {
  console.warn('Firebase initialization warning:', error.message)
}

/**
 * Get user by UID
 * @param {string} uid - Firebase user UID
 * @returns {Promise} User data
 */
async function getUser(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get()
    return doc.exists ? { id: uid, ...doc.data() } : null
  } catch (error) {
    console.error('getUser error:', error)
    return null
  }
}

/**
 * Create or update user
 * @param {string} uid - Firebase user UID
 * @param {object} userData - User data to store
 * @returns {Promise} Success status
 */
async function setUser(uid, userData) {
  try {
    await db.collection('users').doc(uid).set(userData, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('setUser error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Save an order
 * @param {object} orderData - Order information
 * @returns {Promise} Order document ID
 */
async function saveOrder(orderData) {
  try {
    const docRef = await db.collection('orders').add({
      ...orderData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    return { success: true, orderId: docRef.id }
  } catch (error) {
    console.error('saveOrder error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update an order
 * @param {string} docId - Firestore document ID
 * @param {object} updateData - Data to update
 * @returns {Promise} Success status
 */
async function updateOrder(docId, updateData) {
  try {
    await db.collection('orders').doc(docId).update(updateData)
    return { success: true }
  } catch (error) {
    console.error('updateOrder error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user's orders
 * @param {string} uid - Firebase user UID
 * @returns {Promise} Array of orders
 */
async function getUserOrders(uid) {
  try {
    const snapshot = await db.collection('orders')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    
    return {
      success: true,
      orders: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  } catch (error) {
    console.error('getUserOrders error:', error)
    return { success: false, orders: [], error: error.message }
  }
}

/**
 * Get a specific order
 * @param {string} docId - Firestore document ID
 * @returns {Promise} Order data
 */
async function getOrder(docId) {
  try {
    const doc = await db.collection('orders').doc(docId).get()
    return doc.exists ? { id: docId, ...doc.data() } : null
  } catch (error) {
    console.error('getOrder error:', error)
    return null
  }
}

/**
 * Save a transaction (wallet top-up)
 * @param {object} transactionData - Transaction details
 * @returns {Promise} Success status
 */
async function saveTransaction(transactionData) {
  try {
    const docRef = await db.collection('transactions').add({
      ...transactionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    return { success: true, transactionId: docRef.id }
  } catch (error) {
    console.error('saveTransaction error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user's transactions
 * @param {string} uid - Firebase user UID
 * @returns {Promise} Array of transactions
 */
async function getUserTransactions(uid) {
  try {
    const snapshot = await db.collection('transactions')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    
    return {
      success: true,
      transactions: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  } catch (error) {
    console.error('getUserTransactions error:', error)
    return { success: false, transactions: [], error: error.message }
  }
}

/**
 * Update user wallet balance
 * @param {string} uid - Firebase user UID
 * @param {number} amount - Amount to add to wallet
 * @returns {Promise} New balance
 */
async function addToWallet(uid, amount) {
  try {
    const userRef = db.collection('users').doc(uid)
    const doc = await userRef.get()
    const currentBalance = (doc.data()?.wallet || 0) + amount
    
    await userRef.update({ wallet: currentBalance })
    return { success: true, newBalance: currentBalance }
  } catch (error) {
    console.error('addToWallet error:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  getUser,
  setUser,
  saveOrder,
  updateOrder,
  getUserOrders,
  getOrder,
  saveTransaction,
  getUserTransactions,
  addToWallet
}
