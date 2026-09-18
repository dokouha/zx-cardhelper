import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zx.cardhelper',
  appName: 'Z/X 卡牌助手',
  webDir: 'dist',
  server: {
    // Allow loading card images from CDN
    allowNavigation: ['zximg-cdn.yimieji.com', 'yuyu-tei.jp', 'card.yuyu-tei.jp', 'cdn.yuyu-tei.jp'],
    // Android cleartext for image CDN
    androidScheme: 'https',
    // 禁用WebView缓存，确保每次更新APK后加载最新代码
    noCache: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    // Allow mixed content (HTTP images on HTTPS app)
    allowMixedContent: true,
  },
};

export default config;
