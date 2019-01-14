'use strict';

const difference = require('lodash/difference'),
      remove = require('lodash/remove');

const docker = require('../../../docker'),
      runtimes = require('../../runtimes'),
      sleep = require('../../../sleep');

const startContainers = async function ({
  configuration,
  env,
  sharedKey,
  persistData,
  dangerouslyExposeHttpPort,
  debug
}, progress) {
  if (!configuration) {
    throw new Error('Configuration is missing.');
  }
  if (!env) {
    throw new Error('Environment is missing.');
  }
  if (!sharedKey) {
    throw new Error('Shared key is missing.');
  }
  if (persistData === undefined) {
    throw new Error('Persist data is missing.');
  }
  if (dangerouslyExposeHttpPort === undefined) {
    throw new Error('Dangerously expose http port is missing.');
  }
  if (debug === undefined) {
    throw new Error('Debug is missing.');
  }
  if (!progress) {
    throw new Error('Progress is missing.');
  }

  const runtime = configuration.runtime.version;

  const containers = await runtimes.getContainers({
    forVersion: runtime,
    configuration,
    env,
    sharedKey,
    persistData,
    dangerouslyExposeHttpPort,
    debug
  });

  const started = containers.
    filter(container => container.labels['wolkenkit-type'] === 'infrastructure');
  const applicationContainers = containers.
    filter(container => container.labels['wolkenkit-type'] === 'application');
  const startedApplicationContainers = [];

  const numberOfContainers = applicationContainers.length;

  let err;

  while (startedApplicationContainers.length < numberOfContainers && !err) {
    const nextContainerToStart = applicationContainers.find(container => {
      const dependsOn = container.dependsOn || [];
      const startedContainerNames = started.map(startedContainer => startedContainer.name);

      return difference(dependsOn, startedContainerNames).length === 0;
    });

    if (nextContainerToStart) {
      remove(applicationContainers, container => container.name === nextContainerToStart.name);

      /* eslint-disable no-loop-func */
      (async () => {
        try {
          await docker.startContainer({ configuration, env, container: nextContainerToStart });

          started.push(nextContainerToStart);
          startedApplicationContainers.push(nextContainerToStart);
          progress({ message: `Started ${nextContainerToStart.name} (${startedApplicationContainers.length}/${numberOfContainers}).`, type: 'info' });
        } catch (ex) {
          err = ex;
        }
      })();
      /* eslint-enable no-loop-func */
    }

    await sleep(50);
  }

  if (err) {
    throw err;
  }
};

module.exports = startContainers;
