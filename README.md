# JB Solar Agent

Expo Router mobile app for vendor agents. Authentication and field workflows use the JB Solar Spring Boot API; no demo credentials or local mock records are included.

## Run locally

```bash
npm install
npx expo start
```

The default API URL targets the local Spring Boot server on port `8080`:

- Android emulator: `http://10.0.2.2:8080/api/v1`
- iOS simulator and web: `http://localhost:8080/api/v1`

When running through Expo Go from the Expo CLI in LAN mode, the app reads the Metro host address from Expo Constants and uses that computer's LAN IP for port `8080`. This works for a physical Android/iOS device as long as the phone and computer are on the same Wi-Fi. The Android emulator's `10.0.2.2` and `localhost` are not addresses a physical phone can use.

For native development, if `EXPO_PUBLIC_API_URL` is set to `localhost` or `127.0.0.1`, the app substitutes the Expo host when it can detect one (or `10.0.2.2` for an Android emulator). On a physical device, the backend must listen on a network interface (not only `127.0.0.1`), and the computer firewall must allow inbound TCP `8080`.

If Expo is started in tunnel mode, the backend is on a different host, or you are building for production, set `EXPO_PUBLIC_API_URL` to a backend URL reachable from the device, including `/api/v1` (for example, `https://api.example.com/api/v1` for production), then restart Expo with a cleared cache (`npx expo start --clear`). A Metro tunnel does not expose the backend. Verify local phone-to-backend connectivity by opening `http://<computer-lan-ip>:8080/v3/api-docs` in the phone browser.

The local config plugin permits HTTP for generated development builds; config plugins do not modify the Expo Go app itself. Use HTTPS outside local development.

Agents sign in with their registered mobile number and password. Only API responses with role `VENDOR_AGENT` are accepted. Native builds store access tokens in Expo SecureStore. Expo SecureStore does not support web, so browser sessions are kept in memory only and require signing in again after a page refresh.

## Current backend workflow support

The app uses the live API for vendor-agent login, agent/company profile, farmer search and registration, active policy plans, and policy creation. Policy requests include the pump-set specifications `pumpPowerHp` and `motorHeadMeters`; the API does not expose a separate pump-registration endpoint.

After creating a policy, agents capture a customer signature and pump-set photo. Pump-set photos are resized to a maximum 1280-pixel dimension and JPEG-compressed on-device; signatures are uploaded as SVG. Each upload is limited to 10 MB. The app validates the backend-issued HTTPS upload URL, refuses redirects, and verifies the completion metadata. Image bytes go directly to the signed object-storage URL; the backend associates the resulting file with the policy without receiving the image body. Verify that the backend’s R2 credentials, bucket, and CORS/upload configuration are set for the deployed environment.

If an upload fails during development, the error identifies whether the app failed while requesting the upload URL, sending the image to storage, or confirming the upload. The development console logs the backend endpoint and HTTP status for the upload-URL and completion requests, and the storage host and status for the image `PUT`; signed URLs and authorization tokens are not logged.

The current payment API exposes a `dummy-order` endpoint and server-side `simulate-success` test operation, not a production checkout integration. The app labels and uses this as a test flow; do not use it as a production payment method. After backend-confirmed payment, the app retrieves the policy and invoice metadata, then creates a PDF from that verified invoice data. Invoice PDFs have separate share and save-to-folder actions; saved filenames include a unique suffix to avoid collisions when an invoice is downloaded more than once. The signed-in app uses a bottom navigation bar for Home, Policies, and Profile. Policies can be opened for details, and existing pending policies can be resumed from the farmer's pump details step.

Farmers are searched by 12-digit Aadhaar number. New registrations require a numeric Aadhaar number and mobile number. The customer consent signature is drawn on the in-app signature pad; the pump-set evidence must be captured with the camera.

## Validation

```bash
npx tsc --noEmit
npx expo lint
```
