/**
 * WhatsApp Order Notification Action
 * 
 * Sends WhatsApp notifications to customers when order events occur in Adobe Commerce.
 * Triggered by Adobe I/O Events for Commerce order placement, status changes, shipments, and cancellations.
 * 
 * Authentication is handled by Adobe I/O Events registration.
 * This action should only be invoked by registered Commerce events.
 */

const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters } = require('../utils')
const { validateEvent } = require('./eventValidator')
const { extractEventData, extractOrderInfo } = require('./orderDataExtractor')
const { extractPhoneNumberFromOrder } = require('./phoneUtils')
const { generateMessageByEventType } = require('./messageGenerator')
const { sendWhatsAppMessage } = require('./twilioService')

/**
 * Main function executed by Adobe I/O Runtime
 * @param {object} params - Event parameters from Adobe I/O Events
 * @returns {object} HTTP response with status code and body
 */
async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Processing order notification event')
    logger.debug(stringParameters(params))

    // Handle webhook verification challenge from Adobe I/O Events
    if (params.challenge) {
      logger.info('Received webhook verification challenge')
      return {
        statusCode: 200,
        body: { challenge: params.challenge }
      }
    }

    // Validate event structure and type
    const validationError = validateEvent(params, logger)
    if (validationError) {
      return validationError
    }

    const eventType = params.type
    logger.info(`Processing event type: ${eventType}`)

    // Extract order and shipment data from event
    const { orderData, shipmentData, error: extractionError } = extractEventData(params, eventType, logger)
    if (extractionError) {
      return extractionError
    }

    // Extract order information
    const orderInfo = extractOrderInfo(orderData)
    const { orderNumber, customerEmail, customerName } = orderInfo

    logger.info(`Processing order ${orderNumber} for customer ${customerEmail}`)

    // Extract customer phone number
    const customerPhone = extractPhoneNumberFromOrder(orderData)
    if (!customerPhone) {
      logger.warn(`No phone number found for order ${orderNumber}`)
      return errorResponse(400, 'Customer phone number not found', logger)
    }

    // Generate message based on event type
    const message = generateMessageByEventType(
      eventType,
      orderData,
      customerName,
      orderNumber,
      shipmentData
    )

    // Send WhatsApp message via Twilio
    const twilioConfig = {
      accountSid: params.TWILIO_ACCOUNT_SID,
      authToken: params.TWILIO_AUTH_TOKEN,
      fromNumber: params.TWILIO_WHATSAPP_FROM
    }

    const twilioResult = await sendWhatsAppMessage(
      twilioConfig,
      customerPhone,
      message,
      logger
    )

    // Build response
    const responseBody = {
      success: true,
      message: 'Order notification processed',
      orderNumber: orderNumber,
      customerPhone: customerPhone,
      whatsappSent: twilioResult.success,
      ...(twilioResult.error && { whatsappError: twilioResult.error })
    }

    logger.info(`Request completed successfully. WhatsApp sent: ${twilioResult.success}`)

    return {
      statusCode: 200,
      body: responseBody
    }

  } catch (error) {
    logger.error('Unexpected error processing order notification', error)
    return errorResponse(500, 'Internal server error', logger)
  }
}

exports.main = main
