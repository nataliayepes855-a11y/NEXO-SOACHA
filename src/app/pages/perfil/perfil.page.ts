
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonFooter,
  IonInput,
  IonBadge,
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  personCircleOutline,
  logOutOutline,
  homeOutline,
  compassOutline,
  addCircleOutline,
  chatbubblesOutline,
  personOutline,
  cameraOutline,
  createOutline,
  saveOutline,
  closeOutline,
  imagesOutline,
  mailOutline,
  calendarOutline,
  refreshOutline,
} from 'ionicons/icons';

import {
  PublicacionBD,
  SupabaseService,
} from '../../services/supabase.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
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
    IonSpinner,
    IonFooter,
    IonInput,
    IonBadge,
  ],
})
export class PerfilPage implements OnInit {
  @ViewChild('selectorFoto')
  selectorFoto?: ElementRef<HTMLInputElement>;

  nombre = '';
  correo = '';
  fotoPerfil: string | null = null;

  nombreEditado = '';
  editandoNombre = false;

  haySesion = false;
  cargando = true;
  cerrandoSesion = false;
  guardandoNombre = false;
  subiendoFoto = false;
  cargandoPublicaciones = false;

  mensajeError = '';
  mensajeExito = '';
  errorPublicaciones = '';

  misPublicaciones: PublicacionBD[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      personCircleOutline,
      logOutOutline,
      homeOutline,
      compassOutline,
      addCircleOutline,
      chatbubblesOutline,
      personOutline,
      cameraOutline,
      createOutline,
      saveOutline,
      closeOutline,
      imagesOutline,
      mailOutline,
      calendarOutline,
      refreshOutline,
    });
  }

  ngOnInit(): void {
    void this.cargarUsuario();
  }

  ionViewWillEnter(): void {
    void this.cargarUsuario();
  }

  async cargarUsuario(): Promise<void> {
    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    try {
      const usuario =
        await this.supabaseService.obtenerUsuarioActual();

      if (usuario) {
        this.nombre = usuario.nombre;
        this.correo = usuario.correo;
        this.fotoPerfil = usuario.foto_url;
        this.nombreEditado = usuario.nombre;
        this.haySesion = true;

        await this.cargarMisPublicaciones();
      } else {
        this.limpiarPerfil();
      }
    } catch (error) {
      console.error('ERROR AL CARGAR PERFIL:', error);
      this.mensajeError = this.obtenerMensajeError(error);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async cargarMisPublicaciones(): Promise<void> {
    if (!this.haySesion) {
      return;
    }

    this.cargandoPublicaciones = true;
    this.errorPublicaciones = '';

    try {
      this.misPublicaciones =
        await this.supabaseService.obtenerMisPublicaciones();
    } catch (error) {
      console.error('ERROR AL CARGAR PUBLICACIONES:', error);
      this.errorPublicaciones =
        'No pudimos cargar tus publicaciones.';
    } finally {
      this.cargandoPublicaciones = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // FOTOGRAFÍA DE PERFIL
  // ==========================================

  abrirSelectorFoto(): void {
    if (this.subiendoFoto || !this.haySesion) {
      return;
    }

    this.selectorFoto?.nativeElement.click();
  }

  async seleccionarFoto(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      this.mensajeError =
        'Selecciona una imagen JPG, PNG o WEBP.';
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.mensajeError =
        'La fotografía no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.subiendoFoto = true;
    this.cdr.detectChanges();

    try {
      const nuevaFoto =
        await this.supabaseService.actualizarFotoPerfil(
          archivo
        );

      this.fotoPerfil = nuevaFoto;
      this.mensajeExito =
        'Tu fotografía de perfil se actualizó correctamente.';
    } catch (error) {
      console.error('ERROR AL ACTUALIZAR FOTO:', error);
      this.mensajeError = this.obtenerMensajeError(error);
    } finally {
      this.subiendoFoto = false;
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // EDITAR NOMBRE
  // ==========================================

  activarEdicionNombre(): void {
    this.nombreEditado = this.nombre;
    this.editandoNombre = true;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  cancelarEdicionNombre(): void {
    this.nombreEditado = this.nombre;
    this.editandoNombre = false;
  }

  async guardarNombre(): Promise<void> {
    if (this.guardandoNombre) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';

    this.guardandoNombre = true;

    try {
      await this.supabaseService.actualizarNombrePerfil(
        this.nombreEditado
      );

      this.nombre = this.nombreEditado.trim();
      this.nombreEditado = this.nombre;
      this.editandoNombre = false;

      this.mensajeExito =
        'Tu nombre se actualizó correctamente.';
    } catch (error) {
      console.error('ERROR AL ACTUALIZAR NOMBRE:', error);
      this.mensajeError = this.obtenerMensajeError(error);
    } finally {
      this.guardandoNombre = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion) {
      return;
    }

    this.cerrandoSesion = true;
    this.mensajeError = '';

    try {
      await this.supabaseService.cerrarSesion();

      this.limpiarPerfil();

      await this.router.navigateByUrl('/auth', {
        replaceUrl: true,
      });
    } catch (error) {
      console.error('ERROR AL CERRAR SESIÓN:', error);
      this.mensajeError =
        'No se pudo cerrar la sesión. Inténtalo nuevamente.';
    } finally {
      this.cerrandoSesion = false;
      this.cdr.detectChanges();
    }
  }

  irAIniciarSesion(): void {
    void this.router.navigateByUrl('/auth');
  }

  limpiarPerfil(): void {
    this.nombre = '';
    this.correo = '';
    this.fotoPerfil = null;
    this.nombreEditado = '';
    this.haySesion = false;
    this.editandoNombre = false;
    this.misPublicaciones = [];
    this.errorPublicaciones = '';
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  obtenerIniciales(nombreCompleto: string): string {
    if (!nombreCompleto.trim()) {
      return 'NS';
    }

    const partes = nombreCompleto.trim().split(/\s+/);

    if (partes.length >= 2) {
      return (
        partes[0].charAt(0) +
        partes[1].charAt(0)
      ).toUpperCase();
    }

    return nombreCompleto.substring(0, 2).toUpperCase();
  }

  obtenerMensajeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
}
