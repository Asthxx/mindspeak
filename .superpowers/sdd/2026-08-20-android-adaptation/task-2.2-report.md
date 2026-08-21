### Task 2.2: Write Capacitor Plugin Bridge — Report

**Status:** DONE

**Commit:** `5047d32` feat: add Capacitor HttpServer plugin bridge

**Summary:** Created `HttpServerPlugin.java` with `startServer`, `stopServer`, and `isRunning` methods wrapped in `@CapacitorPlugin(name = "HttpServer")`. The plugin manages a `NanoHTTPDServer` instance on port 3000 and exposes it to the WebView via `window.Capacitor.Plugins.HttpServer`.

**Concerns:** None.
