/* 
* <license header>
*/

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn()
  }
}))

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }))
})

const { Core } = require('@adobe/aio-sdk')
const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const twilio = require('twilio')
const action = require('./../actions/order-notification/index.js')

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
  mockLoggerInstance.warn.mockReset()
  jest.clearAllMocks()
})

// Mock order placement event
const mockOrderPlacedEvent = {
  type: 'com.adobe.commerce.observer.sales_order_place_after',
  source: 'com.adobe.commerce',
  event_id: 'test-event-123',
  data: {
    value: {
      order: {
        increment_id: '000000008',
        customer_email: 'test@example.com',
        customer_firstname: 'Test',
        customer_lastname: 'Customer',
        addresses: [{
          telephone: '1234567890'
        }],
        grand_total: 100,
        order_currency_code: 'USD'
      }
    }
  }
}

// Mock order status change event
const mockOrderStatusEvent = {
  type: 'com.adobe.commerce.observer.sales_order_save_after',
  source: 'com.adobe.commerce',
  event_id: 'test-event-124',
  data: {
    value: {
      order: {
        increment_id: '000000009',
        customer_email: 'test2@example.com',
        customer_firstname: 'Jane',
        customer_lastname: 'Doe',
        addresses: [{
          telephone: '+15551234567'
        }],
        status: 'processing',
        grand_total: 200,
        order_currency_code: 'USD'
      }
    }
  }
}

// Mock shipment event
const mockShipmentEvent = {
  type: 'com.adobe.commerce.observer.sales_order_shipment_save_after',
  source: 'com.adobe.commerce',
  event_id: 'test-event-125',
  data: {
    value: {
      shipment: {
        order: {
          increment_id: '000000010',
          customer_email: 'test3@example.com',
          customer_firstname: 'John',
          customer_lastname: 'Smith',
          addresses: [{
            telephone: '5559876543'
          }]
        },
        tracks: [{
          track_number: 'TRACK123456'
        }]
      }
    }
  }
}

// Mock cancellation event
const mockCancellationEvent = {
  type: 'com.adobe.commerce.observer.sales_order_cancel_after',
  source: 'com.adobe.commerce',
  event_id: 'test-event-126',
  data: {
    value: {
      order: {
        increment_id: '000000011',
        customer_email: 'test4@example.com',
        customer_firstname: 'Bob',
        customer_lastname: 'Johnson',
        addresses: [{
          telephone: '+14155552671'
        }]
      }
    }
  }
}

