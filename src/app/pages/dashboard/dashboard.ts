import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, NgFor, NgClass, DecimalPipe } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../../../constants/api';

@Component({
  selector: 'app-dashboard',
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, NgFor, NgClass, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnDestroy {
  user: any = null;
  nearbyUsers: any[] = [];
  locationStatus: 'not_found' | 'found' | 'denied' | 'error' | 'pending' = 'pending';
  isRequestingPermissions = false;
  errorMsg = '';
  locationPermissionState: 'granted' | 'denied' | 'prompt' | null = null;
  isLoaded = false;
  private socket: Socket | null = null;
  private lastLocationString: string | null = null;
  private pollInterval: any = null;

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initDashboard();
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.socket) this.socket.disconnect();
  }

  async initDashboard() {
    if (navigator.permissions) {
      await navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        this.locationPermissionState = result.state as any;
        result.onchange = () => {
          this.locationPermissionState = result.state as any;
        };
      });
    }
    await this.fetchUser();
    if (this.locationPermissionState === 'granted' && (!this.user?.location || !this.user.location.lat || !this.user.location.long)) {
      await this.askForLocationAccess();
    }
    this.isLoaded = true;
    this.checkAndConnectSocket();
  }

  async fetchUser() {
    const token = this.auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        this.user = data.user;
        if (this.user?.location?.lat && this.user?.location?.long) {
          this.locationStatus = 'found';
          this.tryUpdateLocation();
        } else {
          this.locationStatus = 'not_found';
        }
        this.checkAndConnectSocket();
      } else {
        console.error('Failed to fetch user:', data.message);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }

  checkAndConnectSocket() {
    if (this.user?.location?.lat && this.user?.location?.long) {
      const locString = `${this.user.location.lat},${this.user.location.long}`;
      if (this.lastLocationString === locString) return; // Already connected for this location
      this.lastLocationString = locString;
      if (this.socket) {
        this.socket.disconnect();
      }
      this.socket = io(API_URL.replace(/\/api$/, ''));
      this.socket.emit('user-info', {
        userId: this.user.id || this.user._id,
        location: this.user.location
      });
      this.socket.emit('update-location', {
        location: this.user.location
      });
      this.socket.on('nearby-user', (data: any) => {
        // Sort: online users first, then by distance ascending
        this.nearbyUsers = (data.users || []).sort((a: any, b: any) => {
          if (a.online === b.online) {
            return (a.distance ?? Infinity) - (b.distance ?? Infinity);
          }
          return a.online ? -1 : 1;
        });
        // console.log('[WebSocket nearby-user]', this.nearbyUsers);
        this.cdr.markForCheck();
      });
      // Poll every 5 seconds for updates
      this.pollInterval = setInterval(() => {
        if (this.socket && this.user?.location) {
          this.socket.emit('update-location', {
            location: this.user.location
          });
        }
      }, 5000);
    }
  }

  async tryUpdateLocation() {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      this.locationStatus = 'error';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const long = pos.coords.longitude;
        if (!this.user.location || this.user.location.lat !== lat || this.user.location.long !== long) {
          console.log('Updating user location to:', lat, long);
          await this.updateUserLocation(lat, long);
        } else {
          console.log('User location already up to date.');
        }
        this.locationStatus = 'found';
      },
      (err) => {
        console.error('Location access denied or error:', err);
        this.locationStatus = 'denied';
      }
    );
  }

  async updateUserLocation(lat: number, long: number) {
    const token = this.auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: { lat, long } })
      });
      const data = await res.json();
      if (res.ok) {
        this.user = data.user;
        // console.log('User location updated:', this.user.location);
        // Fetch latest user data to ensure UI is up to date
        await this.fetchUser();
      } else {
        console.error('Failed to update user location:', data.message);
      }
    } catch (err) {
      console.error('Error updating user location:', err);
    }
  }

  async askForLocationAccess(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.locationStatus = 'error';
        console.log('Geolocation not supported');
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const long = pos.coords.longitude;
          console.log('Location access granted:', lat, long);
          await this.updateUserLocation(lat, long);
          this.locationStatus = 'found';
          resolve(true);
        },
        (err) => {
          console.error('Location access denied:', err);
          this.locationStatus = 'denied';
          resolve(false);
        }
      );
    });
  }

  async askForRequiredPermissions() {
    this.isRequestingPermissions = true;
    this.errorMsg = '';
    let gotLocation = false;

    gotLocation = await this.askForLocationAccess();

    this.isRequestingPermissions = false;

    // Improved error handling and user messages
    if (!gotLocation) {
      this.errorMsg = 'Location access denied. You can still use location to find nearby users.';
    } else {
      this.errorMsg = '';
    }
  }

  enablePermissions() {
    this.askForRequiredPermissions();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
