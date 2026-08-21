package com.asthxx.mindspeak;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class NativeTTSPlugin {
    public static void register(Bridge bridge) {
        bridge.registerPlugin(NativeTTS.class);
    }
}
