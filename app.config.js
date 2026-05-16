import "dotenv/config";

export default {
  expo: {
    name: "Tell ME",
    slug: "tellme-native",
    version: "1.0.0",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0F0D0B",
    },
    android: {
      package: "com.tellmeapp.tellme",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F0D0B",
      },
      permissions: [
        "CAMERA",
        "READ_MEDIA_IMAGES",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Tell ME needs camera access to identify objects, plants, and landmarks.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Tell ME needs photo access to analyze images from your gallery.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Tell ME uses your location to improve identification accuracy for landmarks, plants, and wildlife in your area.",
        },
      ],
    ],
    extra: {
      anthropicKey: process.env.ANTHROPIC_KEY,
      googleVisionKey: process.env.GOOGLE_VISION_KEY,
      eas: {
        projectId: "395cf918-485d-4240-944d-71eb08c589b8",
      },
    },
  },
};
