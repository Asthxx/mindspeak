package com.mindspeak.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Lifecycle;
import android.util.Log;

@CapacitorPlugin(name = "HttpServer")
public class HttpServerPlugin extends Plugin {
    private static final String TAG = "HttpServerPlugin";
    private volatile NanoHTTPDServer server;
    private static final int PORT = 3000;

    @PluginMethod
    public void startServer(PluginCall call) {
        if (server != null && server.isAlive()) {
            call.resolve(makeResponse(true, "already running"));
            return;
        }
        try {
            server = new NanoHTTPDServer(getContext(), PORT);
            call.resolve(makeResponse(true, "started on port " + PORT));
        } catch (Exception e) {
            Log.e(TAG, "Failed to start server", e);
            call.reject("Failed to start server: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        if (server != null) {
            server.shutdown();
            server = null;
        }
        call.resolve(makeResponse(true, "stopped"));
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        NanoHTTPDServer s = server;
        ret.put("running", s != null && s.isAlive());
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        if (server != null) {
            server.shutdown();
            server = null;
        }
    }

    private JSObject makeResponse(boolean ok, String message) {
        JSObject ret = new JSObject();
        ret.put("ok", ok);
        ret.put("message", message);
        return ret;
    }
}
