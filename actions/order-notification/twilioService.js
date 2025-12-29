/**
 * Twilio Service Module
 * Handles WhatsApp message sending via Twilio API
 */

const twilio = require('twilio')
const { formatPhoneForWhatsApp } = require('./phoneUtils')

/**
 * Send WhatsApp message via Twilio
 * @param {object} config - Twilio configuration
 * @param {string} config.accountSid - Twilio Account SID
 * @param {string} config.authToken - Twilio Auth Token
 * @param {string} config.fromNumber - WhatsApp sender number (with whatsapp: prefix)
 * @param {string} toPhoneNumber - Recipient phone number
 * @param {string} message - Message to send
 * @param {object} logger - Logger instance
 * @returns {Promise<object>} Object with success flag, messageSid, and optional error
 */
async function sendWhatsAppMessage (config, toPhoneNumber, message, logger) {
  const { accountSid, authToken, fromNumber } = config

  if (!accountSid || !authToken || !fromNumber) {
    const error = 'Twilio configuration missing - WhatsApp notifications will not be sent'
    logger.warn(error)
    return {
      success: false,
      error: error
    }
  }

  try {
    // Initialize Twilio client
    const twilioClient = twilio(accountSid, authToken)

    // Format phone number for WhatsApp
    const whatsappTo = formatPhoneForWhatsApp(toPhoneNumber)
    if (!whatsappTo) {
      throw new Error('Invalid phone number format')
    }

    // Send message
    logger.info(`Sending WhatsApp to ${whatsappTo}`)
    const twilioMessage = await twilioClient.messages.create({
      from: fromNumber,
      to: whatsappTo,
      body: message
    })

    logger.info(`WhatsApp message sent successfully. SID: ${twilioMessage.sid}`)
    return {
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status
    }
  } catch (error) {
    const errorMessage = error.message || 'Unknown Twilio error'
    logger.error(`Failed to send WhatsApp message: ${errorMessage}`, error)
    return {
      success: false,
      error: errorMessage
    }
  }
}

module.exports = {
  sendWhatsAppMessage
}

