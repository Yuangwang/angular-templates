import {
  Component,
  HostListener,
  Renderer2,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { CommonModule, Location, NgOptimizedImage } from '@angular/common';
import { MODAL_DATA, ModalController } from '@ngx-templates/shared/modal';
import { IconComponent } from '@ngx-templates/shared/icon';
import { toSignal } from '@angular/core/rxjs-interop';

import { Image } from '../../../shared/image';
import { ImagesService } from '../images.service';

// Max image dimensions relative to the viewport
const IMG_MAX_WIDTH = '70vw';
const IMG_MAX_HEIGHT = '90vh';

// Navigation animation duration
const ANIM_DURATION = 250;

const PREVIEW_IMG_WIDTH = 1200;

type AnimationType = 'none' | 'slide-left' | 'slide-right';

export type ImagePreviewData = {
  imageIdx: number;
  imagesService: ImagesService;
};

@Component({
  selector: 'ig-image-preview',
  standalone: true,
  imports: [CommonModule, IconComponent, NgOptimizedImage],
  templateUrl: './image-preview.component.html',
  styleUrl: './image-preview.component.scss',
})
export class ImagePreviewComponent {
  data = inject<ImagePreviewData>(MODAL_DATA);
  ctrl = inject<ModalController<void>>(ModalController);

  private _router = inject(Router);
  private _location = inject(Location);
  private _renderer = inject(Renderer2);

  idx = signal<number>(this.data.imageIdx);
  animation = signal<AnimationType>('none');
  showImage = signal<boolean>(true);

  image = computed<Image>(
    () =>
      this.data.imagesService.previewImages().get(this.idx()) || new Image({}),
  );

  // Modify according to your image CDN along with the `NgOptimizedImage`
  src = computed(() => {
    const src = this.image().src.split('.').shift();
    if (!src) {
      return this.image().src;
    }
    return src + '-' + PREVIEW_IMG_WIDTH + 'w.webp';
  });

  size = computed(() => ({
    width: PREVIEW_IMG_WIDTH,
    height: PREVIEW_IMG_WIDTH * (this.image().height / this.image().width),
  }));

  imagesTotal = this.data.imagesService.totalSize;

  IMG_MAX_WIDTH = IMG_MAX_WIDTH;
  IMG_MAX_HEIGHT = IMG_MAX_HEIGHT;
  ANIM_DURATION = ANIM_DURATION;

  aspectRatio = computed(() => this.image().width / this.image().height);

  constructor() {
    const routerEvents = toSignal(this._router.events);

    effect(() => {
      const event = routerEvents();

      // Todo(Georgi): Handle browser history nav (back and forward)
      if (event instanceof NavigationEnd) {
        console.log('route change');
      }
    });

    effect(() => {
      const idx = this.idx();
      untracked(() => this.data.imagesService.loadImageForPreview(idx));
    });
  }

  @HostListener('document:keydown.arrowright')
  previewNext() {
    if (this.idx() === this.imagesTotal() - 1) {
      return;
    }

    this._animate('slide-left', () => {
      if (this.idx() < this.imagesTotal() - 1) {
        this.idx.update((idx) => idx + 1);
        this._location.go('img/' + this.idx());
      }
    });
  }

  @HostListener('document:keydown.arrowleft')
  previewPrev() {
    if (this.idx() === 0) {
      return;
    }

    this._animate('slide-right', () => {
      if (this.idx() > 0) {
        this.idx.update((idx) => idx - 1);
        this._location.go('img/' + this.idx());
      }
    });
  }

  /**
   * Downloads the source/original image.
   */
  download() {
    const anchor = this._renderer.createElement('a') as HTMLAnchorElement;
    this._renderer.setAttribute(anchor, 'href', this.image().src);
    this._renderer.setAttribute(anchor, 'download', '');
    anchor.click();
  }

  private _animate(
    anim: 'slide-left' | 'slide-right',
    completedCb: () => void,
  ) {
    this.animation.set(anim);

    setTimeout(() => {
      completedCb();

      // Since we want to re-render the image element with the new
      // source after the completion of the animation. If we don't
      // do that, we might have unwanted flash effect after the
      // animation completes (the previous image will appear for
      // a moment).
      this.showImage.set(false);
      setTimeout(() => {
        this.showImage.set(true);
        this.animation.set('none');
      });
    }, ANIM_DURATION);
  }
}
