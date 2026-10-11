package com.styleshopz.app;
import android.os.Bundle;
import android.os.Environment;
import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
public class MainActivity extends BridgeActivity {
  private boolean networkConnected() {
    ConnectivityManager manager=(ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE);
    NetworkCapabilities capabilities=manager.getNetworkCapabilities(manager.getActiveNetwork());
    return capabilities!=null&&capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
  }
  private void showRecovery(WebView view) {
    try (InputStream input=getAssets().open("public/offline.html"); ByteArrayOutputStream output=new ByteArrayOutputStream()) {
      byte[] chunk=new byte[4096]; int count;
      while((count=input.read(chunk))!=-1)output.write(chunk,0,count);
      String html=new String(output.toByteArray(),StandardCharsets.UTF_8);
      view.post(()->{view.stopLoading();view.loadDataWithBaseURL(null,html,"text/html","UTF-8",null);});
    } catch(Exception error) { Toast.makeText(this,"Reconnect and reopen styleshopZ.",Toast.LENGTH_LONG).show(); }
  }
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    bridge.setWebViewClient(new BridgeWebViewClient(bridge){
      @Override @SuppressWarnings("deprecation") public void onReceivedError(WebView view,int code,String description,String failingUrl){showRecovery(view);}
      @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){
        if(request.isForMainFrame())showRecovery(view);else super.onReceivedError(view,request,error);
      }
      @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){
        if(request.isForMainFrame()&&response.getStatusCode()>=500)showRecovery(view);else super.onReceivedHttpError(view,request,response);
      }
      @Override public void onPageFinished(WebView view,String url){
        super.onPageFinished(view,url);
        if(url.startsWith("chrome-error:"))showRecovery(view);
      }
    });
    if(!networkConnected())showRecovery(bridge.getWebView());
    getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
      @Override public void handleOnBackPressed(){if(bridge.getWebView().canGoBack())bridge.getWebView().goBack();else moveTaskToBack(true);}
    });
    bridge.getWebView().setDownloadListener((url,userAgent,disposition,mime,length)->{
      Uri uri=Uri.parse(url);
      if(!"https".equals(uri.getScheme())||!"styleshopz.srimantasutapa123.workers.dev".equals(uri.getHost()))return;
      try{
        String name="styleshopz-"+System.currentTimeMillis()+(mime!=null&&mime.contains("pdf")?".pdf":".json");
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
