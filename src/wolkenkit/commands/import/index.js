'use strict';

const path = require('path');

const checkImportDirectory = require('./checkImportDirectory'),
      docker = require('../../../docker'),
      errors = require('../../../errors'),
      health = require('../health'),
      importEventStore = require('./importEventStore'),
      noop = require('../../../noop'),
      runtimes = require('../../runtimes'),
      shared = require('../shared');

const importCommand = async function ({
  directory,
  env,
  from,
  toEventStore
}, progress = noop) {
  if (!directory) {
    throw new Error('Directory is missing.');
  }
  if (!env) {
    throw new Error('Environment is missing.');
  }
  if (!from) {
    throw new Error('From is missing.');
  }
  if (toEventStore === undefined) {
    throw new Error('To event store is missing.');
  }

  const configuration = await shared.getConfiguration({
    env,
    directory,
    isPackageJsonRequired: false
  }, progress);

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

  const { version } = configuration.runtime;

  const dangerouslyExposeHttpPort = existingContainers[0].labels['wolkenkit-dangerously-expose-http-port'] === 'true',
        debug = existingContainers[0].labels['wolkenkit-debug'] === 'true',
        persistData = existingContainers[0].labels['wolkenkit-persist-data'] === 'true',
        sharedKey = existingContainers[0].labels['wolkenkit-shared-key'];

  const containers = await runtimes.getContainers({
    forVersion: version,
    configuration,
    env,
    sharedKey,
    persistData,
    dangerouslyExposeHttpPort,
    debug
  });

  if (existingContainers.length < containers.length) {
    progress({ message: `The application is partially running.`, type: 'info' });
    throw new errors.ApplicationPartiallyRunning();
  }

  const importDirectory = path.isAbsolute(from) ? from : path.join(directory, from);

  await checkImportDirectory({ importDirectory, toEventStore }, progress);

  if (toEventStore) {
    await importEventStore({
      configuration,
      env,
      sharedKey,
      containers,
      importDirectory
    }, progress);
  }
};

module.exports = importCommand;
