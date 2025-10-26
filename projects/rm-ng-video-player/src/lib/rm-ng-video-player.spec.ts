import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RmNgVideoPlayer } from './rm-ng-video-player';

describe('RmNgVideoPlayer', () => {
  let component: RmNgVideoPlayer;
  let fixture: ComponentFixture<RmNgVideoPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RmNgVideoPlayer],
    }).compileComponents();

    fixture = TestBed.createComponent(RmNgVideoPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
