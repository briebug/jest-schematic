import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LibOneComponent } from './lib-one.component';

describe('LibOneComponent', () => {
  let component: LibOneComponent;
  let fixture: ComponentFixture<LibOneComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [LibOneComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(LibOneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
