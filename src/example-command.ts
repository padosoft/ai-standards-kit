#!/usr/bin/env node
/**
 * Example Node.js command following Surface SRL enterprise standards
 * Demonstrates all required features: ASCII art, logging, help, test mode
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { format } from 'date-fns';

interface CommandConfig {
  apiUrl?: string;
  timeout?: number;
  verbose?: boolean;
  environment?: string;
}

// Banner with ASCII art (purple color)
function showBanner() {
  console.log('\x1b[95m' + `
▄▀█ █   █▀ ▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄ █▀
█▀█ █   ▄█  █  █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀ ▄█

█▀▀ ▀▄▀ ▄▀█ █▀▄▀█ █▀█ █░░ █▀▀   ▀█▀ ▄▀█ █▀ █▄▀
██▄ █░█ █▀█ █░▀░█ █▀▀ █▄▄ ██▄   ░█░ █▀█ ▄█ █░█
🤖 Enterprise Node.js Command Example
   by Surface SRL
  ` + '\x1b[0m');
}

// Professional logging class
class Logger {
  private verbose: boolean;
  private startTime: Date;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
    this.startTime = new Date();
  }

  start(message: string) {
    console.log(chalk.cyan('🚀 ') + chalk.bold(message));
    console.log(chalk.gray(`   Started at: ${format(this.startTime, 'yyyy-MM-dd HH:mm:ss')}`));
  }

  success(message: string) {
    console.log(chalk.green('✅ ') + message);
  }

  error(message: string) {
    console.log(chalk.red('❌ ') + message);
  }

  warning(message: string) {
    console.log(chalk.yellow('⚠️  ') + message);
  }

  info(message: string) {
    console.log(chalk.blue('ℹ️  ') + message);
  }

  debug(message: string) {
    if (this.verbose) {
      console.log(chalk.gray('🔍 ') + chalk.dim(message));
    }
  }

  config(label: string, value: any) {
    console.log(chalk.magenta('⚙️  ') + chalk.bold(label + ':') + ' ' + chalk.cyan(String(value)));
  }

  httpRequest(method: string, url: string, responseTime: number) {
    if (this.verbose) {
      console.log(chalk.gray('🌐 ') + chalk.dim(`${method} ${url} (${responseTime}ms)`));
    }
  }

  httpResponse(status: number, data: any) {
    if (this.verbose) {
      const statusColor = status >= 200 && status < 300 ? chalk.green : chalk.red;
      console.log(chalk.gray('📡 ') + statusColor(`${status} `) + chalk.dim(JSON.stringify(data, null, 2)));
    }
  }

  finish() {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    console.log(chalk.cyan('🏁 ') + chalk.bold('Command completed'));
    console.log(chalk.gray(`   Finished at: ${format(endTime, 'yyyy-MM-dd HH:mm:ss')}`));
    console.log(chalk.gray(`   Duration: ${duration}ms`));
  }
}

// Configuration management
function loadConfig(): CommandConfig {
  return {
    apiUrl: process.env.API_URL || 'https://api.example.com',
    timeout: parseInt(process.env.TIMEOUT || '5000'),
    verbose: process.env.VERBOSE === 'true',
    environment: process.env.NODE_ENV || 'development'
  };
}

// HTTP request with logging (simulated)
async function makeRequest(url: string, logger: Logger): Promise<any> {
  const startTime = Date.now();
  logger.httpRequest('GET', url, 0);
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const responseTime = Date.now() - startTime;
    const mockData = { status: 'success', timestamp: new Date().toISOString() };
    
    logger.httpRequest('GET', url, responseTime);
    logger.httpResponse(200, mockData);
    
    return mockData;
  } catch (error) {
    logger.error(`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Process data command
async function processDataCommand(options: any, command: any) {
  // Merge global options with command options
  const globalOptions = command.parent?.opts() || {};
  const mergedOptions = { ...globalOptions, ...options };
  const logger = new Logger(mergedOptions.verbose);
  showBanner();
  
  logger.start('Processing data command started');
  
  try {
    const config = loadConfig();
    
    // Show configuration
    logger.config('API URL', config.apiUrl);
    logger.config('Timeout', config.timeout);
    logger.config('Environment', config.environment);
    logger.config('Verbose Mode', mergedOptions.verbose || false);
    logger.config('Test Mode', mergedOptions.test || false);
    logger.config('Input File', mergedOptions.input || 'none');
    
    if (mergedOptions.test) {
      logger.info('Running in TEST mode - no destructive operations will be performed');
    }
    
    // Command logic
    logger.debug('Validating input parameters...');
    
    if (mergedOptions.input) {
      logger.debug(`Reading input file: ${mergedOptions.input}`);
      logger.info(`Input file validated: ${mergedOptions.input}`);
    }
    
    if (!mergedOptions.test) {
      // Real execution
      logger.debug('Making API request...');
      const result = await makeRequest(config.apiUrl + '/process', logger);
      logger.success(`Data processed successfully. Result ID: ${result.timestamp}`);
    } else {
      // Test execution
      logger.info('Simulating API request...');
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.success('Test completed successfully - no changes made');
    }
    
  } catch (error) {
    logger.error(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  } finally {
    logger.finish();
  }
}

// Deploy command
async function deployCommand(options: any, command: any) {
  // Merge global options with command options
  const globalOptions = command.parent?.opts() || {};
  const mergedOptions = { ...globalOptions, ...options };
  const logger = new Logger(mergedOptions.verbose);
  showBanner();
  
  logger.start('Deploy command started');
  
  try {
    const config = loadConfig();
    
    logger.config('Target Environment', mergedOptions.env || 'staging');
    logger.config('Dry Run', mergedOptions.dryRun || false);
    logger.config('Test Mode', mergedOptions.test || false);
    
    if (mergedOptions.test) {
      logger.info('Running in TEST mode - no deployment will occur');
    }
    
    logger.debug('Validating deployment configuration...');
    logger.info('Configuration validated successfully');
    
    if (!mergedOptions.test && !mergedOptions.dryRun) {
      logger.warning('This will deploy to production. Continue? (simulation)');
      logger.success('Deployment completed successfully');
    } else {
      logger.success('Dry run completed - no actual deployment performed');
    }
    
  } catch (error) {
    logger.error(`Deploy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  } finally {
    logger.finish();
  }
}

// CLI setup
function createCLI() {
  const program = new Command();

  program
    .name('example-task')
    .alias('ex')
    .description('Enterprise Node.js command example with full logging and testing')
    .version('1.0.0')
    .option('-v, --verbose', 'Enable verbose logging for debugging')
    .option('-t, --test', 'Run in test mode without making changes')
    .option('-c, --config <path>', 'Path to configuration file');

  // Process data command
  program
    .command('process')
    .description('Process data from input source')
    .option('-i, --input <file>', 'Input file path')
    .option('-o, --output <file>', 'Output file path')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-t, --test', 'Run in test mode without making changes')
    .action(processDataCommand);

  // Deploy command
  program
    .command('deploy')
    .description('Deploy application to target environment')
    .option('-e, --env <environment>', 'Target environment (staging/production)', 'staging')
    .option('-d, --dry-run', 'Perform dry run without actual deployment')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-t, --test', 'Run in test mode without making changes')
    .action(deployCommand);

  // Help command with comprehensive examples
  program
    .command('help')
    .description('Show detailed help with examples')
    .action(() => {
      showBanner();
      console.log(chalk.bold('\n📋 EXAMPLE TASK COMMAND REFERENCE\n'));
      
      console.log(chalk.cyan('🌐 GLOBAL INSTALLATION:'));
      console.log('npm install -g @surface/example-task');
      console.log('example-task process --input data.json --verbose');
      console.log('ex deploy --env production --test    ' + chalk.gray('# short alias'));
      console.log('');
      
      console.log(chalk.blue('📁 LOCAL INSTALLATION:'));
      console.log('npm install @surface/example-task');
      console.log('node dist/example-command.js process --input data.json');
      console.log('npm run cli process --input data.json');
      console.log('');
      
      console.log(chalk.yellow('🧪 TESTING:'));
      console.log('example-task process --test --verbose');
      console.log('example-task deploy --test --dry-run');
      console.log('');
      
      console.log(chalk.green('⚙️  CONFIGURATION:'));
      console.log('export API_URL=https://api.production.com');
      console.log('export TIMEOUT=10000');
      console.log('export VERBOSE=true');
      console.log('');
      
      console.log(chalk.magenta('📝 EXAMPLES:'));
      console.log('# Process data with verbose logging');
      console.log('example-task process --input data.json --verbose');
      console.log('');
      console.log('# Test deployment without changes');
      console.log('example-task deploy --env production --test --verbose');
      console.log('');
      console.log('# Dry run deployment');
      console.log('example-task deploy --env production --dry-run');
      console.log('');
      
      console.log(chalk.cyan('📞 SUPPORT:'));
      console.log('GitHub: https://github.com/surface-srl/example-task');
      console.log('Issues: https://github.com/surface-srl/example-task/issues');
      console.log('Email: support@surface-srl.com');
    });

  return program;
}

// Module detection for both global and local execution
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]) ||
                     process.argv[1].endsWith('example-command.js');

if (isMainModule) {
  const program = createCLI();
  program.parse();
}

export { createCLI, Logger, showBanner };