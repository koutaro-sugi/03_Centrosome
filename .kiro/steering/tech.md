# Technology Stack

## Frontend
- **React 18** with TypeScript 5
- **Material-UI (MUI) v7** for component library
- **React Router v7** for navigation
- **Mapbox GL** for mapping and visualization
- **Vite 5** as build system (not Create React App)
- **react-grid-layout** for dashboard components

## Backend & Cloud
- **AWS Amplify Gen2** for backend infrastructure
- **AWS Cognito** for authentication (currently disabled)
- **AWS DynamoDB** for data storage
- **AWS KVS WebRTC** for video streaming

## Edge Computing
- **Raspberry Pi 5** for edge processing
- **MAVLink Protocol** for drone communication
- **GStreamer** for video pipeline
- **WebSocket** for real-time data streaming

## Development Tools
- **TypeScript** for type safety
- **ESLint** for code linting
- **Jest** for testing
- **npm** for package management

## Common Commands

### Development
```bash
cd 01_app
npm start          # Start development server (http://localhost:3000)
npm test           # Run tests in watch mode
npm run build      # Create production build
```

### Amplify Backend
```bash
cd 01_app
npx ampx sandbox   # Start local Amplify sandbox
npx ampx deploy    # Deploy to AWS
```

### Edge Setup
```bash
cd edge/telepath
./install_mavlink_system.sh  # Install MAVLink system
./start_mavlink.sh           # Start MAVLink router
```

## Environment Variables
Required environment variables for `01_app/.env`:
```env
VITE_AWS_REGION=ap-northeast-1
VITE_KVS_CHANNEL_NAME_FPV=usb-camera-channel
VITE_KVS_CHANNEL_NAME_PAYLOAD=siyi-zr30-channel
```

## Build Configuration
- **TypeScript**: Strict mode enabled, ES5 target
- **Vite**: Modern build system with hot reload
- **Material-UI**: Custom theme with primary color #3498db
- **WebSocket**: Real-time MAVLink data streaming on port 3001

## Test Account
- **Email**: ksugi101@gmail.com
- **Password**: hm4Prg2exrc4q4@