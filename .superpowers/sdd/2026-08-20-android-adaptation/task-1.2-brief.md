### Task 1.2: Create Capacitor Config

**Files:**
- Create: `capacitor.config.ts`
- Test: `tests/android/capacitor-config.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/android/capacitor-config.test.js`:

```javascript
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const configPath = resolve(ROOT, 'capacitor.config.ts');
const configExists = (() => {
  try { readFileSync(configPath, 'utf8'); return true; } catch { return false; }
})();

describe('Capacitor 配置文件', () => {
  it('should_have_capacitor_config_ts', () => {
    expect(configExists).toBe(true);
  });

  if (configExists) {
    const configContent = readFileSync(configPath, 'utf8');

    it('should_have_appId_com_mindspeak_app', () => {
      expect(configContent).toContain("appId: 'com.mindspeak.app'");
    });

    it('should_have_appName_MindSpeak', () => {
      expect(configContent).toContain("appName: 'MindSpeak'");
    });

    it('should_have_webDir_dist', () => {
      expect(configContent).toContain("webDir: 'dist'");
    });

    it('should_have_https_android_scheme', () => {
      expect(configContent).toContain("androidScheme: 'https'");
    });

    it('should_have_cleartext_enabled', () => {
      expect(configContent).toContain('cleartext: true');
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: FAIL — `capacitor.config.ts` not found

- [ ] **Step 3: Create capacitor.config.ts**

Create `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindspeak.app',
  appName: 'MindSpeak',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: 'mindspeak.jks',
      keystoreAlias: 'mindspeak',
    }
  }
};

export default config;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: PASS (15 tests — 9 from Task 1.1 + 6 new)

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.ts tests/android/capacitor-config.test.js
git commit -m "feat: add Capacitor config with appId, webDir, and server settings"
```
