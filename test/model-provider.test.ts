import { describe, expect, it } from 'vitest';
import { createModelProviderFromEnv, EchoModelProvider, RuleModelProvider } from '../src/core/model-provider.js';

describe('Model provider factory', () => {
  it('defaults to echo provider', () => {
    const provider = createModelProviderFromEnv({});
    expect(provider).toBeInstanceOf(EchoModelProvider);
  });

  it('uses rule provider when MODEL_PROVIDER=rule', () => {
    const provider = createModelProviderFromEnv({ MODEL_PROVIDER: 'rule' });
    expect(provider).toBeInstanceOf(RuleModelProvider);
  });
});
