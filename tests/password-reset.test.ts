import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { determinePasswordRedirect } from '../lib/auth/password-reset';

describe('determinePasswordRedirect', () => {
  it('returns null while loading or when password change is not required', () => {
    assert.equal(
      determinePasswordRedirect({ loading: true, mustChangePassword: true, pathname: '/dashboard' }),
      null,
    );

    assert.equal(
      determinePasswordRedirect({ loading: false, mustChangePassword: false, pathname: '/dashboard' }),
      null,
    );
  });

  it('skips redirect on change-password routes', () => {
    assert.equal(
      determinePasswordRedirect({ loading: false, mustChangePassword: true, pathname: '/change-password' }),
      null,
    );
  });

  it('builds redirect URL preserving next path', () => {
    const redirect = determinePasswordRedirect({
      loading: false,
      mustChangePassword: true,
      pathname: '/dashboard/agenda',
    });

    assert.equal(redirect, '/change-password?next=%2Fdashboard%2Fagenda');
  });
});
