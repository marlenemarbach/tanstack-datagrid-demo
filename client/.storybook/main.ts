import type { StorybookConfig } from '@storybook/react-vite'
import react from '@vitejs/plugin-react'
import { mergeConfig } from 'vite'

/** Storybook only; the app itself is bundled and served by Bun. */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  viteFinal: (config) => mergeConfig(config, { plugins: [react()] }),
}

export default config
