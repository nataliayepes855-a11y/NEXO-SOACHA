
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HomePage } from './home.page';
import { SupabaseService } from '../services/supabase.service';

describe('HomePage', () => {

  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  const supabaseServiceMock = {
    obtenerPublicaciones: vi.fn().mockResolvedValue([]),

    obtenerComentarios: vi.fn().mockResolvedValue([]),

    crearComentario: vi.fn().mockResolvedValue({
      id: 1,
      publicacion_id: 1,
      user_id: 'usuario-prueba',
      autor: 'Usuario de prueba',
      contenido: 'Comentario de prueba',
      created_at: new Date().toISOString()
    })
  };

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;

    fixture.detectChanges();

  });

  it('debe crear el componente HomePage', () => {
    expect(component).toBeTruthy();
  });

});
