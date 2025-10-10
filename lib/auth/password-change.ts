export interface PasswordChangeDependencies {
  updateUserPassword: (password: string) => Promise<{ error: { message: string } | null }>;
  markPasswordAsChanged: () => Promise<void>;
}

export type PasswordChangeResult =
  | { status: 'success' }
  | { status: 'validation-error'; message: string }
  | { status: 'error'; message: string };

export async function processPasswordChange(
  password: string,
  confirmPassword: string,
  deps: PasswordChangeDependencies,
): Promise<PasswordChangeResult> {
  if (password.length < 8) {
    return {
      status: 'validation-error',
      message: 'Introduce al menos 8 caracteres para mayor seguridad.',
    };
  }

  if (password !== confirmPassword) {
    return {
      status: 'validation-error',
      message: 'Las contraseñas no coinciden. Asegúrate de escribir la misma contraseña en ambos campos.',
    };
  }

  try {
    const { error } = await deps.updateUserPassword(password);
    if (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }

    await deps.markPasswordAsChanged();
    return { status: 'success' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Intenta nuevamente más tarde.',
    };
  }
}
