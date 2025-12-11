import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

export interface Bolnica {
  id: number;
  naziv: string;
  adresa: string;
  budzet: number;
}

export interface Odeljenje {
  id: number;
  naziv: string;
  lokacija: string;
  bolnica?: Bolnica | null;
}

export interface Dijagnoza {
  id: number;
  naziv: string;
  opis: string;
}

export interface Pacijent {
  id: number;
  ime: string;
  prezime: string;
  godiste: number;
  zdravstvenoOsiguranje: boolean;
  odeljenje?: Odeljenje | null;
  dijagnoza?: Dijagnoza | null;
}

@Component({
  selector: 'app-pacijent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pacijent.html',
  styleUrls: ['./pacijent.scss'],
})
export class PacijentComponent {

  // filter
  filterControl = new FormControl('', { nonNullable: true });

  // forma
  form!: FormGroup;
  editMode = false;
  editingId: number | null = null;

  // re-load trigger
  private reload$ = new BehaviorSubject<void>(undefined);

  // podaci
  pacijentiFiltrirani$!: Observable<Pacijent[]>;
  odeljenja$!: Observable<Odeljenje[]>;
  dijagnoze$!: Observable<Dijagnoza[]>;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit() {
    // forma
    this.form = this.fb.group({
      ime: ['', Validators.required],
      prezime: ['', Validators.required],
      godiste: [2000, [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear())]],
      zdravstvenoOsiguranje: [false],
      odeljenjeId: [null, Validators.required],
      dijagnozaId: [null, Validators.required],
    });

    // dropdown liste
    this.odeljenja$ = this.http.get<Odeljenje[]>('http://localhost:8080/odeljenja');
    this.dijagnoze$ = this.http.get<Dijagnoza[]>('http://localhost:8080/dijagnoze');

    // pacijenti
    const pacijenti$ = this.reload$.pipe(
      switchMap(() =>
        this.http.get<Pacijent[]>('http://localhost:8080/pacijenti')
      )
    );

    this.pacijentiFiltrirani$ = combineLatest([
      pacijenti$,
      this.filterControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([pacijenti, filterText]) => {
        const term = filterText.toLowerCase().trim();
        if (!term) return pacijenti;

        return pacijenti.filter(p =>
          p.ime.toLowerCase().includes(term) ||
          p.prezime.toLowerCase().includes(term) ||
          (p.odeljenje?.naziv?.toLowerCase().includes(term) ?? false) ||
          (p.dijagnoza?.naziv?.toLowerCase().includes(term) ?? false)
        );
      })
    );
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;

    const dto: any = {
      ime: v.ime,
      prezime: v.prezime,
      godiste: v.godiste,
      zdravstvenoOsiguranje: v.zdravstvenoOsiguranje,
      odeljenje: v.odeljenjeId ? { id: v.odeljenjeId } : null,
      dijagnoza: v.dijagnozaId ? { id: v.dijagnozaId } : null
    };

    if (this.editMode && this.editingId != null) {
      // izmena
      this.http
        .put<Pacijent>(`http://localhost:8080/pacijenti/${this.editingId}`, dto)
        .subscribe(() => {
          this.resetForm();
          this.reload$.next();
        });
    } else {
      // novi pacijent
      this.http
        .post<Pacijent>('http://localhost:8080/pacijenti', dto)
        .subscribe(() => {
          this.resetForm();
          this.reload$.next();
        });
    }
  }

  edit(p: Pacijent) {
    this.editMode = true;
    this.editingId = p.id;
    this.form.patchValue({
      ime: p.ime,
      prezime: p.prezime,
      godiste: p.godiste,
      zdravstvenoOsiguranje: !!p.zdravstvenoOsiguranje,
      odeljenjeId: p.odeljenje?.id ?? null,
      dijagnozaId: p.dijagnoza?.id ?? null,
    });
  }

  cancelEdit() {
    this.resetForm();
  }

  delete(p: Pacijent) {
    if (!confirm(`Da li sigurno želiš da obrišeš pacijenta "${p.ime} ${p.prezime}"?`)) {
      return;
    }

    this.http
      .delete(`http://localhost:8080/pacijenti/${p.id}`)
      .subscribe(() => this.reload$.next());
  }

  private resetForm() {
    this.form.reset();
    this.form.patchValue({
      godiste: 2000,
      zdravstvenoOsiguranje: false,
      odeljenjeId: null,
      dijagnozaId: null
    });
    this.editMode = false;
    this.editingId = null;
  }
}
