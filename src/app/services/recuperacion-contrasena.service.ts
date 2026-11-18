
import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecuperacionContrasenaService {

  private cliente: SupabaseClient;

  private autorizada = false;
  private verificacionRealizada = false;

  constructor() {

    // Cliente independiente de la sesión normal.
    this.cliente = createClient(
      environment.supabaseUrl,
      environment.supabasePublishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  // ==========================================
  // VERIFICAR ENLACE DE RECUPERACIÓN
  // ==========================================

  async verificarRecuperacion(): Promise<boolean> {

    if (this.verificacionRealizada) {
      return this.autorizada;
    }

    this.verificacionRealizada = true;
    this.autorizada = false;

    const fragmento = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const tipo = fragmento.get('type');
    const accessToken = fragmento.get('access_token');
    const refreshToken = fragmento.get('refresh_token');

    const errorEnlace =
      fragmento.get('error') ||
      fragmento.get('error_code');

    if (errorEnlace) {
      console.error(
        'Supabase rechazó el enlace:',
        errorEnlace
      );

      this.limpiarFragmento();
      return false;
    }

    // No aceptar enlaces de inicio de sesión,
    // confirmación de correo u otros flujos.
    if (
      tipo !== 'recovery' ||
      !accessToken ||
      !refreshToken
    ) {
      return false;
    }

    try {

      // Validar los tokens con Supabase.
      const { data, error } =
        await this.cliente.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

      if (error || !data.session) {
        console.error(
          'No se pudo validar la sesión de recuperación:',
          error?.message
        );

        return false;
      }

      // Comprobar el usuario con el servidor.
      const {
        data: usuario,
        error: errorUsuario
      } = await this.cliente.auth.getUser();

      if (errorUsuario || !usuario.user) {
        console.error(
          'No se pudo verificar el usuario:',
          errorUsuario?.message
        );

        return false;
      }

      this.autorizada = true;

      return true;

    } catch (error) {

      console.error(
        'Error al verificar recuperación:',
        error
      );

      return false;

    } finally {

      // Evitar que los tokens permanezcan
      // visibles en la barra del navegador.
      this.limpiarFragmento();
    }
  }

  // ==========================================
  // CAMBIAR CONTRASEÑA
  // ==========================================

  async cambiarContrasena(
    nuevaContrasena: string
  ): Promise<void> {

    if (!this.autorizada) {
      throw new Error(
        'No existe una recuperación autorizada.'
      );
    }

    if (nuevaContrasena.length < 8) {
      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );
    }

    // Verificar nuevamente que la sesión
    // temporal sigue siendo válida.
    const {
      data: usuario,
      error: errorUsuario
    } = await this.cliente.auth.getUser();

    if (errorUsuario || !usuario.user) {
      this.autorizada = false;

      throw new Error(
        'La sesión de recuperación ya no es válida.'
      );
    }

    const { error } =
      await this.cliente.auth.updateUser({
        password: nuevaContrasena
      });

    if (error) {
      throw error;
    }

    this.autorizada = false;

    // Cerrar únicamente la sesión temporal.
    const { error: errorSalida } =
      await this.cliente.auth.signOut({
        scope: 'local'
      });

    if (errorSalida) {
      console.warn(
        'Contraseña actualizada, pero no se pudo cerrar la sesión temporal:',
        errorSalida.message
      );
    }
  }

  // ==========================================
  // LIMPIAR TOKENS DE LA DIRECCIÓN
  // ==========================================

  private limpiarFragmento(): void {

    const url = new URL(window.location.href);

    if (!url.hash) {
      return;
    }

    url.hash = '';

    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search
    );
  }
}
