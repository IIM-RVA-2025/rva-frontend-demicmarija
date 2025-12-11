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

@Component({
  selector: 'app-odeljenje',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './odeljenje.html',
  styleUrls: ['./odeljenje.scss'],
})
export class OdeljenjeComponent {

  filterControl = new FormControl('', { nonNullable: true });

  form!: FormGroup;
  editMode = false;
  editingId: number | null = null;

  private reload$ = new BehaviorSubject<void>(undefined);

  odeljenjaFiltrirana$!: Observable<Odeljenje[]>;
  bolnice$!: Observable<Bolnica[]>;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      naziv: ['', Validators.required],
      lokacija: ['', Validators.required],
      bolnicaId: [null, Validators.required],
    });

    this.bolnice$ = this.http.get<Bolnica[]>('http://localhost:8080/bolnice');

    const odeljenja$ = this.reload$.pipe(
      switchMap(() =>
        this.http.get<Odeljenje[]>('http://localhost:8080/odeljenja')
      )
    );

    this.odeljenjaFiltrirana$ = combineLatest([
      odeljenja$,
      this.filterControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([odeljenja, filterText]) => {
        const term = filterText.toLowerCase().trim();
        if (!term) return odeljenja;

        return odeljenja.filter(o =>
          o.naziv.toLowerCase().includes(term) ||
          o.lokacija.toLowerCase().includes(term) ||
          (o.bolnica?.naziv?.toLowerCase().includes(term) ?? false)
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

    const dto = {
      naziv: v.naziv,
      lokacija: v.lokacija,
      bolnica: { id: v.bolnicaId }
    };

    if (this.editMode && this.editingId != null) {
      this.http
        .put(`http://localhost:8080/odeljenja/${this.editingId}`, dto)
        .subscribe({
          next: () => {
            this.resetForm();
            this.reload$.next();
          }
        });
    } else {
      this.http
        .post('http://localhost:8080/odeljenja', dto)
        .subscribe({
          next: () => {
            this.resetForm();
            this.reload$.next();
          }
        });
    }
  }

  edit(o: Odeljenje) {
    this.editMode = true;
    this.editingId = o.id;
    this.form.patchValue({
      naziv: o.naziv,
      lokacija: o.lokacija,
      bolnicaId: o.bolnica?.id ?? null
    });
  }

  cancelEdit() {
    this.resetForm();
  }

  delete(o: Odeljenje) {
    if (!confirm(`Da li sigurno želiš da obrišeš odeljenje "${o.naziv}"?`)) {
      return;
    }

    this.http
      .delete(`http://localhost:8080/odeljenja/${o.id}`, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.reload$.next();
        },
        error: () => {
          alert('Ne može da se obriše — verovatno postoji veza sa drugim podacima.');
        }
      });
  }

  private resetForm() {
    this.form.reset();
    this.editMode = false;
    this.editingId = null;
  }
}
