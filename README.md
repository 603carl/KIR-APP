# Kenya Incident Report - Citizen App

The **Kenya Incident Report App** is a cross-platform mobile application empowering Kenyan citizens across all 47 counties to quickly flag and report emergencies or public utility incidents.

## Key Features

- **Intuitive Incident Reporting**: A step-by-step reporting form optimized for mobile usability, supporting categories ranging from Security, Water, Roads, to specialized Custom Reports.
- **Anonymous Reporting**: Built-in privacy controls allowing users to officially flag incidents anonymously (represented as 'Kenyan Citizen') without exposing their personal details to the wider public or command center views.
- **Location & Media Capture**: Automatic GPS positioning mapping to the specific county alongside integrated photo uploads to provide concrete evidence to response teams.
- **Integrated Supabase Auth**: Secure profile management handling verification points, emergency contacts, and notifications.

## Tech Stack

- **React Native (Expo)**: The core framework for deploying seamless iOS and Android applications from a single codebase.
- **TypeScript**: Ensuring scalable and strongly typed components.
- **Tailwind CSS / NativeWind**: Tailored styling using utility classes adjusted for mobile platforms.
- **Supabase**: Backend Database, Authentication, and Edge Storage layer for media uploads.

## Development Setup

1. **Install Dependencies**: `npm install`
2. **Start the Metro Bundler**: `npm run start` or `npx expo start -c` to clear the cache and spin up.
3. **Run on Device**: Scan the QR code using the Expo Go app on your phone, or run `npm run android` / `npm run ios` for emulator testing.
