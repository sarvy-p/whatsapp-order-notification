/**
 * Event Validator Module
 * Validates Adobe Commerce CloudEvents structure and type
 */

const { errorResponse } = require('../utils')

/**
 * Allowed event types for this action
 */
const ALLOWED_EVENT_TYPES = [
  'com.adobe.commerce.observer.sales_order_place_after',
  'com.adobe.commerce.observer.sales_order_save_after',
  'com.adobe.commerce.observer.sales_order_shipment_save_after',
  'com.adobe.commerce.observer.sales_order_cancel_after'
]

/**
 * Validate CloudEvents structure
 * @param {object} params - Event parameters
 * @param {object} logger - Logger instance
 * @returns {object|null} Error response if invalid, null if valid
 */
function validateCloudEventStructure (params, logger) {
  if (!params.type || !params.source) {
    logger.error('Invalid event structure - missing required CloudEvents fields (type, source)')
    return errorResponse(400, 'Invalid event structure', logger)
  }
  return null
}

/**
 * Validate that event is from Adobe Commerce
 * @param {object} params - Event parameters
 * @param {object} logger - Logger instance
 * @returns {object|null} Error response if invalid, null if valid
 */
function validateCommerceEvent (params, logger) {
  const isCommerceEvent = params.type && params.type.includes('com.adobe.commerce')

  if (!isCommerceEvent) {
    logger.error(`Invalid event source - not a Commerce event. Event type: ${params.type}`)
    return errorResponse(400, 'Invalid event source - not a Commerce event', logger)
  }

  // Warn if source doesn't match expected pattern (but don't fail)
  if (params.source && !params.source.includes('com.adobe.commerce')) {
    logger.warn(`Unexpected event source: ${params.source}. Proceeding with caution.`)
  }

  return null
}

/**
 * Validate event type is in allowed list
 * @param {string} eventType - Event type to validate
 * @param {object} logger - Logger instance
 * @returns {object|null} Error response if invalid, null if valid
 */
function validateEventType (eventType, logger) {
  if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
    logger.error(`Unauthorized event type: ${eventType}. Allowed types: ${ALLOWED_EVENT_TYPES.join(', ')}`)
    return errorResponse(400, `Unauthorized event type: ${eventType}`, logger)
  }
  return null
}

/**
 * Validate event (combines all validation checks)
 * @param {object} params - Event parameters
 * @param {object} logger - Logger instance
 * @returns {object|null} Error response if invalid, null if valid
 */
function validateEvent (params, logger) {
  let error = validateCloudEventStructure(params, logger)
  if (error) return error

  error = validateCommerceEvent(params, logger)
  if (error) return error

  error = validateEventType(params.type, logger)
  if (error) return error

  return null
}

module.exports = {
  validateEvent,
  validateCloudEventStructure,
  validateCommerceEvent,
  validateEventType,
  ALLOWED_EVENT_TYPES
}

