import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurgicalPhaseComponent } from './surgical-phase.component';

describe('SurgicalPhaseComponent', () => {
  let component: SurgicalPhaseComponent;
  let fixture: ComponentFixture<SurgicalPhaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SurgicalPhaseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SurgicalPhaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
