/**
 * @padosoft/ai-standards
 *
 * Enterprise AI Standards - Single Source of Truth (SSOT)
 *
 * This package contains:
 * - agents/     : Claude agents and sub-agents definitions
 * - docs/       : Standards documentation by stack
 * - config/     : Quality gates and settings
 * - scripts/    : Debug and utility scripts
 *
 * Usage:
 *   import { getStandardsPath, loadSettings } from '@padosoft/ai-standards';
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the root path of the standards package
 * @returns {string} Absolute path to standards root
 */
export function getStandardsPath() {
  return __dirname;
}

/**
 * Get path to a specific standards directory
 * @param {'agents' | 'docs' | 'config' | 'scripts'} type
 * @returns {string} Absolute path to directory
 */
export function getPath(type) {
  return join(__dirname, type);
}

/**
 * Load the main settings.json configuration
 * @returns {object} Parsed settings object
 */
export function loadSettings() {
  const settingsPath = join(__dirname, 'config', 'settings.json');
  if (!existsSync(settingsPath)) {
    throw new Error(`Settings not found: ${settingsPath}`);
  }
  return JSON.parse(readFileSync(settingsPath, 'utf-8'));
}

/**
 * Load quality gates from settings
 * @returns {object} Quality gates configuration
 */
export function loadQualityGates() {
  const settings = loadSettings();
  return settings.quality_gates || {};
}

/**
 * Get path to a specific agent file
 * @param {string} category - Agent category (e.g., 'global', 'detective', 'cloudflare')
 * @param {string} name - Agent name (e.g., 'task-router', 'coder')
 * @returns {string} Absolute path to agent markdown file
 */
export function getAgentPath(category, name) {
  return join(__dirname, 'agents', category, `${name}.md`);
}

/**
 * Get path to a specific standard document
 * @param {string} stack - Stack name (e.g., 'global', 'php-laravel', 'ts-hono')
 * @param {string} name - Document name (e.g., 'coding-guidelines', 'testing')
 * @returns {string} Absolute path to standard markdown file
 */
export function getStandardPath(stack, name) {
  return join(__dirname, 'docs', 'standards', stack, `${name}.md`);
}

/**
 * Load an agent's content as string
 * @param {string} category
 * @param {string} name
 * @returns {string} Agent markdown content
 */
export function loadAgent(category, name) {
  const path = getAgentPath(category, name);
  if (!existsSync(path)) {
    throw new Error(`Agent not found: ${category}/${name}`);
  }
  return readFileSync(path, 'utf-8');
}

/**
 * Load a standard document's content as string
 * @param {string} stack
 * @param {string} name
 * @returns {string} Standard markdown content
 */
export function loadStandard(stack, name) {
  const path = getStandardPath(stack, name);
  if (!existsSync(path)) {
    throw new Error(`Standard not found: ${stack}/${name}`);
  }
  return readFileSync(path, 'utf-8');
}

export default {
  getStandardsPath,
  getPath,
  loadSettings,
  loadQualityGates,
  getAgentPath,
  getStandardPath,
  loadAgent,
  loadStandard,
};
