package com.asthxx.mindspeak;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.content.Context;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "NativeTTS")
public class NativeTTS extends Plugin implements TextToSpeech.OnInitListener {
    private static final String TAG = "NativeTTS";
    private TextToSpeech tts;
    private boolean ready = false;
    private String pendingText = null;
    private String pendingLang = null;
    private float pendingRate = 1.0f;

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "zh-CN");
        float rate = call.getFloat("rate", 1.0f).floatValue();

        if (text.isEmpty()) {
            call.reject("text is empty");
            return;
        }

        if (ready) {
            doSpeak(text, lang, rate);
            call.resolve();
        } else {
            pendingText = text;
            pendingLang = lang;
            pendingRate = rate;
            initTTS();
            call.resolve();
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            tts.stop();
        }
        call.resolve();
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        JSObject result = new JSObject();
        // Android TTS doesn't expose voice list the same way as web SpeechSynthesis
        // Return empty array; JS side handles fallback
        result.put("voices", new Object[]{});
        call.resolve(result);
    }

    private void initTTS() {
        if (tts != null) return;
        Context ctx = getContext();
        if (ctx == null) return;
        tts = new TextToSpeech(ctx, this);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            ready = true;
            Log.d(TAG, "TTS initialized");
            if (pendingText != null) {
                doSpeak(pendingText, pendingLang, pendingRate);
                pendingText = null;
            }
        } else {
            Log.e(TAG, "TTS init failed: " + status);
        }
    }

    private void doSpeak(String text, String lang, float rate) {
        if (tts == null) return;

        Locale locale = parseLocale(lang);
        tts.setLanguage(locale);
        tts.setSpeechRate(rate);

        Map<String, String> params = new HashMap<>();
        params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "mindspeak_" + System.currentTimeMillis());

        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {
                Log.d(TAG, "speak start: " + utteranceId);
            }

            @Override
            public void onDone(String utteranceId) {
                Log.d(TAG, "speak done: " + utteranceId);
            }

            @Override
            public void onError(String utteranceId) {
                Log.e(TAG, "speak error: " + utteranceId);
            }
        });

        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, params.get(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID));
    }

    private Locale parseLocale(String lang) {
        if (lang == null || lang.isEmpty()) return Locale.US;
        String[] parts = lang.split("[-_]");
        if (parts.length >= 2) {
            return new Locale(parts[0], parts[1]);
        } else if (parts.length == 1) {
            return new Locale(parts[0]);
        }
        return Locale.US;
    }

    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
    }
}
