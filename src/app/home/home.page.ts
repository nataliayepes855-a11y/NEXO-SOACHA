
import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

import {
  CommonModule,
  DatePipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonSearchbar,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonFooter,
  AlertController
} from '@ionic/angular';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { addIcons } from 'ionicons';

import {
  homeOutline,
  compassOutline,
  addCircleOutline,
  chatbubblesOutline,
  personCircleOutline,
  addOutline,
  alertCircleOutline,
  chatbubbleOutline,
  sendOutline,
  newspaperOutline,
  ellipsisVerticalOutline,
  createOutline,
  trashOutline,
  checkmarkOutline,
  closeOutline
} from 'ionicons/icons';

import {
  SupabaseService,
  ComentarioBD
} from '../services/supabase.service';

import {
  PerfilesPublicosService,
  PerfilPublicoBD
} from '../services/perfiles-publicos.service';

import {
  ContenidoCrudService
} from '../services/contenido-crud.service';

interface ComentarioVista extends ComentarioBD {
  fotoPerfil: string | null;
  nombreActual: string;
  iniciales: string;

  editando: boolean;
  textoEdicion: string;
  procesando: boolean;
  menuAbierto: boolean;
}

interface PublicacionVista {
  id: number;
  user_id: string | null;
  categoria: string;
  autor: string;
  fotoPerfil: string | null;
  iniciales: string;
  tiempo: string;
  contenido: string;
  imagen_url: string | null;

  reacciones: number;
  comentarios: number;
  meGusta: boolean;
  procesandoReaccion: boolean;

  mostrarComentarios: boolean;
  nuevoComentario: string;
  listaComentarios: ComentarioVista[];

  comentariosCargados: boolean;
  cargandoComentarios: boolean;
  enviandoComentario: boolean;
  errorComentarios: string;

  editando: boolean;
  textoEdicion: string;
  procesando: boolean;
  menuAbierto: boolean;
  errorEdicion: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonSearchbar,
    IonBadge,
    IonIcon,
    IonSpinner,
    IonTextarea,
    IonFooter
  ]
})
export class HomePage {

  busqueda = '';
  cargando = false;
  errorCarga = '';

  usuarioActualId: string | null = null;
  publicaciones: PublicacionVista[] = [];

  private numeroConsulta = 0;

  private perfiles = new Map<string, PerfilPublicoBD>();

