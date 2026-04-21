module.exports = {
  project: {
    android: {
      packageName: 'com.trivision.crm',
    },
    ios: {
      // Bundle ID must match Xcode project settings
      bundleId: 'com.trivision.crm',
    },
  },
  dependencies: {
    // react-native-call-log is Android-only. Excluding from iOS to prevent pod install failure.
    'react-native-call-log': {
      platforms: {
        ios: null, // disables iOS auto-linking
      },
    },
  },
};
