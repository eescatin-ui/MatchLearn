# MatchLearn Backup

MatchLearn is a mobile peer-collaboration application that helps eligible students
discover study partners and coordinate study activities.

## Mobile application

The client is built with Expo SDK 57, React Native, and TypeScript. Its main areas
include Home, Discover, Study Sessions, Messages, Buddies, and Profile.

Implemented capabilities include:

- Google sign-in for verified SSCT and SNSU institutional accounts
- Student study profiles and weighted study-buddy recommendations
- Buddy requests, study groups, and group join requests
- Direct and group messaging
- Scheduled study sessions, notifications, and reviews
- User reporting and account controls

## Backend

The mobile client communicates with the separate Laravel API under `/api/v1`.
The production deployment is configured to use PostgreSQL.

Set `EXPO_PUBLIC_API_URL` in the local environment to the API service's root URL.
Do not commit `.env` files, signing keys, or credentials.

## Run locally

Install dependencies with `npm ci`, then start the Expo development server with
`npx expo start`. Google sign-in requires the appropriate OAuth configuration and
a compatible app build.

## Documentation

The `docs/` directory contains the updated capstone document and editable Mermaid
diagram source.
