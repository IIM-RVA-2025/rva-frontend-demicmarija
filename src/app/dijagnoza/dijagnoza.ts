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

export interface Dijagnoza {
  id: number;
  naziv: string;
  opis: string;
}

@Component({
  selector: 'app-dijagnoza',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dijagnoza.html',
  styleUrls: ['./dijagnoza.scss'],
})
export class DijagnozaComponent {

  filterControl = new FormControl('', { nonNullable: true });

  form!: FormGroup;
  editMode = false;
  editingId: number | null = null;

  private reload$ = new BehaviorSubject<void>(undefined);

  dijagnozeFiltrirane$!: Observable<Dijagnoza[]>;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      naziv: ['', Validators.required],
      opis: ['', Validators.required],
    });

    const dijagnoze$ = this.reload$.pipe(
      switchMap(() =>
        this.http.get<Dijagnoza[]>('http://localhost:8080/dijagnoze')
      )
    );

    this.dijagnozeFiltrirane$ = combineLatest([
      dijagnoze$,
      this.filterControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([dijagnoze, filterText]) => {
        const term = filterText.toLowerCase().trim();
        if (!term) return dijagnoze;

        return dijagnoze.filter(d =>
          d.naziv.toLowerCase().includes(term) ||
          d.opis.toLowerCase().includes(term)
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
      opis: v.opis
    };

    if (this.editMode && this.editingId != null) {
      this.http
        .put(`http://localhost:8080/dijagnoze/${this.editingId}`, dto)
        .subscribe({
          next: () => {
            this.resetForm();
            this.reload$.next();
          }
        });
    } else {
      this.http
        .post('http://localhost:8080/dijagnoze', dto)
        .subscribe({
          next: () => {
            this.resetForm();
            this.reload$.next();
          }
        });
    }
  }

  edit(d: Dijagnoza) {
    this.editMode = true;
    this.editingId = d.id;
    this.form.patchValue({
      naziv: d.naziv,
      opis: d.opis
    });
  }

  cancelEdit() {
    this.resetForm();
  }

  delete(d: Dijagnoza) {
    if (!confirm(`Da li sigurno želiš da obrišeš dijagnozu "${d.naziv}"?`)) {
      return;
    }

    this.http
      .delete(`http://localhost:8080/dijagnoze/${d.id}`, { responseType: 'text' })
      .subscribe({
        next: () => this.reload$.next(),
        error: () =>
          alert('Ne može da se obriše — dijagnoza je možda vezana za pacijenta.')
      });
  }

  private resetForm() {
    this.form.reset();
    this.editMode = false;
    this.editingId = null;
  }
}
