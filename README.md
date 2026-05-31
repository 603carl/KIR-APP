# Kenya Incident Report - Kir App

The **Kir App** is the citizen mobile application in the Kenya Incident Reporter (KIR) ecosystem. It is not only an incident form. It is the citizen-facing public-safety app for ordinary incidents, anonymous reports, SOS emergencies, tactical chat, emergency broadcast alerts, confidential Police Reports, OB receipts, evidence, notifications and private report history.

Kir App users are citizens. Watch Command users are employees/responders. These two account systems are separate and communicate only through secured backend workflows.

## Core Citizen Features

- **Ordinary Incident Reporting**: Citizens report accidents, security concerns, fires, road hazards, infrastructure failures, health concerns, environmental issues and other public-safety matters.
- **Anonymous Reporting**: Supported public incidents can be submitted without exposing reporter identity to public or Watch-visible incident rows while preserving internal owner tracking for the citizen's report history.
- **SOS Emergency Reporting**: Citizen taps SOS, the app captures GPS, opens tactical chat immediately and creates one active SOS session for Watch Command response.
- **Tactical Chat**: Citizen and Watch Command communicate during an SOS. Messages typed while the SOS link is still pending are queued and sent automatically when the real SOS ID is established.
- **Emergency Broadcast Alerts**: Official broadcasts from Watch Command arrive through the emergency notification channel with alarm sound and full-screen presentation where Android and Google Play policy permit.
- **Confidential Police Reports**: Citizens submit detailed private Police Reports with county, sub-county, station, occurrence details, statement, people, items, evidence and declarations.
- **OB Receipt Workflow**: Police Report receipts show a submission reference immediately and `OB Number: Pending Official Recording` until authorized staff receive/take over and issue or record OB details.
- **Secure Draft Resume**: Long Police Report forms are saved securely so citizens can continue if interrupted.
- **Private Evidence And Documents**: Police evidence and receipt/closure documents use private storage and signed download links.
- **My Reports / My Police Reports**: Citizens can track public reports separately from confidential Police Reports.
- **Privacy And Settings**: Notification preferences, privacy controls, local session recovery and secure display cache support production mobile use.

## End-To-End SOS Flow

1. Citizen taps SOS.
2. Kir App opens tactical chat immediately.
3. App captures GPS and calls the backend to create or return one active SOS.
4. If the citizen types before the SOS ID is available, the message is queued.
5. When the SOS ID resolves, queued messages are sent through the server-authorized SOS message operation.
6. Watch Command receives the SOS, opens the emergency response center and sees GPS/context.
7. Responders chat, acknowledge, dispatch, add notes and resolve through audited backend actions.
8. Citizen receives instructions and response updates in realtime.

## End-To-End Police Report Flow

1. Citizen selects Police Report.
2. App opens a dedicated confidential intake wizard.
3. Citizen fills identity, contact, address, county/sub-county, station, occurrence, statement, suspects, witnesses, evidence and conditional case details.
4. App saves secure drafts during the process.
5. Backend submits the report transactionally with idempotency.
6. Citizen receives a submission reference and receipt.
7. Watch Command receives the private case in the Police Reports queue.
8. Authorized staff view, receive, refer, take over, assign, request information, issue/record OB and close.
9. Citizen receives secure updates and documents.

## Tech Stack

- **React Native / Expo** for Android and iOS delivery.
- **TypeScript** for strongly typed mobile screens and workflow helpers.
- **Supabase** for Auth, PostgreSQL, RPCs, Realtime, Edge Functions and Storage.
- **Expo Location / Notifications / SecureStore** for GPS, emergency notifications and secure local state.
- **Private Storage** for Police Report evidence and documents.

## Development Setup

1. Install dependencies: `npm install`
2. Start development: `npm run start` or `npx expo start -c`
3. Run native builds for production-only behavior: `npm run android` / EAS signed builds
4. Production builds must use EAS production environment variables and signed native builds; Expo Go cannot validate native full-screen notification or native Google Sign-In behavior.
