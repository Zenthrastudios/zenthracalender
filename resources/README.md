# App Assets

To generate usage icons and splash screens for Android/iOS, you need to place your source images here.

## 1. Required Files

1.  **`icon.png`**
    *   **Size:** 1024 x 1024 px.
    *   **Format:** PNG (No transparency preferred for Android adaptive icons, or minimal).
    *   **Description:** The main app icon.

2.  **`splash.png`**
    *   **Size:** 2732 x 2732 px.
    *   **Format:** PNG.
    *   **Description:** The splash screen background.

3.  **`feature-graphic.png`** (Optional, for Play Store)
    *   **Size:** 1024 x 500 px.

## 2. Generating Assets

Once you have placed `icon.png` and `splash.png` in this folder, run:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#000000' --splashBackgroundColor '#000000'
```

This will automatically create all the necessary mipmap folders in `android/app/src/main/res/`.
