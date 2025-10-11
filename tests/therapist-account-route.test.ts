import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRequire } from 'module';

const originalEnv = { ...process.env };

describe('therapist account route', () => {
  it('allows admins to promote and reset therapist accounts', async (t) => {
    const { mock } = t;
    const requireModule = createRequire(__filename);
    const ModuleCtor = requireModule('module') as typeof import('module');
    const moduleAny = ModuleCtor as any;
    const path = requireModule('path') as typeof import('path');
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    process.env.ADMIN_EMAILS = 'admin@example.com';

    const selectResponses = [
      { data: { role: 'admin', therapist_id: 'therapist-123' }, error: null },
      {
        data: {
          id: 'user-1',
          email: 'therapist@example.com',
          role: 'therapist',
          must_change_password: false,
        },
        error: null,
      },
      {
        data: {
          id: 'user-1',
          email: 'therapist@example.com',
          role: 'admin',
          must_change_password: true,
        },
        error: null,
      },
    ];
    let selectIndex = 0;
    const updatePayloads: Array<Record<string, unknown>> = [];

    const supabase = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: 'admin-user',
              email: 'admin@example.com',
              user_metadata: { role: 'admin' },
            },
          },
          error: null,
        }),
      },
      from: mock.fn((table: string) => {
        if (table !== 'users') {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: mock.fn(() => ({
            eq: mock.fn(() => ({
              maybeSingle: async () => selectResponses[selectIndex++] ?? { data: null, error: null },
            })),
          })),
          update: mock.fn((values: Record<string, unknown>) => {
            updatePayloads.push(values);
            return {
              eq: mock.fn(async () => ({ error: null })),
            };
          }),
        };
      }),
    };

    const adminUpdateCalls: Array<{ id: string; payload: Record<string, unknown> }> = [];

    const adminClient = {
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                id: 'user-1',
                email: 'therapist@example.com',
                user_metadata: { role: 'therapist' },
              },
            },
            error: null,
          }),
          updateUserById: async (id: string, payload: Record<string, unknown>) => {
            adminUpdateCalls.push({ id, payload });
            return { error: null };
          },
        },
      },
    };

    const originalResolveFilename = moduleAny._resolveFilename as (
      request: string,
      parent: NodeModule | undefined,
      isMain: boolean,
      options: unknown,
    ) => string;
    const serverModulePath = path.join(process.cwd(), '.virtual-supabase-server.js');

    moduleAny._resolveFilename = function (
      this: unknown,
      request: string,
      parent: NodeModule | undefined,
      isMain: boolean,
      options: unknown,
    ) {
      if (request.startsWith('@/')) {
        if (request === '@/lib/supabase/server') {
          return serverModulePath;
        }
        const mappedRequest = path.join(process.cwd(), request.slice(2));
        return originalResolveFilename.call(this, mappedRequest, parent, isMain, options);
      }
      return originalResolveFilename.call(this, request, parent, isMain, options);
    };

    const originalServerModule = requireModule.cache[serverModulePath];

    requireModule.cache[serverModulePath] = {
      id: serverModulePath,
      filename: serverModulePath,
      loaded: true,
      exports: {
        createClient: async () => supabase,
        createAdminClient: () => adminClient,
      },
      children: [],
      paths: [],
    } as any;

    try {
      const routeModulePath = requireModule.resolve('../app/api/therapists/[id]/account/route');
      delete requireModule.cache[routeModulePath];

      const { PATCH } = requireModule(routeModulePath) as {
        PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      };

      const request = new Request('https://example.com', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin', resetPassword: true }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'therapist-123' }) });
      assert.equal(response.status, 200);

      const result = (await response.json()) as {
        role: string;
        mustChangePassword: boolean;
      };

      assert.equal(result.role, 'admin');
      assert.equal(result.mustChangePassword, true);

      // first update call should set metadata for role change
      assert.equal(adminUpdateCalls.length, 2);
      assert.equal(adminUpdateCalls[0].id, 'user-1');
      const firstMetadata = (adminUpdateCalls[0].payload.user_metadata ?? {}) as Record<string, unknown>;
      assert.equal(firstMetadata.role, 'admin');

      // second update call should reset password to default and require change
      assert.equal(adminUpdateCalls[1].payload.password, 'orienta');
      const secondMetadata = (adminUpdateCalls[1].payload.user_metadata ?? {}) as Record<string, unknown>;
      assert.equal(secondMetadata.must_change_password, true);

      // ensure database flag was toggled
      const mustChangeUpdate = updatePayloads.find((payload) => 'must_change_password' in payload);
      assert.deepEqual(mustChangeUpdate, { must_change_password: true });
    } finally {
      if (originalServerModule) {
        requireModule.cache[serverModulePath] = originalServerModule;
      } else {
        delete requireModule.cache[serverModulePath];
      }

      moduleAny._resolveFilename = originalResolveFilename;
    }
  });
});

after(() => {
  process.env = { ...originalEnv };
});
