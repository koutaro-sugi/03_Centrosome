# Project Structure

## Root Directory Organization

```
├── 01_app/                 # Main React application
├── 99_docs/               # Documentation and design files
├── edge/                  # Raspberry Pi edge computing scripts
├── flightplan/           # Flight plan storage
├── logo/                 # Brand assets
├── README.md             # Project overview
├── CORE_REQUIREMENTS.md   # Core feature requirements (PROTECTED)
└── .kiro/steering/        # Kiro steering rules
```

## Project Context
- **Project Name**: Centrosome - UAV統合監視システム
- **Project Number**: 03_Centrosome
- **Base Project**: 01_A1-Console
- **Type**: Current main project (01-09 series)

## Main Application Structure (`01_app/`)

```
01_app/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/            # Page-level components (routes)
│   ├── contexts/         # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # API clients and data access
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── services/         # External service integrations
│   └── scripts/          # Data initialization scripts
├── public/               # Static assets
├── amplify/              # AWS Amplify configuration
└── build/                # Production build output
```

## Key Architectural Patterns

### Component Organization
- **Pages**: Top-level route components in `src/pages/`
- **Components**: Reusable UI components in `src/components/`
- **Contexts**: Global state management via React Context
- **Hooks**: Custom hooks for data fetching and state logic

### Data Layer
- **lib/**: API clients for different data types (aircraft, pilot, flight logs)
- **types/**: Comprehensive TypeScript definitions for all data structures
- **contexts/**: Global state providers (FlightPlanContext, DynamoDBContext)

### Naming Conventions
- **Components**: PascalCase (e.g., `FlightDetails.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useMAVLinkWebSocket.ts`)
- **Types**: PascalCase interfaces (e.g., `TelemetryData`)
- **Files**: Match component/function names

### Edge Computing Structure (`edge/`)
- **telepath/**: MAVLink communication scripts
- **fpv-streaming/**: Video streaming pipeline scripts
- **setup/**: System initialization and configuration

## Import Patterns
- Relative imports for local files
- Absolute imports from `src/` root
- Material-UI components imported individually
- Type-only imports marked with `type` keyword