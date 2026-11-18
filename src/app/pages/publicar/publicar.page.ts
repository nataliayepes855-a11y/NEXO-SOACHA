
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
  mensaje = '';
  tipoMensaje: 'exito' | 'error' | '' = '';

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

  seleccionarImagen(evento: Event): void {

    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    this.mensaje = '';
    this.tipoMensaje = '';

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      this.mensaje =
        'Selecciona una imagen JPG, PNG o WEBP.';
      this.tipoMensaje = 'error';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    const tamanoMaximo = 5 * 1024 * 1024;

    if (archivo.size > tamanoMaximo) {
      this.mensaje =
        'La fotografía no puede superar los 5 MB.';
      this.tipoMensaje = 'error';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.liberarVistaPrevia();

    this.imagenSeleccionada = archivo;

    this.vistaPreviaImagen =
      URL.createObjectURL(archivo);

    input.value = '';

    this.cdr.detectChanges();
  }

  quitarImagen(): void {

    if (this.guardando) {
      return;
    }

    this.liberarVistaPrevia();

    this.imagenSeleccionada = null;

    this.cdr.detectChanges();
  }

  async guardarPublicacion(): Promise<void> {

    if (this.guardando) {
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
    this.cdr.detectChanges();

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

      this.cdr.detectChanges();

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
      this.cdr.detectChanges();
    }
  }

  volverAlInicio(): void {
    void this.router.navigateByUrl('/home');
  }

  private liberarVistaPrevia(): void {

    if (this.vistaPreviaImagen) {
      URL.revokeObjectURL(this.vistaPreviaImagen);
      this.vistaPreviaImagen = null;
    }
  }

  ngOnDestroy(): void {
    this.liberarVistaPrevia();
  }
}
