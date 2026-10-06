import { defineConfig } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const customHost = process.env.CHARMLET_TEST_HOST;
if (customHost && (!process.env.VSCODE_EXECUTABLE || process.env.VSCODE_TEST_VERSION)) {
	throw new Error('CHARMLET_TEST_HOST requires VSCODE_EXECUTABLE and no VSCODE_TEST_VERSION.');
}
const testHost = customHost || process.env.VSCODE_TEST_VERSION || 'installed';
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(testHost)) {
	throw new Error('The test host label must be a safe folder name.');
}

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
	outputDir: `test-results/${testHost}`,
});