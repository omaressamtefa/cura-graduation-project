import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllpatientsComponent } from './allpatients.component';

describe('AllpatientsComponent', () => {
  let component: AllpatientsComponent;
  let fixture: ComponentFixture<AllpatientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllpatientsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllpatientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
