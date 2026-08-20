package com.mindspeak.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.mindspeak.app.HttpServerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HttpServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
