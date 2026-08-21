### Task 1.1: Install Capacitor Dependencies

**Files:**
- Modified: `package.json`

- [ ] **Step 1: Write the failing test**

Create `tests/android/capacitor-config.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

describe('Capacitor 依赖配置', () => {
  it('should_have_capacitor_cli_in_devDependencies', () => {
    expect(pkg.devDependencies['@capacitor/cli']).toBeDefined();
  });

  it('should_have_capacitor_core_in_devDependencies', () => {
    expect(pkg.devDependencies['@capacitor/core']).toBeDefined();
  });

  it('should_have_capacitor_android_in_devDependencies', () => {
    expect(pkg.devDependencies['@capacitor/android']).toBeDefined();
  });

  it('should_have_local_notifications_plugin', () => {
    expect(pkg.devDependencies['@capacitor/local-notifications']).toBeDefined();
  });

  it('should_have_status_bar_plugin', () => {
    expect(pkg.devDependencies['@capacitor/status-bar']).toBeDefined();
  });

  it('should_have_navigation_bar_plugin', () => {
    expect(pkg.devDependencies['@capgo/capacitor-navigation-bar']).toBeDefined();
  });

  it('should_have_android_build_script', () => {
    expect(pkg.scripts['android:build']).toBeDefined();
  });

  it('should_have_android_release_script', () => {
    expect(pkg.scripts['android:release']).toBeDefined();
  });

  it('should_have_android_dev_script', () => {
    expect(pkg.scripts['android:dev']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: FAIL — `@capacitor/cli` not in devDependencies

- [ ] **Step 3: Install Capacitor packages**

```bash
npm install --save-dev @capacitor/cli@^8.5.0 @capacitor/core@^8.5.0 @capacitor/android@^8.5.0 @capacitor/local-notifications@^8.3.1 @capacitor/status-bar@^8.0.3 @capgo/capacitor-navigation-bar@^8.2.6
```

- [ ] **Step 4: Convert Tauri keystore to Android format**

The existing `mindspeak-keystore.p12` is PKCS12 format (for Tauri). Android requires JKS format. Convert:

```bash
keytool -importkeystore -srckeystore mindspeak-keystore.p12 -srcstoretype PKCS12 -destkeystore mindspeak.jks -deststoretype JKS
```

If the keystore has no password, use empty password prompts. Move `mindspeak.jks` to project root.

- [ ] **Step 5: Add build scripts to package.json**

Add to `"scripts"`:
```json
"android:build": "npm run build && npx cap sync android && cd android && gradlew.bat assembleDebug",
"android:release": "npm run build && npx cap sync android && cd android && gradlew.bat assembleRelease",
"android:dev": "npx cap open android"
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: PASS (9 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tests/android/capacitor-config.test.js
git commit -m "feat: install Capacitor 8.5.0 dependencies and build scripts"
```
