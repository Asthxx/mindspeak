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
