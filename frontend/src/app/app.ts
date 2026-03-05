import { Component, inject, computed, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatIconModule, MatTooltipModule, MatDividerModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private currentUrl = signal('');

  /** Show sidebar on authenticated pages except player view */
  showNav = computed(() => {
    const url = this.currentUrl();
    const loggedIn = this.auth.isLoggedIn();
    const isPublic = url.startsWith('/login') || url.startsWith('/register') || url.startsWith('/player/');
    return loggedIn && !isPublic;
  });

  ngOnInit() {
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(e => this.currentUrl.set(e.urlAfterRedirects));
  }

  logout() { this.auth.logout(); }
}
