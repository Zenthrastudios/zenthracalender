# Google Play Store Deployment Guide

This guide outlines the mandatory steps and policies required to successfully publish **Intimate Care** on the Google Play Store using the Capacitor build we've set up.

---

## 1. Mandatory Legal Documents (DONE)
Google requires clear access to your legal policies. We have already created:
- **Privacy Policy**: Located at `/privacy`. You must provide this URL in the Play Console under `App Content` -> `Privacy Policy`.
- **Terms of Service**: Located at `/terms`. Useful for the `Data Safety` section.

## 2. Play Store Policies & Guidelines

### A. Data Safety Section
In the Play Console, you will need to fill out the "Data Safety" form. Based on our app, you should declare:
- **Personal Info**: We collect Name, Email, and Phone Number (for bookings).
- **App Activity**: We track interactions (for analytics).
- **Device IDs**: Collected for Push Notifications (via Capacitor).
- **Security**: Data is encrypted in transit (SSL/Supabase).

### B. App Access
Since the app has a login, you **must** provide Google with a test account (username/password) so they can review the dashboard.

## 3. Technical Build Steps

### Step 1: Generate Production Web Build
```powershell
npm run build
```

### Step 2: Sync to Android
```powershell
npx cap sync
```

### Step 3: Open in Android Studio
```powershell
npx cap open android
```

### Step 4: Final Polish in Android Studio
1.  **Icons**: Right-click `app` folder -> `New` -> `Image Asset`. Upload your logo to generate all Android icon sizes.
2.  **Splash Screen**: Update `styles.xml` or use the Capacitor Splash Screen plugin (already installed).
3.  **Permissions**: We have already added `INTERNET` and `POST_NOTIFICATIONS` to `AndroidManifest.xml`.

### Step 5: Sign & Build
Go to `Build` > `Generate Signed Bundle / APK` within Android Studio to create the `.aab` file for upload.

---

## 4. Notification Integration (FCM)
We have implemented the trigger logic in the code. To make notifications live:
1.  Create a project on [Firebase Console](https://console.firebase.google.com/).
2.  Add an Android App and download `google-services.json`.
3.  Place `google-services.json` in `android/app/`.
4.  Add your FCM Server Key to Supabase Edge Function secrets.

---

## 5. UI Optimization Details
- **Haptics**: Users get tactical feedback on mobile when copying links or creating events.
- **Glassmorphism**: The dashboard uses backdrop-blur effects for a premium "Apple-like" feel.
- **Confetti & Delighters**: Successful bookings now trigger subtle animations to "WOW" the user.
