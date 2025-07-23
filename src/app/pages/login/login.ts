import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [NgIf, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  error = '';
  isCheckingAuth = true;
  constructor(private auth: Auth, private router: Router) {
    setTimeout(() => {
      if (this.auth.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.isCheckingAuth = false;
      }
    }, 0);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      await this.auth.login(username, password);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = e?.message || 'Login failed. Please check your username and password.';
    }
  }

  onInput() {
    this.error = '';
  }
}
