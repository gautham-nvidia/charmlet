import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './src/test',
	testMatch: 'extension.test.ts',
	timeout: 120000,
	workers: 1,
	fullyParallel: false,
	reporter: 'list',
	outputDir: 'test-results',
});