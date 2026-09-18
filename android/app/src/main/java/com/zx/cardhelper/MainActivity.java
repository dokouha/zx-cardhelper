package com.zx.cardhelper;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
  @Override
  public void onStart() {
    super.onStart();
    // Bridge已初始化，禁用WebView缓存确保每次更新后加载最新代码
    Bridge bridge = getBridge();
    if (bridge != null) {
      WebView webView = bridge.getWebView();
      if (webView != null) {
        webView.clearCache(true);
        webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
      }
    }
  }
}
