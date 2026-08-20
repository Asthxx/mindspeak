import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
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
