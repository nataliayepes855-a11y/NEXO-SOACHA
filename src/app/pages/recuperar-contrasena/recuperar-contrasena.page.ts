
import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButton
} from '@ionic/angular';

import {
  RecuperacionContrasenaService
} from '../../services/recuperacion-contrasena.service';

@Component({
  selector: 'app-recuperar-contrasena',
  templateUrl: './recuperar-contrasena.page.html',
  styleUrls: ['./recuperar-contrasena.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButton
  ]
})
export class RecuperarContrasenaPage
  implements OnInit, OnDestroy {

  contrasena = '';
  confirmarContrasena = '';

  mostrarContrasena = false;
  mostrarConfirmacion = false;

  verificando = true;
  enlaceValido = false;
  guardando = false;
  completado = false;

  mensaje = '';
  tipoMensaje: 'exito' | 'error' | '' = '';

  private activo = true;

  constructor(
    private recuperacionService:
      RecuperacionContrasenaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // ==========================================
  // INICIALIZAR PANTALLA
  // ==========================================

  async ngOnInit(): Promise<void> {
    await this.verificarEnlace();
  }

  ngOnDestroy(): void {
    this.activo = false;
  }

  private actualizarVista(): void {
    if (this.activo) {
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // VALIDAR ENLACE
  // ==========================================

  async verificarEnlace(): Promise<void> {

    this.verificando = true;
    this.enlaceValido = false;

    this.mensaje = '';
    this.tipoMensaje = '';

    this.actualizarVista();

    try {

      this.enlaceValido =
        await this.recuperacionService
          .verificarRecuperacion();

      if (!this.enlaceValido) {

        this.mostrarMensaje(
          'El enlace no es válido o ha expirado. ' +
          'Solicita uno nuevo desde el inicio de sesión.',
          'error'
        );
      }

    } catch (error) {

      console.error(
        'Error al verificar recuperación:',
        error
      );

      this.mostrarMensaje(
        'No se pudo verificar el enlace. ' +
        'Solicita uno nuevo.',
        'error'
      );

    } finally {

      this.verificando = false;
      this.actualizarVista();
    }
  }

  // ==========================================
  // MOSTRAR U OCULTAR CONTRASEÑAS
  // ==========================================

  alternarContrasena(): void {
    this.mostrarContrasena =
      !this.mostrarContrasena;
  }

  alternarConfirmacion(): void {
    this.mostrarConfirmacion =
      !this.mostrarConfirmacion;
  }

  // ==========================================
  // GUARDAR CONTRASEÑA NUEVA
  // ==========================================

  async guardarContrasena(): Promise<void> {

    if (
      this.guardando ||
      this.verificando ||
      !this.enlaceValido ||
      this.completado
    ) {
      return;
    }

    this.mensaje = '';
    this.tipoMensaje = '';

    if (!this.contrasena) {

      this.mostrarMensaje(
        'Escribe una contraseña nueva.',
        'error'
      );

      return;
    }

    if (this.contrasena.length < 8) {

      this.mostrarMensaje(
        'La contraseña debe tener al menos 8 caracteres.',
        'error'
      );

      return;
    }

    if (
      this.contrasena !==
      this.confirmarContrasena
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

      await this.recuperacionService
        .cambiarContrasena(
          this.contrasena
        );

      this.completado = true;
      this.enlaceValido = false;

      this.contrasena = '';
      this.confirmarContrasena = '';

      this.mostrarMensaje(
        '¡Contraseña actualizada correctamente! ' +
        'Ya puedes iniciar sesión con tu nueva contraseña.',
        'exito'
      );

    } catch (error) {

      console.error(
        'Error al cambiar contraseña:',
        error
      );

      const detalle =
        error instanceof Error
          ? error.message
          : '';

      this.mostrarMensaje(
        detalle ||
        'No fue posible actualizar la contraseña. ' +
        'Inténtalo nuevamente.',
        'error'
      );

    } finally {

      this.guardando = false;
      this.actualizarVista();
    }
  }

  // ==========================================
  // VOLVER AL INICIO DE SESIÓN
  // ==========================================

  async volverAlLogin(): Promise<void> {

    if (this.guardando) {
      return;
    }

    await this.router.navigateByUrl('/auth');
  }

  // ==========================================
  // MOSTRAR MENSAJES
  // ==========================================

  private mostrarMensaje(
    texto: string,
    tipo: 'exito' | 'error'
  ): void {

    this.mensaje = texto;
    this.tipoMensaje = tipo;

    this.actualizarVista();
  }
}
