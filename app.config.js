const appJson = require('./app.json');

const googleIOSUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
const plugins = appJson.expo.plugins.filter(
  (plugin) => !Array.isArray(plugin) || plugin[0] !== 'react-native-nitro-google-signin'
);

if (googleIOSUrlScheme) {
  plugins.unshift([
    'react-native-nitro-google-signin',
    { iosUrlScheme: googleIOSUrlScheme },
  ]);
}

module.exports = ({ config }) => ({
  ...config,
  plugins,
});
