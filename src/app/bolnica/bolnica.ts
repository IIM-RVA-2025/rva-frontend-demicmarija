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

@Component({
  selector: 'app-bolnica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bolnica.html',
  styleUrls: ['./bolnica.scss'],
})
export class BolnicaComponent {

  // FILTER
  filterControl = new FormControl('', { nonNullable: true });

  // FORMA za dodavanje/izmenu
  form!: FormGroup;
  editMode = false;
  editingId: number | null = null;

  // trigger za ponovno učitavanje liste
  private reload$ = new BehaviorSubject<void>(undefined);

  // async pipe-a
  bolniceFiltrirane$!: Observable<Bolnica[]>;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit() {
    // inicijalizacija forme
    this.form = this.fb.group({
      naziv: ['', Validators.required],
      adresa: ['', Validators.required],
      budzet: [0, [Validators.required, Validators.min(0)]],
    });

    // reload, povuče se lista bolnica
    const bolnice$ = this.reload$.pipe(
      switchMap(() =>
        this.http.get<Bolnica[]>('http://localhost:8080/bolnice')
      )
    );

    // lista bolnica + tekst iz filter
    this.bolniceFiltrirane$ = combineLatest([
      bolnice$,
      this.filterControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([bolnice, filterText]) => {
        const term = filterText.toLowerCase().trim();
        if (!term) {
          return bolnice;
        }
        return bolnice.filter(b =>
          b.naziv.toLowerCase().includes(term) ||
          b.adresa.toLowerCase().includes(term)
        );
      })
    );
  }

  // Sačuvaj
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const dto: Partial<Bolnica> = {
      naziv: value.naziv,
      adresa: value.adresa,
      budzet: value.budzet,
    };

    // Izmena
    if (this.editMode && this.editingId != null) {
      this.http
        .put<Bolnica>(`http://localhost:8080/bolnice/${this.editingId}`, dto)
        .subscribe(() => {
          this.resetForm();
          this.reload$.next(); // ponovo učitavamo listu
        });
    } else {
      // Nova bolnica
      this.http
        .post<Bolnica>('http://localhost:8080/bolnice', dto)
        .subscribe(() => {
          this.resetForm();
          this.reload$.next();
        });
    }
  }

  // popunjavamo formu podacima iz reda
  edit(b: Bolnica) {
    this.editMode = true;
    this.editingId = b.id;
    this.form.patchValue({
      naziv: b.naziv,
      adresa: b.adresa,
      budzet: b.budzet,
    });
  }

  cancelEdit() {
    this.resetForm();
  }

  delete(b: Bolnica) {
    if (!confirm(`Da li sigurno želiš da obrišeš bolnicu "${b.naziv}"?`)) {
      return;
    }

    this.http
      .delete(`http://localhost:8080/bolnice/${b.id}`)
      .subscribe(() => this.reload$.next());
  }

  private resetForm() {
    this.form.reset();
    this.form.patchValue({ budzet: 0 });
    this.editMode = false;
    this.editingId = null;
  }
}