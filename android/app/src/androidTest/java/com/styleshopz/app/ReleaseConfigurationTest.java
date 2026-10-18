package com.styleshopz.app;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.graphics.Point;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ReleaseConfigurationTest {
    private Context context() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    private String asset(String path) throws Exception {
        try (InputStream input = context().getAssets().open(path);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[4096];
            int count;
            while ((count = input.read(chunk)) != -1) output.write(chunk, 0, count);
            return new String(output.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    @Test
    public void signedReleaseHasExpectedIdentityAndPrivateAppData() throws Exception {
        assertEquals("com.styleshopz.app", context().getPackageName());
        ApplicationInfo info = context().getApplicationInfo();
        assertEquals(0, info.flags & ApplicationInfo.FLAG_DEBUGGABLE);
        assertEquals(0, info.flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        assertEquals(0, info.flags & ApplicationInfo.FLAG_USES_CLEARTEXT_TRAFFIC);
        assertTrue(info.targetSdkVersion >= 36);
    }

    @Test
    public void remoteShopUsesHttpsWithoutMixedContentOrWebDebugging() throws Exception {
        JSONObject config = new JSONObject(asset("capacitor.config.json"));
        JSONObject server = config.getJSONObject("server");
        assertEquals("https://styleshopz.srimantasutapa123.workers.dev", server.getString("url"));
        assertFalse(server.getBoolean("cleartext"));
        assertEquals("https", server.getString("androidScheme"));
        assertEquals("offline.html", server.getString("errorPath"));
        JSONObject android = config.getJSONObject("android");
        assertFalse(android.getBoolean("allowMixedContent"));
        assertFalse(android.getBoolean("webContentsDebuggingEnabled"));
    }

    @Test
    public void offlineRecoveryIsBundledAndPointsBackToTheTrustedShop() throws Exception {
        String offline = asset("public/offline.html");
        assertTrue(offline.contains("Try the shop again"));
        assertTrue(offline.contains("https://styleshopz.srimantasutapa123.workers.dev"));
        assertTrue(offline.contains("data:image/png;base64,"));
        assertFalse(offline.contains("<script"));
    }

    @Test
    public void permissionsSupportOptionalLocationWithoutBroadDeviceAccess() throws Exception {
        PackageInfo info = context().getPackageManager().getPackageInfo(context().getPackageName(), PackageManager.GET_PERMISSIONS);
        List<String> permissions = Arrays.asList(info.requestedPermissions);
        assertTrue(permissions.contains("android.permission.INTERNET"));
        assertTrue(permissions.contains("android.permission.ACCESS_FINE_LOCATION"));
        assertTrue(permissions.contains("android.permission.ACCESS_COARSE_LOCATION"));
        assertFalse(permissions.contains("android.permission.READ_CONTACTS"));
        assertFalse(permissions.contains("android.permission.READ_SMS"));
        assertFalse(permissions.contains("android.permission.ACCESS_BACKGROUND_LOCATION"));
        assertFalse(permissions.contains("android.permission.MANAGE_EXTERNAL_STORAGE"));
    }

    @Test
    public void appFileProviderCannotBeAccessedWithoutExplicitGrant() throws Exception {
        ProviderInfo provider = context().getPackageManager().resolveContentProvider("com.styleshopz.app.fileprovider", 0);
        assertNotNull(provider);
        assertFalse(provider.exported);
        assertTrue(provider.grantUriPermissions);
    }

    @Test
    public void shopContentStaysInsideSystemBars() {
        Intent intent = new Intent(context(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        MainActivity activity = (MainActivity) InstrumentationRegistry.getInstrumentation().startActivitySync(intent);
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        View root = activity.findViewById(android.R.id.content);
        WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(root);
        assertNotNull(windowInsets);
        Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        assertTrue("Status bar inset should be present", bars.top > 0);
        int[] origin = new int[2];
        root.getLocationOnScreen(origin);
        assertTrue("Content must start below the status bar: origin=" + origin[1] + " padding=" + root.getPaddingTop(),
                origin[1] + root.getPaddingTop() >= bars.top);
        Point screen = new Point();
        activity.getWindowManager().getDefaultDisplay().getRealSize(screen);
        assertTrue("Content must finish above navigation",
                origin[1] + root.getHeight() - root.getPaddingBottom() <= screen.y - bars.bottom);
        activity.finish();
    }
}
