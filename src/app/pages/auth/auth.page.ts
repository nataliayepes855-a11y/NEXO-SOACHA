
import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton
} from '@ionic/angular';

import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton
  ]
})
export class AuthPage {

  modo: 'login' | 'registro' | 'recuperar' = 'login';

  nombre = '';
  correo = '';
  contrasena = '';
  confirmarContrasena = '';

  mostrarContrasena = false;
  mostrarConfirmacion = false;

  guardando = false;

  mensaje = '';
  tipoMensaje: 'exito' | 'error' | '' = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // CAMBIAR ENTRE FORMULARIOS
  cambiarModo(
    modo: 'login' | 'registro' | 'recuperar'
  ): void {

    if (this.guardando) return;

    this.modo = modo;
    this.mensaje = '';
    this.tipoMensaje = '';

    this.nombre = '';
    this.contrasena = '';
    this.confirmarContrasena = '';

    this.mostrarContrasena = false;
    this.mostrarConfirmacion = false;

    this.actualizarVista();
  }

  // MOSTRAR U OCULTAR CONTRASEÑA
  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  // MOSTRAR U OCULTAR CONFIRMACIÓN
  alternarConfirmacion(): void {
    this.mostrarConfirmacion = !this.mostrarConfirmacion;
  }

  // PROCESAR FORMULARIO
  async enviarFormulario(): Promise<void> {

    if (this.guardando) return;

    this.mensaje = '';
    this.tipoMensaje = '';

    const nombre = this.nombre.trim();
    const correo = this.correo.trim();

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correo) {
      this.mostrarMensaje(
        'Escribe tu correo electrónico.',
        'error'
      );
      return;
    }

    if (!formatoCorreo.test(correo)) {
      this.mostrarMensaje(
        'Escribe un correo electrónico válido.',
        'error'
      );
      return;
    }

    if (this.modo === 'registro' && !nombre) {
      this.mostrarMensaje(
        'Escribe tu nombre para crear la cuenta.',
        'error'
      );
      return;
    }

    if (this.modo !== 'recuperar' && !this.contrasena) {
      this.mostrarMensaje(
        'Escribe tu contraseña.',
        'error'
      );
      return;
    }

    if (
      this.modo === 'registro' &&
      this.contrasena.length < 6
    ) {
      this.mostrarMensaje(
        'La contraseña debe tener al menos 6 caracteres.',
        'error'
      );
      return;
    }

    if (
      this.modo === 'registro' &&
      this.contrasena !== this.confirmarContrasena
    ) {
      this.mostrarMensaje(
        'Las contraseñas no coinciden.',
        'error'
      );
      return;
    }

    this.guardando = true;
    this.actualizarVista();

    try {

      // RECUPERAR CONTRASEÑA
      if (this.modo === 'recuperar') {

        await this.supabaseService.solicitarRecuperacion(
          correo
        );

        this.mostrarMensaje(
          'Si existe una cuenta asociada a ese correo, ' +
          'recibirás un enlace para recuperar tu contraseña. ' +
          'Revisa también la carpeta de spam.',
          'exito'
        );

        return;
      }

      // REGISTRAR USUARIO
      if (this.modo === 'registro') {

        const requiereConfirmacion =
          await this.supabaseService.registrarUsuario(
            nombre,
            correo,
            this.contrasena
          );

        if (requiereConfirmacion) {

          this.modo = 'login';
          this.contrasena = '';
          this.confirmarContrasena = '';

          this.mostrarMensaje(
            '¡Cuenta creada correctamente! Revisa tu correo ' +
            'y confirma tu dirección antes de iniciar sesión.',
            'exito'
          );

        } else {

          this.mostrarMensaje(
            '¡Cuenta creada correctamente! Bienvenido a NEXO SOACHA.',
            'exito'
          );

          await this.router.navigateByUrl('/home');
        }

        return;
      }

      // INICIAR SESIÓN
      await this.supabaseService.iniciarSesion(
        correo,
        this.contrasena
      );

      this.mostrarMensaje(
        '¡Inicio de sesión exitoso!',
        'exito'
      );

      await this.router.navigateByUrl('/home');

    } catch (error) {

      console.error('Error de autenticación:', error);

      const detalle =
        error instanceof Error ? error.message : '';

      const texto = detalle.toLowerCase();

      if (texto.includes('email not confirmed')) {

        this.mostrarMensaje(
          'Tu correo todavía no está confirmado. ' +
          'Revisa tu bandeja de entrada.',
          'error'
        );

      } else if (
        texto.includes('invalid login credentials') ||
        texto.includes('invalid credentials')
      ) {

        this.mostrarMensaje(
          'El correo o la contraseña son incorrectos. ' +
          'Verifica los datos e inténtalo nuevamente.',
          'error'
        );

      } else if (
        texto.includes('already registered') ||
        texto.includes('user already registered')
      ) {

        this.mostrarMensaje(
          'Este correo ya tiene una cuenta. Intenta iniciar sesión.',
          'error'
        );

      } else if (texto.includes('password')) {

        this.mostrarMensaje(
          'No se pudo procesar la contraseña. ' +
          'Revisa los datos ingresados.',
          'error'
        );

      } else {

        this.mostrarMensaje(
          'No se pudo completar la operación. ' +
          (detalle || 'Inténtalo nuevamente.'),
          'error'
        );
      }

    } finally {

      this.guardando = false;
      this.actualizarVista();
    }
  }

  // MOSTRAR MENSAJE INMEDIATAMENTE
  private mostrarMensaje(
    texto: string,
    tipo: 'exito' | 'error'
  ): void {

    this.mensaje = texto;
    this.tipoMensaje = tipo;

    this.actualizarVista();
  }

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}
