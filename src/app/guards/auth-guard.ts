import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

export const authGuard: CanActivateFn = (route, state) => {
  const token = getCookie('token');
  if (token) {
    return true;
  } else {
    const router = inject(Router);
    return router.createUrlTree(['/login']);
  }
};
