# WhatsApp Order Notification

An Adobe App Builder extension that automatically sends WhatsApp notifications to customers when order events occur in Adobe Commerce. This extension integrates with Twilio WhatsApp API to deliver real-time order updates including order placement, status changes, shipments, and cancellations.

## Features

- **Real-time Notifications**: Automatically sends WhatsApp messages when order events occur
- **Multiple Event Types**: Supports order placement, status changes, shipments, and cancellations
- **Modular Architecture**: Clean, maintainable code structure with separated concerns
- **Event-Driven**: Powered by Adobe I/O Events for reliable event delivery
- **Production-Ready**: Fully tested and optimized for marketplace deployment

## Supported Event Types

This extension handles the following Adobe Commerce events:

1. **Order Placed** (`sales_order_place_after`)
   - Triggered when a new order is placed
   - Sends confirmation message with order number and total

2. **Order Status Changed** (`sales_order_save_after`)
   - Triggered when order status is updated
   - Sends notification with new order status

3. **Shipment Created** (`sales_order_shipment_save_after`)
   - Triggered when an order shipment is created
   - Sends notification with tracking number (if available)

4. **Order Cancelled** (`sales_order_cancel_after`)
   - Triggered when an order is cancelled
   - Sends cancellation notification

## Architecture

The extension follows a modular architecture with clear separation of concerns:

```
actions/order-notification/
├── index.js              # Main orchestrator - handles event flow
├── eventValidator.js     # Event validation logic
├── orderDataExtractor.js # Order/shipment data extraction
├── phoneUtils.js         # Phone number formatting and extraction
├── messageGenerator.js   # WhatsApp message template generation
└── twilioService.js      # Twilio API integration
```

### Module Responsibilities

- **index.js**: Main entry point that orchestrates the event processing flow
- **eventValidator.js**: Validates CloudEvents structure, Commerce event source, and event types
- **orderDataExtractor.js**: Extracts order and shipment data from event payloads
- **phoneUtils.js**: Formats phone numbers to E.164 format and extracts phone numbers from order data
- **messageGenerator.js**: Generates appropriate WhatsApp messages based on event type
- **twilioService.js**: Handles Twilio API integration and message sending

## Setup

### Prerequisites

- Adobe I/O Runtime account
- Adobe Commerce instance with Adobe I/O Events configured
- Twilio account with WhatsApp API access
- Node.js 18+ installed

### Environment Configuration

Populate the `.env` file in the project root with the following:

```bash
# This file must **not** be committed to source control

## Adobe I/O Runtime credentials (required)
AIO_RUNTIME_AUTH=your_runtime_auth_token
AIO_RUNTIME_NAMESPACE=your_namespace

## Twilio credentials (required)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

You can generate the `.env` file using:
```bash
aio app use
```

### Twilio Setup

1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. For development, use the Twilio WhatsApp Sandbox:
   - Get your sandbox number (e.g., `+14155238886`)
   - Format: `whatsapp:+14155238886`
   - Recipients must join the sandbox by sending "join [code]" to the sandbox number
4. For production, use a verified WhatsApp Business number

## Local Development

### Running Actions Locally

To run your actions locally for development and testing:

```bash
aio app dev
```

This will start a local development server. The console will display the action URLs you can use for testing.

For more information, see [Adobe App Builder Development Guide](https://developer.adobe.com/app-builder/docs/guides/development/#aio-app-dev-vs-aio-app-run)

### Testing with Mock Events

You can test the order notification action locally using mock events:

```bash
# Start the local dev server first (in one terminal)
aio app dev

# In another terminal, use curl to invoke the action
# Replace <action-url> with the URL displayed in the console
curl -X POST <action-url> \
  -H "Content-Type: application/json" \
  -d @mock-event.json
```

### Testing with Real Commerce Events

To test with real Commerce events:

1. Deploy the extension to Adobe I/O Runtime (see Deployment section)
2. Configure event registration in Adobe I/O Console to point to your deployed Runtime action
3. Ensure events are subscribed in your Commerce instance
4. Place orders in Commerce to trigger events

## Deployment

### Deploy to Adobe I/O Runtime

```bash
aio app deploy
```

This will:
- Build and deploy all actions to Runtime
- Deploy static files to CDN (if any)
- Create/update event registrations (if configured in `app.config.yaml`)

### Event Registration

The extension is configured with an event registration in `app.config.yaml` that:
- Listens to 4 Commerce order events
- Uses Runtime Action delivery method
- Is automatically created/updated during deployment

To manually manage event registrations:
```bash
# List registrations
aio event registration list

# Get registration details
aio event registration get <registration-id>
```

## Authorization Model

**Important:** This action uses `require-adobe-auth: false` in `app.config.yaml`, which is correct for event-triggered actions.

- **Event Authentication:** Adobe I/O Events service handles authentication at the event registration level
- **Action Security:** The action validates that events come from registered Commerce providers
- **No Bearer Token Required:** Actions triggered by Events service don't require `require-adobe-auth: true` annotation
- **Event Validation:** The action verifies event source and type before processing

## Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

### End-to-End Tests

Run e2e tests:
```bash
npm run e2e
```

## Configuration

### `app.config.yaml`

Main configuration file that defines the application's implementation. This file:
- Configures the Runtime action with environment variables
- Defines event registrations for Adobe I/O Events
- Specifies event types to listen to

More information on configuration can be found [here](https://developer.adobe.com/app-builder/docs/guides/configuration/#appconfigyaml)

## Debugging

### VS Code Debugging

While running your local server (`aio app dev`), both UI and actions can be debugged. Follow the instructions [here](https://developer.adobe.com/app-builder/docs/guides/development/#debugging)

### Runtime Activation Logs

View logs from deployed actions:
```bash
# List recent activations
aio runtime activation list --limit 10

# View logs for specific activation
aio runtime activation logs <activation-id>
```

### Event Traces

Monitor event delivery in Adobe I/O Console:
1. Go to [console.adobe.io](https://console.adobe.io)
2. Navigate to: Projects → Your Project → Your Workspace → Events
3. Click on your event registration
4. View "Event Traces" to see delivery status

## Troubleshooting

### Messages Not Being Sent

1. **Check Twilio Configuration**
   - Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` are set correctly
   - For sandbox: Ensure recipient has joined the sandbox
   - Check Twilio Console for message logs and errors

2. **Verify Event Delivery**
   - Check Runtime activations to see if events are received
   - Review Event Traces in Adobe I/O Console
   - Verify event registration is enabled and pointing to correct action

3. **Check Phone Numbers**
   - Phone numbers must be in E.164 format (e.g., `+1234567890`)
   - Ensure phone number exists in order data (addresses, billing_address, or shipping_address)

### Events Not Being Received

1. **Verify Commerce Configuration**
   - Check if events are subscribed: `bin/magento events:list`
   - Verify Adobe I/O Events integration is active in Commerce
   - Check Commerce event data table for published events

2. **Check Event Registration**
   - Verify registration is enabled in Adobe I/O Console
   - Ensure registration points to correct Runtime Action
   - Check that all 4 event types are registered

## License

Apache-2.0

## Contributing

Contributions are welcome! Please ensure:
- Code follows the existing modular structure
- All tests pass
- Code is properly documented

## Support

For issues and questions:
- Check the [Adobe App Builder Documentation](https://developer.adobe.com/app-builder/docs/)
- Review [Adobe Commerce Events Documentation](https://developer.adobe.com/commerce/extensibility/events/)
