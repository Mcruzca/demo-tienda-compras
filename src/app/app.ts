import { Component } from '@angular/core';
import { ComprasComponent } from './compras.component';
@Component({ selector: 'app-root', imports: [ComprasComponent], template: '<h1>Compras por separado</h1><app-compras />' })
export class App {}
