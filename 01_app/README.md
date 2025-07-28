# Centra - Flight Management System

Centra is a comprehensive flight management system that integrates weather data, MAVLink telemetry, and AWS IoT sensor monitoring for aviation operations.

## Features

- **Flight Planning**: Create and manage flight plans with waypoint editing
- **Weather Integration**: Real-time weather data from Windy API and AWS IoT sensors
- **MAVLink Telemetry**: Live telemetry data from aircraft via WebSocket
- **Sensor Monitoring**: AWS IoT Core integration for weather station monitoring
- **Flight Logging**: Comprehensive flight data logging and analysis

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS Account with Amplify, IoT Core, and Cognito configured
- Windy API Key

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd 03_Centra/01_app
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Configure AWS Amplify:
```bash
npx ampx configure
```

## Development

Start the development server:
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Building for Production

Build the production application:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Deployment

Deploy to AWS Amplify:
```bash
npx ampx deploy
```

## Project Structure

```
src/
├── components/     # React components
├── contexts/       # React contexts
├── hooks/         # Custom React hooks
├── lib/           # API client libraries
├── pages/         # Page components
├── services/      # Service layer (IoT, sensors, etc.)
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## AWS Resources

This application uses the following AWS services:

- **AWS Amplify**: Authentication and hosting
- **AWS IoT Core**: Real-time sensor data
- **Amazon Cognito**: User authentication
- **Amazon DynamoDB**: Data storage
- **AWS Lambda**: Serverless functions
- **API Gateway**: REST APIs

## Configuration

### AWS IoT Core

IoT devices should publish to the following topic:
```
mado/sensors/{device-id}
```

### Environment Variables

See `.env.example` for required environment variables.

## License

This project is proprietary software. All rights reserved.