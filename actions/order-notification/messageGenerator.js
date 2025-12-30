/**
 * Message Generator Module
 * Generates WhatsApp message templates for different order events
 */

/**
 * Generate WhatsApp message for order placement
 * @param {string} customerName - Customer's full name
 * @param {string} orderNumber - Order number/increment ID
 * @param {number} orderTotal - Order total amount
 * @param {string} orderCurrency - Order currency code
 * @returns {string} Formatted WhatsApp message
 */
function generateOrderPlacedMessage (customerName, orderNumber, orderTotal, orderCurrency) {
  return `Hi ${customerName}, your order #${orderNumber} for ${orderTotal} ${orderCurrency} has been confirmed. Thank you for your purchase!`
}

/**
 * Generate WhatsApp message for order status change
 * @param {string} customerName - Customer's full name
 * @param {string} orderNumber - Order number/increment ID
 * @param {string} orderStatus - New order status
 * @returns {string} Formatted WhatsApp message
 */
function generateOrderStatusChangeMessage (customerName, orderNumber, orderStatus) {
  return `Hi ${customerName}, your order #${orderNumber} status has been updated to ${orderStatus}.`
}

/**
 * Generate WhatsApp message for shipment created
 * @param {string} customerName - Customer's full name
 * @param {string} orderNumber - Order number/increment ID
 * @param {string} trackingNumber - Shipment tracking number
 * @returns {string} Formatted WhatsApp message
 */
function generateShipmentMessage (customerName, orderNumber, trackingNumber) {
  if (trackingNumber) {
    return `Hi ${customerName}, your order #${orderNumber} has been shipped! Track your package using tracking number ${trackingNumber}.`
  } else {
    return `Hi ${customerName}, your order #${orderNumber} has been shipped!`
  }
}

/**
 * Generate WhatsApp message for order cancellation
 * @param {string} customerName - Customer's full name
 * @param {string} orderNumber - Order number/increment ID
 * @returns {string} Formatted WhatsApp message
 */
function generateCancellationMessage (customerName, orderNumber) {
  return `Hi ${customerName}, your order #${orderNumber} has been cancelled. If you have any questions, please contact us.`
}

/**
 * Generate message based on event type
 * @param {string} eventType - Type of event
 * @param {object} orderData - Order data object
 * @param {string} customerName - Customer's full name
 * @param {string} orderNumber - Order number
 * @param {object} shipmentData - Shipment data (optional)
 * @returns {string} Generated message
 */
function generateMessageByEventType (eventType, orderData, customerName, orderNumber, shipmentData = null) {
  // Use exact matching to avoid false positives from substring matching
  const isOrderCancelled = eventType === 'com.adobe.commerce.observer.sales_order_cancel_after'
  const isOrderPlaced = eventType === 'com.adobe.commerce.observer.sales_order_place_after'
  const isShipmentCreated = eventType === 'com.adobe.commerce.observer.sales_order_shipment_save_after'
  const isOrderSaved = eventType === 'com.adobe.commerce.observer.sales_order_save_after'

  const orderTotal = orderData.grand_total
  const orderCurrency = orderData.order_currency_code
  const orderStatus = orderData.status || orderData.state

  if (isOrderCancelled) {
    return generateCancellationMessage(customerName, orderNumber)
  } else if (isOrderPlaced) {
    return generateOrderPlacedMessage(customerName, orderNumber, orderTotal, orderCurrency)
  } else if (isShipmentCreated) {
    const trackingNumber = shipmentData?.tracks?.[0]?.track_number ||
                          shipmentData?.tracks?.[0]?.number
    return generateShipmentMessage(customerName, orderNumber, trackingNumber)
  } else if (isOrderSaved && orderStatus) {
    return generateOrderStatusChangeMessage(customerName, orderNumber, orderStatus)
  } else {
    // Fallback for other order events
    return generateOrderPlacedMessage(customerName, orderNumber, orderTotal, orderCurrency)
  }
}

module.exports = {
  generateOrderPlacedMessage,
  generateOrderStatusChangeMessage,
  generateShipmentMessage,
  generateCancellationMessage,
  generateMessageByEventType
}

