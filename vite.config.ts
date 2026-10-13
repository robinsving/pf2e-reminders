import copy from "rollup-plugin-copy";
import { defineConfig } from "vite";

export default defineConfig({
    esbuild: {
        minifyIdentifiers: false, // Turning this on will cause mangling with Foundry
    },
    build: {
        outDir: "./dist",
        sourcemap: true,
        rollupOptions: {
            input: {
                control: "./reminders/reminders.js"
            },
            output: {
                entryFileNames: 'reminders/entry-[name].js',
                format: "es",
            },
        },
    },
    plugins: [
        copy({
            targets: [
                { src: "./module.json", dest: "dist" },
                { src: "./styles", dest: "dist" },
                { src: "./lang", dest: "dist" },
                { src: "./templates", dest: "dist" },
            ],
            hook: "writeBundle",
        }),
    ],
    test: {
        environment: "jsdom",
        include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        globals: true,
        setupFiles: "./vitest.setup.js",
    },
});
