
import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonFooter
} from '@ionic/angular';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { addIcons } from 'ionicons';

import {
  searchOutline,
  homeOutline,
  compassOutline,
  addCircleOutline,
  chatbubblesOutline,
  personCircleOutline,
  alertCircleOutline,
  refreshOutline,
  filterOutline
} from 'ionicons/icons';

import {
  SupabaseService
} from '../../services/supabase.service';

import {
  PerfilesPublicosService
} from '../../services/perfiles-publicos.service';

// ==========================================
// ESTRUCTURA DE LAS PUBLICACIONES
// ==========================================

interface PublicacionExplorar {
  id: number;
  user_id: string | null;
  autor: string;
  categoria: string;
  contenido: string;
  imagen_url: string | null;
  fecha: string;

  // Datos del perfil actualizado
  fotoPerfil: string | null;
  iniciales: string;
}

@Component({
  selector: 'app-explorar',
  templateUrl: './explorar.page.html',
  styleUrls: ['./explorar.page.scss'],
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
    IonSearchbar,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonFooter
  ]
})
export class ExplorarPage {

  // ==========================================
  // VARIABLES GENERALES
  // ==========================================

  busqueda = '';

  categoriaSeleccionada = 'Todas';

  categorias: string[] = [
    'Todas',
    'Comunidad',
    'Cultura',
    'Emprendimiento',
    'Eventos'
  ];

  publicaciones: PublicacionExplorar[] = [];

  cargando = false;
  errorCarga = '';

  private numeroConsulta = 0;

  constructor(
    private supabaseService: SupabaseService,
    private perfilesPublicosService: PerfilesPublicosService,
    private cdr: ChangeDetectorRef
  ) {

    addIcons({
      searchOutline,
      homeOutline,
      compassOutline,
      addCircleOutline,
      chatbubblesOutline,
      personCircleOutline,
      alertCircleOutline,
      refreshOutline,
      filterOutline
    });
  }

  // ==========================================
  // ACTUALIZAR AL ENTRAR
  // ==========================================

  ionViewWillEnter(): void {
    void this.cargarPublicaciones();
  }

  // ==========================================
  // OBTENER INICIALES DEL USUARIO
  // ==========================================

  obtenerIniciales(nombre: string): string {

    const partes = (nombre || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (partes.length === 0) {
      return 'U';
    }

    if (partes.length === 1) {
      return partes[0].charAt(0).toUpperCase();
    }

    return (
      partes[0].charAt(0) +
      partes[1].charAt(0)
    ).toUpperCase();
  }

  // ==========================================
  // CONSULTAR PUBLICACIONES Y PERFILES
  // ==========================================

  async cargarPublicaciones(): Promise<void> {

    const consultaActual = ++this.numeroConsulta;

    this.cargando = true;
    this.errorCarga = '';

    this.actualizarVista();

    try {

      // 1. Consultar publicaciones

      const datos =
        await this.supabaseService.obtenerPublicaciones();

      if (consultaActual !== this.numeroConsulta) {
        return;
      }

      // 2. Obtener IDs únicos de los autores

      const usuariosIds = [
        ...new Set(
          datos
            .map(publicacion => publicacion.user_id)
            .filter(
              (id): id is string =>
                typeof id === 'string' &&
                id.length > 0
            )
        )
      ];

      // 3. Consultar perfiles actualizados

      let perfiles: {
        id: string;
        nombre: string | null;
        foto_url: string | null;
      }[] = [];

      if (usuariosIds.length > 0) {

        try {

          perfiles =
            await this.perfilesPublicosService
              .obtenerPerfiles(usuariosIds);

        } catch (error) {

          console.error(
            'No fue posible consultar los perfiles:',
            error
          );

        }
      }

      if (consultaActual !== this.numeroConsulta) {
        return;
      }

      // 4. Crear mapa de perfiles

      const mapaPerfiles = new Map(
        perfiles.map(perfil => [
          perfil.id,
          perfil
        ])
      );

      // 5. Combinar publicaciones y perfiles

      this.publicaciones = datos.map(publicacion => {

        const perfil = publicacion.user_id
          ? mapaPerfiles.get(publicacion.user_id)
          : undefined;

        const autor =
          perfil?.nombre?.trim() ||
          publicacion.autor ||
          'Usuario';

        return {
          id: publicacion.id,
          user_id: publicacion.user_id,

          autor,

          categoria: publicacion.categoria,
          contenido: publicacion.contenido,

          imagen_url:
            publicacion.imagen_url ?? null,

          fotoPerfil:
            perfil?.foto_url ?? null,

          iniciales:
            this.obtenerIniciales(autor),

          fecha: new Date(
            publicacion.created_at
          ).toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        };

      });

      this.actualizarVista();

    } catch (error) {

      if (consultaActual !== this.numeroConsulta) {
        return;
      }

      console.error(
        'ERROR AL CARGAR EXPLORAR:',
        error
      );

      this.errorCarga =
        'No fue posible cargar las publicaciones. ' +
        'Verifica tu conexión e inténtalo nuevamente.';

    } finally {

      if (consultaActual === this.numeroConsulta) {
        this.cargando = false;
        this.actualizarVista();
      }
    }
  }

  // ==========================================
  // SELECCIONAR CATEGORÍA
  // ==========================================

  seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada = categoria;
  }

  // ==========================================
  // FILTRAR PUBLICACIONES
  // ==========================================

  get publicacionesFiltradas(): PublicacionExplorar[] {

    const texto = this.busqueda
      .trim()
      .toLocaleLowerCase('es');

    return this.publicaciones.filter(publicacion => {

      const coincideCategoria =
        this.categoriaSeleccionada === 'Todas' ||
        publicacion.categoria.toLocaleLowerCase('es') ===
        this.categoriaSeleccionada.toLocaleLowerCase('es');

      const coincideBusqueda =
        !texto ||
        publicacion.contenido
          .toLocaleLowerCase('es')
          .includes(texto) ||

        publicacion.autor
          .toLocaleLowerCase('es')
          .includes(texto) ||

        publicacion.categoria
          .toLocaleLowerCase('es')
          .includes(texto);

      return coincideCategoria && coincideBusqueda;
    });
  }

  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  limpiarFiltros(): void {
    this.busqueda = '';
    this.categoriaSeleccionada = 'Todas';
  }

  // ==========================================
  // ACTUALIZAR INTERFAZ
  // ==========================================

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}
