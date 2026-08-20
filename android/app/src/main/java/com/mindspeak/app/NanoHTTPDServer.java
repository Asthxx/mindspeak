package com.mindspeak.app;

import android.content.Context;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import java.io.IOException;
import java.util.Locale;
import fi.iki.elonen.NanoHTTPD;

public class NanoHTTPDServer extends NanoHTTPD implements TextToSpeech.OnInitListener {
    private static final String TAG = "MindSpeakServer";
    private Context context;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    public NanoHTTPDServer(Context context, int port) throws IOException {
        super(port);
        this.context = context;
        this.tts = new TextToSpeech(context, this);
        start(NanoHTTPD.SOCKET_TIMEOUT, false);
        Log.i(TAG, "Server started on port " + port);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            ttsReady = true;
            tts.setLanguage(Locale.US);
            Log.i(TAG, "TTS initialized");
        }
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        Method method = session.getMethod();

        if ("/api/health".equals(uri)) {
            return newFixedLengthResponse(Response.Status.OK, "application/json",
                "{\"ok\":true,\"server\":\"nanohttpd\",\"tts\":" + ttsReady + "}");
        }

        if ("/api/tts".equals(uri) && Method.POST.equals(method)) {
            return handleTTS(session);
        }

        if ("/api/log".equals(uri) && Method.POST.equals(method)) {
            return handleLog(session);
        }

        return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found");
    }

    private Response handleTTS(IHTTPSession session) {
        try {
            java.util.Map<String, String> body = new java.util.HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            if (jsonBody == null) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                    "{\"ok\":false,\"error\":\"missing body\"}");
            }

            String text = extractJsonString(jsonBody, "text");
            String lang = extractJsonString(jsonBody, "lang");
            if (text == null || text.isEmpty()) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                    "{\"ok\":false,\"error\":\"missing text\"}");
            }

            if (!ttsReady) {
                return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, "application/json",
                    "{\"ok\":false,\"error\":\"tts not ready\"}");
            }

            if (lang != null && lang.startsWith("zh")) {
                tts.setLanguage(Locale.CHINESE);
            } else {
                tts.setLanguage(Locale.US);
            }

            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mindspeak_tts");
            return newFixedLengthResponse(Response.Status.OK, "application/json",
                "{\"ok\":true,\"message\":\"speaking\"}");

        } catch (Exception e) {
            Log.e(TAG, "TTS error", e);
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json",
                "{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private Response handleLog(IHTTPSession session) {
        try {
            java.util.Map<String, String> body = new java.util.HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            if (jsonBody != null) {
                Log.d("MindSpeak", jsonBody);
            }
            return newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true}");
        } catch (Exception e) {
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json",
                "{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private String extractJsonString(String json, String key) {
        String pattern = "\"" + key + "\"";
        int idx = json.indexOf(pattern);
        if (idx < 0) return null;
        int colonIdx = json.indexOf(':', idx + pattern.length());
        if (colonIdx < 0) return null;
        int startQuote = json.indexOf('"', colonIdx + 1);
        if (startQuote < 0) return null;
        int endQuote = json.indexOf('"', startQuote + 1);
        if (endQuote < 0) return null;
        return json.substring(startQuote + 1, endQuote);
    }

    public void shutdown() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        stop();
    }
}
