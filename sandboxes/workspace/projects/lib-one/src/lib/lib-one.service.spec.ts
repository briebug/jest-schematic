import { TestBed } from '@angular/core/testing';

import { LibOneService } from './lib-one.service';

describe('LibOneService', () => {
  let service: LibOneService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LibOneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
