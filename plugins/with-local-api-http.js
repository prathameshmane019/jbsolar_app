const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

module.exports = function withLocalApiHttp(config) {
  if (process.env.NODE_ENV === 'production') {
    return config;
  }

  const androidConfig = withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return modConfig;
  });

  return withInfoPlist(androidConfig, (modConfig) => {
    const current = modConfig.modResults.NSAppTransportSecurity;
    const transportSecurity =
      typeof current === 'object' && current !== null ? current : {};

    modConfig.modResults.NSAppTransportSecurity = {
      ...transportSecurity,
      NSAllowsArbitraryLoads: true,
    };
    return modConfig;
  });
};
