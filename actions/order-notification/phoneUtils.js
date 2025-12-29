/**
 * Phone Utilities Module
 * Handles phone number formatting and extraction from order data
 */

/**
 * Format phone number to E.164 format required by Twilio
 * E.164 format: +[country code][number] (e.g., +14155552671)
 * @param {string} phoneNumber - Phone number to format
 * @returns {string|null} Formatted phone number in E.164 format, or null if invalid
 */
function formatPhoneNumber (phoneNumber) {
  if (!phoneNumber) {
    return null
  }

  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')

  // If it already starts with +, return as is (assuming it's already E.164)
  if (cleaned.startsWith('+')) {
    return cleaned
  }

  // If it starts with 00 (international format), replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
    return cleaned
  }

  // If it's a US number without country code, add +1
  if (cleaned.length === 10) {
    return '+1' + cleaned
  }

  // For other cases, try to add + if missing
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned
  }

  return cleaned
}

/**
 * Extract phone number from order data
 * Checks multiple sources: addresses array, billing_address, shipping_address
 * @param {object} orderData - Order data object
 * @returns {string|null} Phone number or null if not found
 */
function extractPhoneNumberFromOrder (orderData) {
  if (!orderData) {
    return null
  }

  // Check addresses array (billing is often first)
  if (orderData.addresses && orderData.addresses.length > 0) {
    for (const address of orderData.addresses) {
      if (address.telephone) {
        return address.telephone
      }
    }
  }

  // Fallback to billing_address
  if (orderData.billing_address?.telephone) {
    return orderData.billing_address.telephone
  }

  // Fallback to shipping_address
  if (orderData.shipping_address?.telephone) {
    return orderData.shipping_address.telephone
  }

  return null
}

/**
 * Format phone number for WhatsApp (adds whatsapp: prefix if needed)
 * @param {string} phoneNumber - Phone number in any format
 * @returns {string|null} Formatted phone number with whatsapp: prefix, or null if invalid
 */
function formatPhoneForWhatsApp (phoneNumber) {
  const formatted = formatPhoneNumber(phoneNumber)
  if (!formatted) {
    return null
  }
  return formatted.startsWith('whatsapp:') ? formatted : `whatsapp:${formatted}`
}

module.exports = {
  formatPhoneNumber,
  extractPhoneNumberFromOrder,
  formatPhoneForWhatsApp
}

