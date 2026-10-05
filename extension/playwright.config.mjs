import { defineConfig } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

if (process.env.VSCODE_TEST_VERSION) {
	process.env.VSCODE_EXECUTABLE = await downloadAndUnzipVSCode(process.env.VSCODE_TEST_VERSION);
}

export default defineConfig({
	testDir: './src/test',
	testMatch: 'extension.test.ts',
	timeout: 120000,
	workers: 1,
	fullyParallel: false,
	reporter: 'list',
	outputDir: `test-results/${process.env.VSCODE_TEST_VERSION ?? 'installed'}`,
});