describe('order-notification', () => {
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should set logger to use LOG_LEVEL param', async () => {
    await action.main({ ...mockOrderPlacedEvent, LOG_LEVEL: 'debug' })
    expect(Core.Logger).toHaveBeenCalledWith(expect.any(String), { level: 'debug' })
  })

  test('should reject invalid event source', async () => {
    const invalidEvent = {
      type: 'com.example.event',
      source: 'com.example'
    }
    const response = await action.main(invalidEvent)
    expect(response.error.statusCode).toBe(400)
    expect(response.error.body.error).toContain('Invalid event source')
  })

  test('should reject unauthorized event types', async () => {
    const unauthorizedEvent = {
      type: 'com.adobe.commerce.observer.unknown_event',
      source: 'com.adobe.commerce',
      data: { value: { order: {} } }
    }
    const response = await action.main(unauthorizedEvent)
    expect(response.error.statusCode).toBe(400)
    expect(response.error.body.error).toContain('Unauthorized event type')
  })

  test('should reject events missing order data', async () => {
    const eventNoData = {
      type: 'com.adobe.commerce.observer.sales_order_place_after',
      source: 'com.adobe.commerce',
      data: {}
    }
    const response = await action.main(eventNoData)
    expect(response.error.statusCode).toBe(400)
    expect(response.error.body.error).toContain('Missing order data')
  })

  test('should handle order placement event without Twilio config', async () => {
    const response = await action.main(mockOrderPlacedEvent)
    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.whatsappSent).toBe(false)
    expect(mockLoggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Twilio configuration missing'))
  })

  test('should send WhatsApp for order placement event with Twilio config', async () => {
    const mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM123456' })
      }
    }
    twilio.mockReturnValue(mockTwilioClient)

    const eventWithTwilio = {
      ...mockOrderPlacedEvent,
      TWILIO_ACCOUNT_SID: 'test_sid',
      TWILIO_AUTH_TOKEN: 'test_token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890'
    }

    const response = await action.main(eventWithTwilio)
    expect(response.statusCode).toBe(200)
    expect(response.body.whatsappSent).toBe(true)
    expect(mockTwilioClient.messages.create).toHaveBeenCalled()
    const createCall = mockTwilioClient.messages.create.mock.calls[0][0]
    expect(createCall.to).toContain('whatsapp:')
    expect(createCall.body).toContain('000000008')
  })

  test('should handle order status change event', async () => {
    const mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM123456' })
      }
    }
    twilio.mockReturnValue(mockTwilioClient)

    const eventWithTwilio = {
      ...mockOrderStatusEvent,
      TWILIO_ACCOUNT_SID: 'test_sid',
      TWILIO_AUTH_TOKEN: 'test_token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890'
    }

    const response = await action.main(eventWithTwilio)
    expect(response.statusCode).toBe(200)
    expect(response.body.whatsappSent).toBe(true)
    const createCall = mockTwilioClient.messages.create.mock.calls[0][0]
    expect(createCall.body).toContain('processing')
  })

  test('should handle shipment event with tracking number', async () => {
    const mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM123456' })
      }
    }
    twilio.mockReturnValue(mockTwilioClient)

    const eventWithTwilio = {
      ...mockShipmentEvent,
      TWILIO_ACCOUNT_SID: 'test_sid',
      TWILIO_AUTH_TOKEN: 'test_token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890'
    }

    const response = await action.main(eventWithTwilio)
    expect(response.statusCode).toBe(200)
    const createCall = mockTwilioClient.messages.create.mock.calls[0][0]
    expect(createCall.body).toContain('TRACK123456')
  })

  test('should handle cancellation event', async () => {
    const mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM123456' })
      }
    }
    twilio.mockReturnValue(mockTwilioClient)

    const eventWithTwilio = {
      ...mockCancellationEvent,
      TWILIO_ACCOUNT_SID: 'test_sid',
      TWILIO_AUTH_TOKEN: 'test_token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890'
    }

    const response = await action.main(eventWithTwilio)
    expect(response.statusCode).toBe(200)
    const createCall = mockTwilioClient.messages.create.mock.calls[0][0]
    expect(createCall.body).toContain('cancelled')
  })

  test('should handle missing phone number', async () => {
    const eventNoPhone = {
      ...mockOrderPlacedEvent,
      data: {
        value: {
          order: {
            increment_id: '000000012',
            customer_email: 'test@example.com',
            customer_firstname: 'Test',
            customer_lastname: 'Customer',
            addresses: [{}],
            grand_total: 100,
            order_currency_code: 'USD'
          }
        }
      }
    }

    const response = await action.main(eventNoPhone)
    expect(response.error.statusCode).toBe(400)
    expect(response.error.body.error).toContain('Customer phone number not found')
  })

  test('should handle Twilio API errors gracefully', async () => {
    const mockTwilioClient = {
      messages: {
        create: jest.fn().mockRejectedValue(new Error('Twilio API Error'))
      }
    }
    twilio.mockReturnValue(mockTwilioClient)

    const eventWithTwilio = {
      ...mockOrderPlacedEvent,
      TWILIO_ACCOUNT_SID: 'test_sid',
      TWILIO_AUTH_TOKEN: 'test_token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890'
    }

    const response = await action.main(eventWithTwilio)
    expect(response.statusCode).toBe(200)
    expect(response.body.whatsappSent).toBe(false)
    expect(response.body.whatsappError).toBeDefined()
    expect(mockLoggerInstance.error).toHaveBeenCalled()
  })

  test('should extract phone from billing_address', async () => {
    const eventWithBillingPhone = {
      ...mockOrderPlacedEvent,
      data: {
        value: {
          order: {
            increment_id: '000000013',
            customer_email: 'test@example.com',
            customer_firstname: 'Test',
            customer_lastname: 'Customer',
            billing_address: {
              telephone: '5551234567'
            },
            grand_total: 100,
            order_currency_code: 'USD'
          }
        }
      },
      TWILIO_ACCOUNT_SID: 'test_sid',
      TWILIO_AUTH_TOKEN: 'test_token',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+1234567890'
    }

    const mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM123456' })
      }
    }
    twilio.mockReturnValue(mockTwilioClient)

    const response = await action.main(eventWithBillingPhone)
    expect(response.statusCode).toBe(200)
    expect(response.body.whatsappSent).toBe(true)
  })
})
