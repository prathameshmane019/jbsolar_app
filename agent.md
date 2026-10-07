Create a production-ready cross-platform mobile application for **JB Solar  ** using **Expo React Native with TypeScript**, targeting both **Android and iOS**.

Use:
- Expo with the latest stable SDK 57
- Expo Router
- Gluestack UI
- TypeScript
- TanStack Query for server state
- Zustand for local app state
- Axios for API communication
- React Hook Form + Zod for forms and validation
- Expo SecureStore for authentication tokens
- Expo Image Picker/Camera for photos
- Expo Document Picker for documents
- Expo Location where required
- EAS Build for Android and iOS

The application is an **enterprise field-agent mobile application** for solar pump set registration, installation, AMC/policy management, document collection, and payments.

### User Role

Only authenticated **VENDOR_AGENT** users can use this mobile application.

### Main Workflow

```text
Agent Login
    ↓
Agent Dashboard
    ↓
Search Farmer
    ├── Farmer exists
    │      ↓
    │   Select Farmer
    │
    └── Farmer does not exist
           ↓
        Register Farmer
           ↓
        Farmer Profile
    ↓
Register Solar Pump/System
    ↓
Record Installation
    ↓
Upload Photos/Documents
    ↓
Select Policy Plan
    ↓
Review Order
    ↓
Initiate Payment
    ↓
Payment Gateway
    ├── Failed → Retry Payment
    └── Success
          ↓
      Backend verifies payment
          ↓
      Policy becomes ACTIVE
          ↓
      Invoice generated
          ↓
      Transaction completed
          ↓
      Admin can see transaction
```

### Farmer Handling

Before creating a farmer, allow the agent to search using available unique identifiers such as mobile number or farmer ID.

If the farmer exists, show the existing farmer profile and allow the agent to continue.

If the farmer does not exist, provide a guided farmer registration form.

Prevent accidental duplicate farmer creation through proper backend validation and idempotent APIs.

### Solar Pump Registration

The system must model the farmer's complete **solar pump/system set**, not merely an individual pump.

Capture appropriate information such as:

- Pump/system details
- Capacity
- Manufacturer
- Model
- Serial number
- Installation location
- Installation date
- Related farmer
- Relevant technical details

### Installation

Provide a guided installation form with:

- Installation details
- Technician/agent information
- Date and time
- Location/GPS where applicable
- Installation status
- Remarks
- Required installation photos

### Photos and Documents

Allow agents to:

- Capture photos using the camera
- Select photos from the gallery
- Upload documents
- Preview uploaded files
- Remove/retry failed uploads
- Show upload progress

Compress images before upload where appropriate.

Do not store large image binaries in the main database. Store files in object storage such as S3 and store only their storage key/URL and metadata in the backend.

### Policy

Display available policy/AMC plans clearly.

Show:

- Plan name
- Coverage
- Duration
- Price
- GST/taxes where applicable
- Benefits
- Terms

Allow the agent to select one plan and review the complete amount before payment.

### Payment

Payment must be backend-controlled.

The mobile application should request a payment order from the Spring Boot backend and open the configured payment gateway.

Never trust the mobile client alone to determine payment success.

Payment should be verified through the backend/payment gateway webhook.

Possible states:

```text
PENDING
SUCCESS
FAILED
CANCELLED
```

Only after successful backend verification should the system:

```text
Payment verified
    ↓
Policy ACTIVE
    ↓
Invoice generated
    ↓
Transaction recorded
```

### UI/UX

Create a modern, professional **enterprise field-service UI**.

Design principles:

- Clean and minimal interface
- Consistent Gluestack UI components
- Large touch targets
- Mobile-first layouts
- Clear typography hierarchy
- Consistent spacing
- Strong form validation
- Clear error messages
- Loading states
- Skeleton states where appropriate
- Success/error feedback
- Confirmation dialogs for important actions
- Progress indicators for multi-step workflows
- Accessible UI
- Light and dark theme support
- Responsive layouts for different Android/iOS screen sizes

Use a multi-step workflow:

```text
Farmer → Pump → Installation → Documents → Policy → Payment → Complete
```

Show the current step and completed steps clearly.

Minimize typing for field agents by using:

- Select fields
- Date pickers
- Searchable dropdowns
- Radio buttons
- Checkboxes
- Camera capture
- Auto-filled information
- Reusable farmer/system data

### Dashboard

Create an agent dashboard containing:

- Greeting
- Agent information
- Today's registrations
- Pending installations
- Pending payments
- Completed policies
- Recent activity
- Quick actions

Quick actions:

```text
Register Farmer
Register Pump
Continue Pending Registration
View Farmers
View Transactions
```

### Offline/Network Handling

This is a field application, so it must tolerate poor network connectivity.

Implement:

- Network status detection
- Draft saving
- Pending synchronization state
- Retry mechanisms
- Upload retry
- API error handling
- Safe recovery from interrupted workflows

Do not store large images directly in AsyncStorage.

### Authentication

Implement secure authentication using JWT.

Store tokens using Expo SecureStore.

Handle:

- Login
- Logout
- Token expiration
- Unauthorized API responses
- Session restoration
- Secure API requests

### Architecture

Use a scalable structure such as:

```text
app/
  (auth)/
  (agent)/
    farmers/
    pumps/
    installation/
    documents/
    policies/
    payment/
  transaction/

src/
  api/
  components/
  hooks/
  store/
  types/
  utils/
  constants/
```

Separate:

- UI components
- API services
- Business logic
- State management
- Validation schemas
- Types/models
- Utilities

Do not put business logic directly inside screen components.

### Backend Integration

Assume the backend is a **Spring Boot REST API**.

Create a centralized Axios client with:

- Base URL configuration
- JWT interceptor
- Standard error handling
- Request timeout
- Retry strategy where appropriate

Use TanStack Query for API caching, mutations, invalidation, loading states, and error states.

### Enterprise Requirements

The application must be production-oriented and maintainable.

Prioritize:

- Type safety
- Reusable components
- Clean architecture
- Performance
- Small bundle size
- Image optimization
- API efficiency
- Secure token storage
- Error recovery
- Accessibility
- Consistent UX
- Android and iOS compatibility

Do not create unnecessary dependencies or over-engineer the application.

Generate the project using modern Expo conventions and ensure all code is compatible with the selected Expo SDK and React Native versions.