// build.mjs — esbuild 建構腳本
import * as esbuild from 'esbuild';
import { mkdirSync, existsSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

// 確保 dist 目錄存在
if (!existsSync('dist')) {
  mkdirSync('dist');
}

// === Bundle 1: 主應用程式 ===
const mainBuild = await esbuild.build({
  entryPoints: ['js/app.js'],
  bundle: true,
  format: 'esm',
  splitting: false,
  minify: !isDev,
  sourcemap: isDev,
  outfile: 'dist/bundle.js',
  target: ['es2020'],
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
  },
  logLevel: 'info',
});

// === Bundle 2: SW（Service Worker 需要獨立 bundle）===
const swBuild = await esbuild.build({
  entryPoints: ['sw.js'],
  bundle: true,
  format: 'iife',
  minify: !isDev,
  outfile: 'dist/sw-bundle.js',
  target: ['es2020'],
  logLevel: 'info',
});

if (isWatch) {
  console.log('👀 Watch mode, watching for changes...');
  const ctx = await esbuild.context({
    entryPoints: ['js/app.js', 'sw.js'],
    bundle: true,
    format: 'esm',
    splitting: false,
    minify: !isDev,
    sourcemap: isDev,
    outdir: 'dist',
    target: ['es2020'],
  });
  await ctx.watch();
} else {
  console.log('✅ Build 完成 → dist/');
}
