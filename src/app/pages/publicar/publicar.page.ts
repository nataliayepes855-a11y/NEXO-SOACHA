
import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonFooter,
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  homeOutline,
  compassOutline,
  addCircleOutline,
  chatbubblesOutline,
  personCircleOutline,
  arrowBackOutline,
  imageOutline,
  closeCircleOutline,
} from 'ionicons/icons';

import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-publicar',
  templateUrl: './publicar.page.html',
  styleUrls: ['./publicar.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonFooter,
  ],
})
export class PublicarPage implements OnDestroy {

  categoria = 'Comunidad';
  contenido = '';

  imagenSeleccionada: File | null = null;
  vistaPreviaImagen: string | null = null;

  guardando = false;
  seleccionandoImagen = false;

  mensaje = '';
  tipoMensaje: 'exito' | 'error' | '' = '';

  private seleccionActual = 0;
  private destruido = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      homeOutline,
      compassOutline,
      addCircleOutline,
      chatbubblesOutline,
      personCircleOutline,
      arrowBackOutline,
      imageOutline,
      closeCircleOutline,
    });
  }

  // ==========================================
  // SELECCIONAR FOTOGRAFÍA
  // ==========================================

  async seleccionarImagen(evento: Event): Promise<void> {

    if (this.guardando) {
      return;
    }

    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    const seleccion = ++this.seleccionActual;

    this.mensaje = '';
    this.tipoMensaje = '';
    this.seleccionandoImagen = true;

    this.actualizarVista();

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    try {

      if (!tiposPermitidos.includes(archivo.type)) {
        throw new Error(
          'Selecciona una imagen JPG, PNG o WEBP.'
        );
      }

      const tamanoMaximo = 5 * 1024 * 1024;

      if (archivo.size === 0) {
        throw new Error(
          'La fotografía está vacía. Selecciona otra imagen.'
        );
      }

      if (archivo.size > tamanoMaximo) {
        throw new Error(
          'La fotografía no puede superar los 5 MB.'
        );
      }

      // Leer la fotografía inmediatamente.
      const contenido = await archivo.arrayBuffer();

      if (contenido.byteLength === 0) {
        throw new Error(
          'No se pudo leer el contenido de la fotografía.'
        );
      }

      // Ignorar una lectura antigua si se seleccionó
      // otra fotografía mientras tanto.
      if (
        this.destruido ||
        seleccion !== this.seleccionActual
      ) {
        return;
      }

      // Crear una copia independiente del archivo original.
      const copia = new File(
        [contenido],
        archivo.name || 'fotografia.jpg',
        {
          type: archivo.type,
          lastModified: Date.now(),
        }
      );

      // Crear la vista previa desde la copia.
      const nuevaVistaPrevia =
        URL.createObjectURL(copia);

      this.liberarVistaPrevia();

      this.imagenSeleccionada = copia;
      this.vistaPreviaImagen = nuevaVistaPrevia;

    } catch (error) {

      console.error(
        'Error al seleccionar fotografía:',
        error
      );

      if (
        this.destruido ||
        seleccion !== this.seleccionActual
      ) {
        return;
      }

      this.mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo leer la fotografía seleccionada.';

      this.tipoMensaje = 'error';

    } finally {

      // Limpiar el selector únicamente después
      // de terminar de leer la fotografía.
      input.value = '';

      if (seleccion === this.seleccionActual) {
        this.seleccionandoImagen = false;
      }

      this.actualizarVista();
    }
  }

  // ==========================================
  // QUITAR FOTOGRAFÍA
  // ==========================================

  quitarImagen(): void {

    if (this.guardando) {
      return;
    }

    this.seleccionActual++;

    this.liberarVistaPrevia();

    this.imagenSeleccionada = null;
    this.seleccionandoImagen = false;

    this.mensaje = '';
    this.tipoMensaje = '';

    this.actualizarVista();
  }

  // ==========================================
  // GUARDAR PUBLICACIÓN
  // ==========================================

  async guardarPublicacion(): Promise<void> {

    if (this.guardando || this.seleccionandoImagen) {
      return;
    }

    this.mensaje = '';
    this.tipoMensaje = '';

    const texto = this.contenido.trim();

    if (!texto) {
      this.mensaje =
        'Escribe el contenido de tu publicación.';
      this.tipoMensaje = 'error';
      return;
    }

    if (texto.length > 2000) {
      this.mensaje =
        'La publicación no puede superar los 2000 caracteres.';
      this.tipoMensaje = 'error';
      return;
    }

    this.guardando = true;
    this.actualizarVista();

    try {

      await this.supabaseService.crearPublicacion(
        this.categoria,
        texto,
        this.imagenSeleccionada
      );

      this.mensaje =
        '¡Publicación guardada correctamente!';

      this.tipoMensaje = 'exito';

      this.contenido = '';
      this.categoria = 'Comunidad';

      this.liberarVistaPrevia();
      this.imagenSeleccionada = null;

      this.actualizarVista();

      await new Promise<void>((resolve) =>
        setTimeout(resolve, 1000)
      );

      await this.router.navigateByUrl('/home');

    } catch (error) {

      console.error(
        'No se pudo guardar la publicación:',
        error
      );

      this.mensaje =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al guardar la publicación.';

      this.tipoMensaje = 'error';

    } finally {

      this.guardando = false;
      this.actualizarVista();
    }
  }

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  volverAlInicio(): void {
    void this.router.navigateByUrl('/home');
  }

  // ==========================================
  // LIBERAR RECURSOS
  // ==========================================

  private liberarVistaPrevia(): void {

    if (this.vistaPreviaImagen) {
      URL.revokeObjectURL(this.vistaPreviaImagen);
      this.vistaPreviaImagen = null;
    }
  }

  private actualizarVista(): void {

    if (!this.destruido) {
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {

    this.destruido = true;
    this.seleccionActual++;

    this.liberarVistaPrevia();
  }
}
