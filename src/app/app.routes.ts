
import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { BolnicaComponent } from './bolnica/bolnica';
import { DijagnozaComponent } from './dijagnoza/dijagnoza';
import { OdeljenjeComponent } from './odeljenje/odeljenje';
import { PacijentComponent } from './pacijent/pacijent';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'bolnice', component: BolnicaComponent },
  { path: 'dijagnoze', component: DijagnozaComponent },
  { path: 'odeljenja', component: OdeljenjeComponent },
  { path: 'pacijenti', component: PacijentComponent },
  { path: '**', redirectTo: '' }
];

