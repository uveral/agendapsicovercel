import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { processPasswordChange } from '../lib/auth/password-change';

describe('processPasswordChange', () => {
  it('validates minimum length', async () => {
    const result = await processPasswordChange('short', 'short', {
      updateUserPassword: async () => ({ error: null }),
      markPasswordAsChanged: async () => {},
    });

    assert.equal(result.status, 'validation-error');
    assert.ok(result.message.includes('8'));
  });

  it('validates matching confirmation', async () => {
    const result = await processPasswordChange('12345678', '87654321', {
      updateUserPassword: async () => ({ error: null }),
      markPasswordAsChanged: async () => {},
    });

    assert.equal(result.status, 'validation-error');
    assert.ok(result.message.includes('coinciden'));
  });

  it('propagates update errors', async () => {
    const result = await processPasswordChange('12345678', '12345678', {
      updateUserPassword: async () => ({ error: { message: 'boom' } }),
      markPasswordAsChanged: async () => {},
    });

    assert.equal(result.status, 'error');
    assert.equal(result.message, 'boom');
  });

  it('resolves successfully and flags password change', async () => {
    let flagCalls = 0;
    const result = await processPasswordChange('12345678', '12345678', {
      updateUserPassword: async () => ({ error: null }),
      markPasswordAsChanged: async () => {
        flagCalls += 1;
      },
    });

    assert.equal(result.status, 'success');
    assert.equal(flagCalls, 1);
  });
});
