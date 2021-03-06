import { Application } from '../../../../lib/common/application/Application';
import { assert } from 'assertthat';
import { CustomError } from 'defekt';
import { errors } from '../../../../lib/common/errors';
import { getTestApplicationDirectory } from '../../../shared/applications/getTestApplicationDirectory';
import { loadApplication } from '../../../../lib/common/application/loadApplication';
import { v4 } from 'uuid';
import { validateContextAndAggregateIdentifier } from '../../../../lib/common/validators/validateContextAndAggregateIdentifier';

suite('validateContextAndAggregateIdentifier', (): void => {
  const applicationDirectory = getTestApplicationDirectory({ name: 'base' });

  const aggregateIdentifier = { name: 'sampleAggregate', id: v4() },
        contextIdentifier = { name: 'sampleContext' };

  let application: Application;

  suiteSetup(async (): Promise<void> => {
    application = await loadApplication({ applicationDirectory });
  });

  test('does not throw an error if everything is fine.', async (): Promise<void> => {
    assert.that((): void => {
      validateContextAndAggregateIdentifier({ contextIdentifier, aggregateIdentifier, application });
    }).is.not.throwing();
  });

  test(`throws an error if the context doesn't exist in the application definition.`, async (): Promise<void> => {
    assert.that((): void => {
      validateContextAndAggregateIdentifier({
        contextIdentifier: { name: 'someContext' },
        aggregateIdentifier,
        application
      });
    }).is.throwing(
      (ex): boolean =>
        (ex as CustomError).code === errors.ContextNotFound.code &&
        ex.message === `Context 'someContext' not found.`
    );
  });

  test(`throws an error if the aggregate doesn't exist in the application definition.`, async (): Promise<void> => {
    assert.that((): void => {
      validateContextAndAggregateIdentifier({
        contextIdentifier,
        aggregateIdentifier: { name: 'someAggregate', id: v4() },
        application
      });
    }).is.throwing(
      (ex): boolean =>
        (ex as CustomError).code === errors.AggregateNotFound.code &&
        ex.message === `Aggregate 'sampleContext.someAggregate' not found.`
    );
  });
});
