import type { ConfigContext, ExpoConfig } from "@expo/config";

import { ClientEnv, Env } from "./env";

// Required by expo-release-it for version management.
const VERSION_NAME = "1.0.1";
const VERSION_CODE = 1000001;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.NAME,
  newArchEnabled: true,
  description: `${Env.NAME} Mobile App`,
  owner: Env.EXPO_ACCOUNT_OWNER,
  scheme: Env.SCHEME,
  slug: "refugee-literacy-project-app",
  version: VERSION_NAME,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "cover",
    backgroundColor: "#2E3C4B",
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"], // TODO: Refine this... i.e. ["assets/images/*", "assets/fonts/*"]
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.BUNDLE_ID,
    appleTeamId: "7NNQHFTN5Z",
    buildNumber: String(VERSION_CODE),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryAddUsageDescription: "Allow $(PRODUCT_NAME) to save photos",
      NSPhotoLibraryUsageDescription:
        "Allow $(PRODUCT_NAME) to access your photos",
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#2E3C4B",
    },
    package: Env.PACKAGE,
    versionCode: VERSION_CODE,
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-web-browser",
    "expo-audio",
    ["expo-font"],
    "expo-localization",
    "expo-router",
    ["expo-build-properties"],
    [
      "app-icon-badge",
      {
        enabled: Env.APP_ENV !== "production",
        badges: [
          {
            text: Env.APP_ENV,
            type: "banner",
            color: "white",
          },
          {
            text: VERSION_NAME,
            type: "ribbon",
            color: "white",
          },
        ],
      },
    ],
  ],
  extra: {
    ...ClientEnv,
    eas: {
      projectId: Env.EAS_PROJECT_ID,
    },
  },
});
