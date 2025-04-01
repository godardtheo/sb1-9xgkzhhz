module.exports = {
  expo: {
    name: "setlog",
    slug: "setlog",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#021a19"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.setlog"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#021a19"
      },
      package: "com.yourcompany.setlog"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: ["expo-router", "expo-font", "expo-blur"],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};