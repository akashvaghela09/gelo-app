import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../services/auth';

function generateUsername(name: string) {
  const base = name.replace(/\s+/g, '').toLowerCase();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${base}${rand}`;
}

@Component({
  selector: 'app-register',
  imports: [NgIf, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  error = '';
  generatedUsername = '';
  isCheckingAuth = true;
  private lastName = '';

  constructor(private auth: Auth, private router: Router) {
    setTimeout(() => {
      if (this.auth.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.isCheckingAuth = false;
      }
    }, 0);
  }

  onNameInput(event: Event) {
    const name = (event.target as HTMLInputElement).value;
    this.lastName = name;
    this.generatedUsername = name ? generateUsername(name) : '';
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const user = {
      username: this.generatedUsername || generateUsername(name),
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
      name,
      contactNumber: (form.elements.namedItem('contactNumber') as HTMLInputElement).value,
      shortBio: (form.elements.namedItem('shortBio') as HTMLInputElement).value
    };
    try {
      await this.auth.register(user);
      this.router.navigate(['/login']);
    } catch (e: any) {
      this.error = e.message || 'Registration failed. Please try again.';
    }
  }
}
