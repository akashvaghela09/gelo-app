import { Component } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../services/auth';

function generateRandomUsername() {
  return 'user' + Math.floor(1000000000 + Math.random() * 9000000000);
}

@Component({
  selector: 'app-register',
  imports: [NgIf, NgClass, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  error = '';
  isCheckingAuth = true;
  usernameAvailable: boolean | null = null;
  usernameFocused = false;
  private usernameDebounce: any;
  username = '';
  private usernameManuallyEdited = false;

  constructor(private auth: Auth, private router: Router) {
    setTimeout(() => {
      if (this.auth.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.isCheckingAuth = false;
        this.username = generateRandomUsername();
      }
    }, 0);
  }

  onUsernameInput(event: Event) {
    const username = (event.target as HTMLInputElement).value.trim();
    this.username = username;
    this.usernameManuallyEdited = true;
    this.usernameAvailable = null;
    if (this.usernameDebounce) clearTimeout(this.usernameDebounce);
    if (!username) return;
    this.usernameDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        this.usernameAvailable = data.available;
      } catch (e) {
        this.usernameAvailable = null;
      }
    }, 400);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const user = {
      username: (form.elements.namedItem('username') as HTMLInputElement).value.trim().toLowerCase(), // Username will be stored in lowercase
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      contactNumber: (form.elements.namedItem('contactNumber') as HTMLInputElement).value,
      shortBio: (form.elements.namedItem('shortBio') as HTMLInputElement).value
    };
    // Note: Usernames are always stored in lowercase, regardless of what you enter.
    if (this.usernameAvailable === false) {
      this.error = 'Username is not available.';
      return;
    }
    try {
      await this.auth.register(user);
      this.router.navigate(['/login']);
    } catch (e: any) {
      this.error = e.message || 'Registration failed. Please try again.';
    }
  }
}
