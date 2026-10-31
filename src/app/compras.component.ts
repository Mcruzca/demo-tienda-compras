import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, signal } from '@angular/core';

const API = '/api'; // API local de demo (repo api-java).

interface Producto { id: number; nombre: string; precio: number; }

// Variables del shell (window.tiendaEstado). Si compras se abre sin shell, usa valores por defecto.
const estado = () => (window as any).tiendaEstado ?? { get: (c: string) => ({ igv: 18, descuento: 0 } as any)[c], set: (c: string, v: number) => window.dispatchEvent(new CustomEvent('tienda:estado-cambio', { detail: { clave: c, valor: v } })) };

// CONTRATO entre módulos (eventos en window):
//   lanza → 'tienda:agregar'   detail: { id, nombre, precio }   (lo escucha el resumen del carrito)
//   lee   → igv del shell (solo lectura) · lee y CAMBIA → descuento del shell
@Component({
 selector: 'app-compras',
 standalone: true,
 schemas: [CUSTOM_ELEMENTS_SCHEMA], // Permite usar <tienda-resumen-carrito>, que no es Angular.
 template: `<section><small>ANGULAR · localhost:4501</small><h2>Compras</h2>
 <div class="columnas"><div>
   <p class="variables">IGV del shell: <b>{{ igv }} %</b> ·
     Cupón (cambia la variable del shell):
     <select (change)="cambiarDescuento($any($event.target).value)">
       @for (d of [0, 10, 20]; track d) { <option [value]="d" [selected]="d === descuento()">{{ d ? d + ' %' : 'Sin cupón' }}</option> }
     </select></p>
   @if (error()) { <p>{{ error() }}</p> }
   @for (p of productos(); track p.id) {
     <div class="producto"><span>{{ p.nombre }}</span><b>S/ {{ p.precio.toFixed(2) }}</b><small>con IGV S/ {{ conIgv(p.precio) }}</small>
     <button (click)="agregar(p)">Agregar</button></div>
   }
 </div>
 <!-- Pieza del módulo carrito (JS) mostrada dentro de este módulo Angular.
      El texto de adentro solo se ve si el carrito no cargó. -->
 <tienda-resumen-carrito>Resumen del carrito no disponible.</tienda-resumen-carrito>
 </div></section>`,
 styles: [`section { border:2px solid #b45309;padding:20px;border-radius:8px; }
  .columnas { display:grid;grid-template-columns:3fr 2fr;gap:20px;align-items:start; }
  @media (max-width:700px) { .columnas { grid-template-columns:1fr; } }
  .producto { display:flex;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #eee; }
  .producto span { flex:1; } .producto small { color:#666; }
  .variables { background:#fff7ed;padding:8px 12px;border-radius:6px; } button { padding:8px 12px;cursor:pointer; }`]
})
export class ComprasComponent implements OnInit, OnDestroy {
 productos = signal<Producto[]>([]);
 error = signal('');
 igv: number = estado().get('igv');
 descuento = signal<number>(estado().get('descuento'));
 private control = new AbortController();
 constructor() {
   // Si otro módulo cambia el descuento (p. ej. el carrito), el selector se actualiza.
   window.addEventListener('tienda:estado-cambio', e => {
     const { clave, valor } = (e as CustomEvent).detail;
     if (clave === 'descuento') this.descuento.set(valor);
   }, { signal: this.control.signal });
 }
 ngOnDestroy() { this.control.abort(); }
 conIgv(precio: number) { return (precio * (1 + this.igv / 100)).toFixed(2); }
 cambiarDescuento(valor: string) { estado().set('descuento', Number(valor)); }
 // fetch en vez de HttpClient: así el componente no necesita providers del shell.
 async ngOnInit() {
   try {
     const respuesta = await fetch(API + '/productos');
     this.productos.set(await respuesta.json());
   } catch {
     this.error.set('API apagada: no se pudieron cargar los productos.');
   }
 }
 agregar(p: Producto) {
   // Comunicación entre módulos: un aviso en window. Compras no sabe quién escucha.
   window.dispatchEvent(new CustomEvent('tienda:agregar', { detail: { id: p.id, nombre: p.nombre, precio: p.precio } }));
 }
}
