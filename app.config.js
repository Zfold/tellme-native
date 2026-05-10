import "dotenv/config";

export default {
  expo: {
    name: "Tell ME",
    slug: "tellme-native",
    version: "1.0.0",
    android: {
      package: "com.tellmeapp.tellme",
      versionCode: 1,
    },
    extra: {
      anthropicKey: process.env.ANTHROPIC_KEY,
      googleVisionKey: process.env.GOOGLE_VISION_KEY,
      eas: {
        projectId: "395cf918-485d-4240-944d-71eb08c589b8",
      },
    },
  },
};