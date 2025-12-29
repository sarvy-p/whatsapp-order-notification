/**
 * Order Data Extractor Module
 * Extracts order and shipment data from event payload
 */

const { errorResponse } = require('../utils')

/**
 * Extract shipment data from event payload
 * @param {object} data - Event data object
 * @returns {object|null} Shipment data or null if not found
 */
function extractShipmentData (data) {
  return data?.value?.shipment || null
}

/**
 * Extract order data from event payload
 * Handles both standard order events and shipment events
 * @param {object} data - Event data object
 * @param {object} shipmentData - Shipment data (if available)
 * @param {boolean} isShipmentEvent - Whether this is a shipment event
 * @returns {object|null} Order data or null if not found
 */
function extractOrderData (data, shipmentData = null, isShipmentEvent = false) {
  if (isShipmentEvent && shipmentData) {
    // For shipment events, order might be nested in shipment.order
    return shipmentData.order || data?.value?.order || data?.value || null
  } else {
    // Standard order events - order data is directly in data.value
    return data?.value?.order || data?.value || null
  }
}

/**
 * Extract order information from order data
 * @param {object} orderData - Order data object
 * @returns {object} Extracted order information
 */
function extractOrderInfo (orderData) {
  return {
    orderNumber: orderData.increment_id || orderData.entity_id,
    customerEmail: orderData.customer_email,
    customerName: `${orderData.customer_firstname || ''} ${orderData.customer_lastname || ''}`.trim(),
    orderTotal: orderData.grand_total,
    orderCurrency: orderData.order_currency_code,
    orderStatus: orderData.status || orderData.state
  }
}

/**
 * Extract tracking number from shipment data
 * @param {object} shipmentData - Shipment data object
 * @returns {string|null} Tracking number or null if not found
 */
function extractTrackingNumber (shipmentData) {
  if (!shipmentData || !shipmentData.tracks || shipmentData.tracks.length === 0) {
    return null
  }

  const track = shipmentData.tracks[0]
  return track.track_number || track.number || null
}

/**
 * Extract order and shipment data from event
 * @param {object} params - Event parameters
 * @param {string} eventType - Event type
 * @param {object} logger - Logger instance
 * @returns {object} Object with orderData and shipmentData, or error response
 */
function extractEventData (params, eventType, logger) {
  const isShipmentEvent = eventType.includes('sales_order_shipment_save_after')

  let shipmentData = null
  if (isShipmentEvent) {
    shipmentData = extractShipmentData(params.data)
  }

  const orderData = extractOrderData(params.data, shipmentData, isShipmentEvent)

  if (!orderData) {
    if (isShipmentEvent && !shipmentData) {
      logger.error('No shipment or order data found in shipment event')
      const error = errorResponse(400, 'Missing shipment data', logger)
      return { error }
    } else {
      logger.error('No order data found in event')
      const error = errorResponse(400, 'Missing order data', logger)
      return { error }
    }
  }

  return {
    orderData,
    shipmentData
  }
}

module.exports = {
  extractShipmentData,
  extractOrderData,
  extractOrderInfo,
  extractTrackingNumber,
  extractEventData
}

