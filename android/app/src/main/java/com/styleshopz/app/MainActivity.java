package com.styleshopz.app;
import android.os.Bundle;
import android.os.Environment;
import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.webkit.CookieManager;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
      @Override public void handleOnBackPressed(){if(bridge.getWebView().canGoBack())bridge.getWebView().goBack();else moveTaskToBack(true);}
    });
    bridge.getWebView().setDownloadListener((url,userAgent,disposition,mime,length)->{
      Uri uri=Uri.parse(url);
      if(!"https".equals(uri.getScheme())||!"styleshopz.srimantasutapa123.workers.dev".equals(uri.getHost()))return;
      try{
        String name="styleshopz-"+System.currentTimeMillis()+(mime.contains("pdf")?".pdf":".json");
        DownloadManager.Request request=new DownloadManager.Request(uri);
        String cookies=CookieManager.getInstance().getCookie(url);
        if(cookies!=null)request.addRequestHeader("Cookie",cookies);
        request.addRequestHeader("User-Agent",userAgent);
        request.setMimeType(mime);request.setTitle(name);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalFilesDir(this,Environment.DIRECTORY_DOWNLOADS,name);
        ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(request);
        Toast.makeText(this,"Download started. Open it from notifications.",Toast.LENGTH_LONG).show();
      }catch(Exception e){Toast.makeText(this,"Could not download. Please retry.",Toast.LENGTH_LONG).show();}
    });
  }
}
