'use strict';

const docker = require('../../../../docker'),
      errors = require('../../../../errors'),
      health = require('../../health'),
      shared = require('../../shared'),
      start = require('../../start'),
      stop = require('../../stop');

const cli = async function ({ directory, env, configuration }, progress) {
  if (!directory) {
    throw new Error('Directory is missing.');
  }
  if (!env) {
    throw new Error('Environment is missing.');
  }
  if (!configuration) {
    throw new Error('Configuration is missing.');
  }
  if (!progress) {
    throw new Error('Progress is missing.');
  }

  await shared.checkDocker({ configuration, env }, progress);

  progress({ message: `Verifying health on environment ${env}...`, type: 'info' });
  await health({ directory, env }, progress);

  progress({ message: 'Verifying application status...', type: 'info' });
  const existingContainers = await docker.getContainers({
    configuration,
    env,
    where: { label: { 'wolkenkit-application': configuration.application }}
  });

  if (existingContainers.length === 0) {
    progress({ message: `The application is not running.`, type: 'info' });
    throw new errors.ApplicationNotRunning();
  }

  const dangerouslyExposeHttpPort = existingContainers[0].labels['wolkenkit-dangerously-expose-http-port'] === 'true',
        debug = existingContainers[0].labels['wolkenkit-debug'] === 'true',
        persistData = existingContainers[0].labels['wolkenkit-persist-data'] === 'true',
        port = Number(existingContainers[0].labels['wolkenkit-api-port']),
        sharedKey = existingContainers[0].labels['wolkenkit-shared-key'];

  progress({ message: `Stopping the application on environment ${env}...`, type: 'info' });
  await stop({ directory, env, dangerouslyDestroyData: false }, progress);

  progress({ message: `Starting the application on environment ${env}...`, type: 'info' });
  await start({
    directory,
    env,
    dangerouslyDestroyData: false,
    dangerouslyExposeHttpPort,
    debug,
    port,
    sharedKey,
    persist: persistData
  }, progress);
};

module.exports = cli;