  constructor(
    private supabaseService: SupabaseService,
    private perfilesService: PerfilesPublicosService,
    private crudService: ContenidoCrudService,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      homeOutline,
      compassOutline,
      addCircleOutline,
      chatbubblesOutline,
      personCircleOutline,
      addOutline,
      alertCircleOutline,
      chatbubbleOutline,
      sendOutline,
      newspaperOutline,
      ellipsisVerticalOutline,
      createOutline,
      trashOutline,
      checkmarkOutline,
      closeOutline
    });
  }

  ionViewWillEnter(): void {
    void this.cargarPublicaciones();
  }

  esPropietario(userId: string | null): boolean {
    return !!this.usuarioActualId &&
      userId === this.usuarioActualId;
  }

  obtenerIniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/);

    if (!partes[0]) return 'U';

    return partes
      .slice(0, 2)
      .map(parte => parte.charAt(0))
      .join('')
      .toUpperCase();
  }

  private async cargarPerfiles(ids: string[]): Promise<void> {
    const pendientes = [
      ...new Set(ids.filter(Boolean))
    ].filter(id => !this.perfiles.has(id));

    if (!pendientes.length) return;

    const perfiles =
      await this.perfilesService.obtenerPerfiles(pendientes);

    for (const perfil of perfiles) {
      this.perfiles.set(perfil.id, perfil);
    }
  }

  private aplicarPerfilesPublicaciones(): void {
    for (const publicacion of this.publicaciones) {
      if (!publicacion.user_id) continue;

      const perfil = this.perfiles.get(publicacion.user_id);
      if (!perfil) continue;

      publicacion.autor = perfil.nombre;
      publicacion.fotoPerfil = perfil.foto_url;
      publicacion.iniciales =
        this.obtenerIniciales(perfil.nombre);
    }

    this.actualizarVista();
  }

  private convertirComentarios(
    comentarios: ComentarioBD[]
  ): ComentarioVista[] {
    return comentarios.map(comentario => {
      const perfil = comentario.user_id
        ? this.perfiles.get(comentario.user_id)
        : undefined;

      const nombreActual =
        perfil?.nombre || comentario.autor;

      return {
        ...comentario,
        nombreActual,
        fotoPerfil: perfil?.foto_url ?? null,
        iniciales: this.obtenerIniciales(nombreActual),
        editando: false,
        textoEdicion: comentario.contenido,
        procesando: false,
        menuAbierto: false
      };
    });
  }

  async cargarPublicaciones(): Promise<void> {
    const consultaActual = ++this.numeroConsulta;

    this.cargando = true;
    this.errorCarga = '';
    this.perfiles.clear();
    this.actualizarVista();

    try {
      const [usuarioId, datos] = await Promise.all([
        this.supabaseService.obtenerUsuarioActualId(),
        this.supabaseService.obtenerPublicaciones()
      ]);

      if (consultaActual !== this.numeroConsulta) return;

      this.usuarioActualId = usuarioId;

      this.publicaciones = datos.map(p => ({
        id: p.id,
        user_id: p.user_id ?? null,
        categoria: p.categoria,
        autor: p.autor,
        fotoPerfil: null,
        iniciales: this.obtenerIniciales(p.autor),
        tiempo: new Date(p.created_at)
          .toLocaleDateString('es-CO'),
        contenido: p.contenido,
        imagen_url: p.imagen_url ?? null,

        reacciones: 0,
        comentarios: 0,
        meGusta: false,
        procesandoReaccion: false,

        mostrarComentarios: false,
        nuevoComentario: '',
        listaComentarios: [],
        comentariosCargados: false,
        cargandoComentarios: false,
        enviandoComentario: false,
        errorComentarios: '',

        editando: false,
        textoEdicion: p.contenido,
        procesando: false,
        menuAbierto: false,
        errorEdicion: ''
      }));

      this.actualizarVista();

      try {
        await this.cargarPerfiles(
          this.publicaciones
            .map(p => p.user_id)
            .filter((id): id is string => !!id)
        );

        if (consultaActual !== this.numeroConsulta) return;

        this.aplicarPerfilesPublicaciones();
      } catch (error) {
        console.error('Error consultando perfiles:', error);
      }

      await Promise.all([
        this.cargarReacciones(consultaActual),
        this.cargarContadoresComentarios(consultaActual)
      ]);

    } catch (error) {
      if (consultaActual !== this.numeroConsulta) return;

      console.error('Error cargando publicaciones:', error);
      this.errorCarga =
        'No se pudieron cargar las publicaciones. ' +
        'Verifica tu conexión e inténtalo nuevamente.';
    } finally {
      if (consultaActual === this.numeroConsulta) {
        this.cargando = false;
        this.actualizarVista();
      }
    }
  }

  private async cargarReacciones(
    consultaActual: number
  ): Promise<void> {
    try {
      const reacciones =
        await this.supabaseService.obtenerReacciones();

      if (consultaActual !== this.numeroConsulta) return;

      const cantidades = new Map<number, number>();
      const propias = new Set<number>();

      for (const reaccion of reacciones) {
        cantidades.set(
          reaccion.publicacion_id,
          (cantidades.get(reaccion.publicacion_id) ?? 0) + 1
        );

        if (reaccion.user_id === this.usuarioActualId) {
          propias.add(reaccion.publicacion_id);
        }
      }

      for (const publicacion of this.publicaciones) {
        publicacion.reacciones =
          cantidades.get(publicacion.id) ?? 0;

        publicacion.meGusta = propias.has(publicacion.id);
      }

      this.actualizarVista();
    } catch (error) {
      console.error('Error cargando reacciones:', error);
    }
  }

  private async cargarContadoresComentarios(
    consultaActual: number
  ): Promise<void> {
    const resultados = await Promise.all(
      this.publicaciones.map(async publicacion => {
        try {
          const comentarios =
            await this.supabaseService.obtenerComentarios(
              publicacion.id
            );

          return { publicacion, comentarios };
        } catch (error) {
          console.error('Error consultando comentarios:', error);
          return null;
        }
      })
    );

    if (consultaActual !== this.numeroConsulta) return;

    const ids = resultados
      .filter(resultado => resultado !== null)
      .flatMap(resultado =>
        resultado.comentarios
          .map(c => c.user_id)
          .filter((id): id is string => !!id)
      );

    try {
      await this.cargarPerfiles(ids);
    } catch (error) {
      console.error('Error consultando perfiles:', error);
    }

    if (consultaActual !== this.numeroConsulta) return;

    for (const resultado of resultados) {
      if (!resultado) continue;

      resultado.publicacion.listaComentarios =
        this.convertirComentarios(resultado.comentarios);

      resultado.publicacion.comentarios =
        resultado.comentarios.length;

      resultado.publicacion.comentariosCargados = true;
    }

    this.actualizarVista();
  }

  get publicacionesFiltradas(): PublicacionVista[] {
    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) return this.publicaciones;

    return this.publicaciones.filter(p =>
      p.contenido.toLowerCase().includes(texto) ||
      p.categoria.toLowerCase().includes(texto) ||
      p.autor.toLowerCase().includes(texto)
    );
  }

  async alternarReaccion(
    publicacion: PublicacionVista
  ): Promise<void> {
    if (publicacion.procesandoReaccion) return;

    publicacion.procesandoReaccion = true;

    const estadoAnterior = publicacion.meGusta;
    const cantidadAnterior = publicacion.reacciones;

    publicacion.meGusta = !estadoAnterior;
    publicacion.reacciones = Math.max(
      0,
      cantidadAnterior + (estadoAnterior ? -1 : 1)
    );

    this.actualizarVista();

    try {
      if (estadoAnterior) {
        await this.supabaseService.quitarMeGusta(
          publicacion.id
        );
      } else {
        await this.supabaseService.darMeGusta(
          publicacion.id
        );
      }
    } catch (error) {
      console.error('Error actualizando Me gusta:', error);
      publicacion.meGusta = estadoAnterior;
      publicacion.reacciones = cantidadAnterior;
    } finally {
      publicacion.procesandoReaccion = false;
      this.actualizarVista();
    }
  }

  async alternarComentarios(
    publicacion: PublicacionVista
  ): Promise<void> {
    publicacion.mostrarComentarios =
      !publicacion.mostrarComentarios;

    this.actualizarVista();

    if (
      publicacion.mostrarComentarios &&
      !publicacion.comentariosCargados &&
      !publicacion.cargandoComentarios
    ) {
      await this.cargarComentarios(publicacion);
    }
  }

  async cargarComentarios(
    publicacion: PublicacionVista
  ): Promise<void> {
    if (publicacion.cargandoComentarios) return;

    publicacion.cargandoComentarios = true;
    publicacion.errorComentarios = '';
    this.actualizarVista();

    try {
      const comentarios =
        await this.supabaseService.obtenerComentarios(
          publicacion.id
        );

      await this.cargarPerfiles(
        comentarios
          .map(c => c.user_id)
          .filter((id): id is string => !!id)
      );

      publicacion.listaComentarios =
        this.convertirComentarios(comentarios);

      publicacion.comentarios = comentarios.length;
      publicacion.comentariosCargados = true;

    } catch (error) {
      console.error('Error cargando comentarios:', error);
      publicacion.errorComentarios =
        'No se pudieron cargar los comentarios.';
    } finally {
      publicacion.cargandoComentarios = false;
      this.actualizarVista();
    }
  }

  async agregarComentario(
    publicacion: PublicacionVista
  ): Promise<void> {
    const texto = publicacion.nuevoComentario.trim();

    if (!texto || publicacion.enviandoComentario) return;

    if (texto.length > 1000) {
      publicacion.errorComentarios =
        'El comentario no puede superar los 1000 caracteres.';
      this.actualizarVista();
      return;
    }

    publicacion.enviandoComentario = true;
    publicacion.errorComentarios = '';
    this.actualizarVista();

    try {
      const comentario =
        await this.supabaseService.crearComentario(
          publicacion.id,
          texto
        );

      if (comentario.user_id) {
        await this.cargarPerfiles([comentario.user_id]);
      }

      const comentarioVista =
        this.convertirComentarios([comentario])[0];

      publicacion.listaComentarios = [
        ...publicacion.listaComentarios,
        comentarioVista
      ];

      publicacion.comentarios =
        publicacion.listaComentarios.length;

      publicacion.comentariosCargados = true;
      publicacion.nuevoComentario = '';

    } catch (error) {
      console.error('Error guardando comentario:', error);

      publicacion.errorComentarios =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el comentario.';
    } finally {
      publicacion.enviandoComentario = false;
      this.actualizarVista();
    }
  }

  // ==========================================
  // EDITAR PUBLICACIONES
  // ==========================================

  iniciarEdicionPublicacion(
    publicacion: PublicacionVista
  ): void {
    if (!this.esPropietario(publicacion.user_id)) return;

    publicacion.editando = true;
    publicacion.textoEdicion = publicacion.contenido;
    publicacion.errorEdicion = '';
    publicacion.menuAbierto = false;
  }

  cancelarEdicionPublicacion(
    publicacion: PublicacionVista
  ): void {
    if (publicacion.procesando) return;

    publicacion.editando = false;
    publicacion.textoEdicion = publicacion.contenido;
    publicacion.errorEdicion = '';
  }

  async guardarEdicionPublicacion(
    publicacion: PublicacionVista
  ): Promise<void> {
    if (
      !this.esPropietario(publicacion.user_id) ||
      publicacion.procesando
    ) return;

    publicacion.procesando = true;
    publicacion.errorEdicion = '';

    try {
      await this.crudService.editarPublicacion(
        publicacion.id,
        publicacion.textoEdicion
      );

      publicacion.contenido =
        publicacion.textoEdicion.trim();

      publicacion.editando = false;
    } catch (error) {
      publicacion.errorEdicion =
        error instanceof Error
          ? error.message
          : 'No se pudo editar la publicación.';
    } finally {
      publicacion.procesando = false;
      this.actualizarVista();
    }
  }

  async eliminarPublicacion(
    publicacion: PublicacionVista
  ): Promise<void> {
    if (
      !this.esPropietario(publicacion.user_id) ||
      publicacion.procesando
    ) return;

    publicacion.menuAbierto = false;

    const alerta = await this.alertController.create({
      header: 'Eliminar publicación',
      message:
        '¿Seguro que deseas eliminar esta publicación? ' +
        'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'confirm' }
      ]
    });

    await alerta.present();

    const { role } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;

    publicacion.procesando = true;
    this.actualizarVista();

    try {
      await this.crudService.eliminarPublicacion(
        publicacion.id
      );

      this.publicaciones = this.publicaciones.filter(
        p => p.id !== publicacion.id
      );
    } catch (error) {
      await this.mostrarError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la publicación.'
      );
    } finally {
      publicacion.procesando = false;
      this.actualizarVista();
    }
  }

  // ==========================================
  // EDITAR COMENTARIOS
  // ==========================================

  iniciarEdicionComentario(
    comentario: ComentarioVista
  ): void {
    if (!this.esPropietario(comentario.user_id)) return;

    comentario.editando = true;
    comentario.textoEdicion = comentario.contenido;
    comentario.menuAbierto = false;
  }

  cancelarEdicionComentario(
    comentario: ComentarioVista
  ): void {
    if (comentario.procesando) return;

    comentario.editando = false;
    comentario.textoEdicion = comentario.contenido;
  }

  async guardarEdicionComentario(
    publicacion: PublicacionVista,
    comentario: ComentarioVista
  ): Promise<void> {
    if (
      !this.esPropietario(comentario.user_id) ||
      comentario.procesando
    ) return;

    comentario.procesando = true;

    try {
      await this.crudService.editarComentario(
        comentario.id,
        comentario.textoEdicion
      );

      comentario.contenido =
        comentario.textoEdicion.trim();

      comentario.editando = false;
      publicacion.errorComentarios = '';
    } catch (error) {
      publicacion.errorComentarios =
        error instanceof Error
          ? error.message
          : 'No se pudo editar el comentario.';
    } finally {
      comentario.procesando = false;
      this.actualizarVista();
    }
  }

  async eliminarComentario(
    publicacion: PublicacionVista,
    comentario: ComentarioVista
  ): Promise<void> {
    if (
      !this.esPropietario(comentario.user_id) ||
      comentario.procesando
    ) return;

    comentario.menuAbierto = false;

    const alerta = await this.alertController.create({
      header: 'Eliminar comentario',
      message:
        '¿Seguro que deseas eliminar este comentario?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'confirm' }
      ]
    });

    await alerta.present();

    const { role } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;

    comentario.procesando = true;
    this.actualizarVista();

    try {
      await this.crudService.eliminarComentario(
        comentario.id
      );

      publicacion.listaComentarios =
        publicacion.listaComentarios.filter(
          c => c.id !== comentario.id
        );

      publicacion.comentarios =
        publicacion.listaComentarios.length;

      publicacion.errorComentarios = '';
    } catch (error) {
      publicacion.errorComentarios =
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el comentario.';
    } finally {
      comentario.procesando = false;
      this.actualizarVista();
    }
  }

  private async mostrarError(
    mensaje: string
  ): Promise<void> {
    const alerta = await this.alertController.create({
      header: 'No se pudo completar la operación',
      message: mensaje,
      buttons: ['Aceptar']
    });

    await alerta.present();
  }

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}
