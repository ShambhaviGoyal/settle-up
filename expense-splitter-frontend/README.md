# Expense Splitter Frontend

React Native mobile application built with Expo for splitting expenses with friends and groups.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure API URL**

   Update `services/api.ts` with your backend server IP:
   ```typescript
   const API_URL = 'http://YOUR_LOCAL_IP:3000/api';
   ```

3. **Start the app**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app
   - Press `w` for web

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start on Android emulator
- `npm run ios` - Start on iOS simulator
- `npm run web` - Start web version
- `npm run lint` - Run ESLint

## Project Structure

- `app/` - Screen components (file-based routing)
- `components/` - Reusable UI components
- `services/` - API client and service layer
- `constants/` - App constants and theme
- `hooks/` - Custom React hooks

## Tech Stack

- React Native (Expo SDK ~54)
- TypeScript
- Expo Router
- Axios
- AsyncStorage

For complete documentation, see the [main README](../README.md) in the project root.
