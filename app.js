// Cinema Ticket Reservation Application
// Main Application Logic

// ==================== DATA MODELS & STORAGE ====================

const STORAGE_KEYS = {
    MOVIES: 'cinema_movies',
    RESERVATIONS: 'cinema_reservations',
    CUSTOMERS: 'cinema_customers',
    ADMIN_SESSION: 'cinema_admin_session',
    USE_SUPABASE: 'cinema_use_supabase'
};

// Supabase configuration
let supabase = null;
let useSupabase = false;

// Supabase credentials (replace with your actual credentials)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Seat layout configuration
const SEAT_LAYOUT = [
    ['4A', '3A', '2A', '1A'],
    ['1B'],
    ['1C']
];

const SEAT_PRICE = 12;

// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'Moi et pas toi',
    password: 'pataterie hulloise'
};

// Default movies data
const DEFAULT_MOVIES = [
    {
        id: '1',
        poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        title: 'Inside Out 2',
        description: 'Follow Riley, now a teenager, as she navigates the complexities of growing up with new emotions joining the mix.',
        duration: '1h 36m',
        genre: 'Animation',
        ageRating: 'PG',
        showtime: '19:00',
        price: 12
    },
    {
        id: '2',
        poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        title: 'Oppenheimer',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        duration: '3h 0m',
        genre: 'Drama',
        ageRating: 'R',
        showtime: '20:30',
        price: 15
    },
    {
        id: '3',
        poster: 'https://image.tmdb.org/t/p/w500/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against those who destroyed his family.',
        duration: '2h 46m',
        genre: 'Sci-Fi',
        ageRating: 'PG-13',
        showtime: '21:00',
        price: 14
    }
];

// LocalStorage utilities
const Storage = {
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error reading from storage: ${error}`);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to storage: ${error}`);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from storage: ${error}`);
            return false;
        }
    }
};

// Data management
const DataManager = {
    async initializeSupabase() {
        try {
            if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                
                // Test connection by trying to read movies
                const { data, error } = await supabase.from('movies').select('*').limit(1);
                
                if (error) throw error;
                
                useSupabase = true;
                Storage.set(STORAGE_KEYS.USE_SUPABASE, true);
                console.log('Supabase connected successfully');
                Utils.showToast('Connected to Supabase', 'success');
                return true;
            }
        } catch (error) {
            console.warn('Supabase connection failed, falling back to LocalStorage:', error);
            useSupabase = false;
            Storage.set(STORAGE_KEYS.USE_SUPABASE, false);
            Utils.showToast('Using LocalStorage (Supabase unavailable)', 'warning');
            return false;
        }
    },

    async getMovies() {
        if (useSupabase && supabase) {
            try {
                const { data, error } = await supabase.from('movies').select('*');
                if (error) throw error;
                return data && data.length > 0 ? data : DEFAULT_MOVIES;
            } catch (error) {
                console.warn('Supabase read failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.get(STORAGE_KEYS.MOVIES, DEFAULT_MOVIES);
            }
        }
        return Storage.get(STORAGE_KEYS.MOVIES, DEFAULT_MOVIES);
    },

    async saveMovies(movies) {
        if (useSupabase && supabase) {
            try {
                // Delete all existing movies
                await supabase.from('movies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                
                // Insert all movies
                const { error } = await supabase.from('movies').insert(movies);
                if (error) throw error;
                return true;
            } catch (error) {
                console.warn('Supabase write failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.set(STORAGE_KEYS.MOVIES, movies);
            }
        }
        return Storage.set(STORAGE_KEYS.MOVIES, movies);
    },

    async getReservations() {
        if (useSupabase && supabase) {
            try {
                const { data, error } = await supabase.from('reservations').select('*');
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.warn('Supabase read failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.get(STORAGE_KEYS.RESERVATIONS, []);
            }
        }
        return Storage.get(STORAGE_KEYS.RESERVATIONS, []);
    },

    async saveReservations(reservations) {
        if (useSupabase && supabase) {
            try {
                // Delete all existing reservations
                await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                
                // Insert all reservations
                const { error } = await supabase.from('reservations').insert(reservations);
                if (error) throw error;
                return true;
            } catch (error) {
                console.warn('Supabase write failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.set(STORAGE_KEYS.RESERVATIONS, reservations);
            }
        }
        return Storage.set(STORAGE_KEYS.RESERVATIONS, reservations);
    },

    async getCustomers() {
        if (useSupabase && supabase) {
            try {
                const { data, error } = await supabase.from('customers').select('*');
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.warn('Supabase read failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.get(STORAGE_KEYS.CUSTOMERS, []);
            }
        }
        return Storage.get(STORAGE_KEYS.CUSTOMERS, []);
    },

    async saveCustomers(customers) {
        if (useSupabase && supabase) {
            try {
                // Delete all existing customers
                await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                
                // Insert all customers
                const { error } = await supabase.from('customers').insert(customers);
                if (error) throw error;
                return true;
            } catch (error) {
                console.warn('Supabase write failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.set(STORAGE_KEYS.CUSTOMERS, customers);
            }
        }
        return Storage.set(STORAGE_KEYS.CUSTOMERS, customers);
    },

    getAdminSession() {
        return Storage.get(STORAGE_KEYS.ADMIN_SESSION, null);
    },

    setAdminSession(session) {
        return Storage.set(STORAGE_KEYS.ADMIN_SESSION, session);
    },

    clearAdminSession() {
        return Storage.remove(STORAGE_KEYS.ADMIN_SESSION);
    },

    async initializeData() {
        // Try Supabase first, fall back to LocalStorage
        await this.initializeSupabase();
        
        if (!Storage.get(STORAGE_KEYS.MOVIES)) {
            this.saveMovies(DEFAULT_MOVIES);
        }
    }
};

// ==================== UTILITY FUNCTIONS ====================

const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatTime(time) {
        if (!time) return 'TBD';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    },

    formatCurrency(amount) {
        return `$${amount.toFixed(2)}`;
    },

    async getReservedSeats(movieId) {
        const reservations = await DataManager.getReservations();
        return reservations
            .filter(r => r.movieId === movieId)
            .map(r => r.seat);
    },

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} active`;
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    },

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
};

// ==================== APPLICATION STATE ====================

const AppState = {
    selectedMovie: null,
    selectedSeats: [],
    currentReservation: null,
    adminLoggedIn: false,
    adminSessionTimeout: null,
    confirmCallback: null
};

// ==================== MOVIE MANAGEMENT ====================

const MovieManager = {
    async renderMovies(movies = null) {
        const allMovies = movies || await DataManager.getMovies();
        const grid = document.getElementById('moviesGrid');
        
        if (allMovies.length === 0) {
            grid.innerHTML = '<p class="loading">No movies currently showing</p>';
            return;
        }

        grid.innerHTML = allMovies.map(movie => `
            <div class="movie-card" data-movie-id="${movie.id}">
                <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'">
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span class="movie-tag">${movie.genre}</span>
                        <span class="movie-tag">${movie.duration}</span>
                        <span class="movie-tag">${movie.ageRating}</span>
                    </div>
                    <p class="movie-description">${movie.description}</p>
                    <p style="margin-top: 0.5rem; color: var(--accent);">${Utils.formatTime(movie.showtime)} - ${Utils.formatCurrency(movie.price)}</p>
                </div>
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                const movie = allMovies.find(m => m.id === movieId);
                this.showMovieDetail(movie);
            });
        });
    },

    showMovieDetail(movie) {
        AppState.selectedMovie = movie;
        const detail = document.getElementById('movieDetail');
        
        detail.innerHTML = `
            <div class="movie-detail-content">
                <img src="${movie.poster}" alt="${movie.title}" class="movie-detail-poster" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'">
                <div class="movie-detail-info">
                    <h3>${movie.title}</h3>
                    <div class="movie-detail-meta">
                        <span class="meta-item">🎬 ${movie.genre}</span>
                        <span class="meta-item">⏱️ ${movie.duration}</span>
                        <span class="meta-item">🔞 ${movie.ageRating}</span>
                        <span class="meta-item">🕐 ${Utils.formatTime(movie.showtime)}</span>
                        <span class="meta-item">💰 ${Utils.formatCurrency(movie.price)}</span>
                    </div>
                    <p class="movie-detail-description">${movie.description}</p>
                    <button class="select-seats-btn" id="selectSeatsBtn">Select Seats</button>
                </div>
            </div>
        `;

        document.getElementById('selectSeatsBtn').addEventListener('click', () => {
            SeatManager.renderSeats(movie);
            Utils.showSection('seatSection');
        });

        Utils.showSection('movieDetailSection');
    },

    async filterMovies(searchTerm, genre) {
        const movies = await DataManager.getMovies();
        const filtered = movies.filter(movie => {
            const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 movie.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesGenre = !genre || movie.genre === genre;
            return matchesSearch && matchesGenre;
        });
        this.renderMovies(filtered);
    }
};

// ==================== SEAT MANAGEMENT ====================

const SeatManager = {
    async renderSeats(movie) {
        const layout = document.getElementById('seatingLayout');
        const reservedSeats = await Utils.getReservedSeats(movie.id);
        
        layout.innerHTML = SEAT_LAYOUT.map(row => `
            <div class="seating-row">
                ${row.map(seat => {
                    const isReserved = reservedSeats.includes(seat);
                    const status = isReserved ? 'reserved' : 'available';
                    return `<div class="seat ${status}" data-seat="${seat}">${seat}</div>`;
                }).join('')}
            </div>
        `).join('');

        // Add click handlers
        layout.querySelectorAll('.seat.available').forEach(seat => {
            seat.addEventListener('click', () => this.toggleSeat(seat));
        });

        AppState.selectedSeats = [];
        this.updateSelectedSeatsDisplay();
    },

    toggleSeat(seatElement) {
        const seat = seatElement.dataset.seat;
        
        if (seatElement.classList.contains('selected')) {
            seatElement.classList.remove('selected');
            seatElement.classList.add('available');
            AppState.selectedSeats = AppState.selectedSeats.filter(s => s !== seat);
        } else {
            seatElement.classList.remove('available');
            seatElement.classList.add('selected');
            AppState.selectedSeats.push(seat);
        }

        this.updateSelectedSeatsDisplay();
    },

    updateSelectedSeatsDisplay() {
        const display = document.getElementById('selectedSeatsDisplay');
        const total = document.getElementById('totalPrice');
        const proceedBtn = document.getElementById('proceedToCheckoutBtn');

        if (AppState.selectedSeats.length === 0) {
            display.textContent = 'None';
            total.textContent = '0';
            proceedBtn.disabled = true;
        } else {
            display.textContent = AppState.selectedSeats.join(', ');
            const totalPrice = AppState.selectedSeats.length * (AppState.selectedMovie?.price || SEAT_PRICE);
            total.textContent = totalPrice.toFixed(2);
            proceedBtn.disabled = false;
        }
    }
};

// ==================== CHECKOUT MANAGEMENT ====================

const CheckoutManager = {
    renderCheckout() {
        const summary = document.getElementById('checkoutSummary');
        const totalPrice = AppState.selectedSeats.length * (AppState.selectedMovie?.price || SEAT_PRICE);

        summary.innerHTML = `
            <p><strong>Movie:</strong> ${AppState.selectedMovie?.title}</p>
            <p><strong>Showtime:</strong> ${Utils.formatTime(AppState.selectedMovie?.showtime)}</p>
            <p><strong>Seats:</strong> ${AppState.selectedSeats.join(', ')}</p>
            <p><strong>Total:</strong> ${Utils.formatCurrency(totalPrice)}</p>
        `;

        Utils.showSection('checkoutSection');
    },

    async processReservation(customerData) {
        const reservation = {
            id: Utils.generateId(),
            movieId: AppState.selectedMovie.id,
            movieTitle: AppState.selectedMovie.title,
            seat: AppState.selectedSeats.join(', '),
            customerName: customerData.fullName,
            customerEmail: customerData.email,
            customerPhone: customerData.phone,
            purchaseDate: new Date().toISOString(),
            price: AppState.selectedSeats.length * (AppState.selectedMovie?.price || SEAT_PRICE)
        };

        // Save reservation
        const reservations = await DataManager.getReservations();
        reservations.push(reservation);
        await DataManager.saveReservations(reservations);

        // Update customer data
        await this.updateCustomerData(customerData, reservation);

        AppState.currentReservation = reservation;
        this.showConfirmation(reservation);
    },

    async updateCustomerData(customerData, reservation) {
        const customers = await DataManager.getCustomers();
        const existingCustomer = customers.find(c => c.email === customerData.email);

        if (existingCustomer) {
            existingCustomer.phone = customerData.phone;
            existingCustomer.reservationHistory.push(reservation.id);
            existingCustomer.totalReservations++;
        } else {
            customers.push({
                id: Utils.generateId(),
                name: customerData.fullName,
                email: customerData.email,
                phone: customerData.phone,
                reservationHistory: [reservation.id],
                totalReservations: 1
            });
        }

        await DataManager.saveCustomers(customers);
    },

    showConfirmation(reservation) {
        const details = document.getElementById('confirmationDetails');
        const qrCode = document.getElementById('qrCode');

        details.innerHTML = `
            <p><strong>Reservation ID:</strong> ${reservation.id}</p>
            <p><strong>Movie:</strong> ${reservation.movieTitle}</p>
            <p><strong>Seats:</strong> ${reservation.seat}</p>
            <p><strong>Date:</strong> ${Utils.formatDate(reservation.purchaseDate)}</p>
            <p><strong>Total Paid:</strong> ${Utils.formatCurrency(reservation.price)}</p>
        `;

        // Generate QR code using a simple API
        qrCode.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(reservation))}" alt="QR Code">`;

        Utils.showSection('confirmationSection');
        Utils.showToast('Reservation confirmed successfully!', 'success');
    },

    reset() {
        AppState.selectedMovie = null;
        AppState.selectedSeats = [];
        AppState.currentReservation = null;
        document.getElementById('customerForm').reset();
    }
};

// ==================== ADMIN MANAGEMENT ====================

const AdminManager = {
    login(username, password) {
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            const session = {
                username,
                loginTime: new Date().toISOString()
            };
            DataManager.setAdminSession(session);
            AppState.adminLoggedIn = true;
            this.startSessionTimeout();
            return true;
        }
        return false;
    },

    logout() {
        DataManager.clearAdminSession();
        AppState.adminLoggedIn = false;
        this.clearSessionTimeout();
        Utils.showSection('homeSection');
        Utils.showToast('Logged out successfully', 'success');
    },

    checkSession() {
        const session = DataManager.getAdminSession();
        if (session) {
            AppState.adminLoggedIn = true;
            this.startSessionTimeout();
            return true;
        }
        return false;
    },

    startSessionTimeout() {
        this.clearSessionTimeout();
        AppState.adminSessionTimeout = setTimeout(() => {
            this.logout();
            Utils.showToast('Session expired due to inactivity', 'error');
        }, 30 * 60 * 1000); // 30 minutes
    },

    clearSessionTimeout() {
        if (AppState.adminSessionTimeout) {
            clearTimeout(AppState.adminSessionTimeout);
            AppState.adminSessionTimeout = null;
        }
    },

    async renderDashboard() {
        await this.updateStats();
        await this.renderReservations();
        await this.renderAdminMovies();
        await this.renderCustomers();
    },

    async updateStats() {
        const reservations = await DataManager.getReservations();
        const movies = await DataManager.getMovies();
        const customers = await DataManager.getCustomers();
        const totalSeats = SEAT_LAYOUT.flat().length;
        const occupiedSeats = reservations.length;
        const availableSeats = totalSeats - occupiedSeats;
        const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats * 100).toFixed(1) : 0;
        const totalRevenue = reservations.reduce((sum, r) => sum + (r.price || 0), 0);

        document.getElementById('totalReservations').textContent = reservations.length;
        document.getElementById('availableSeats').textContent = availableSeats;
        document.getElementById('occupiedSeats').textContent = occupiedSeats;
        document.getElementById('totalMovies').textContent = movies.length;
        document.getElementById('totalRevenue').textContent = Utils.formatCurrency(totalRevenue);
        document.getElementById('occupancyRate').textContent = `${occupancyRate}%`;
    },

    async renderReservations() {
        const reservations = await DataManager.getReservations();
        const tbody = document.querySelector('#reservationsTable tbody');

        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No reservations yet</td></tr>';
            return;
        }

        tbody.innerHTML = reservations.map(reservation => `
            <tr>
                <td>${reservation.id}</td>
                <td>${reservation.customerName}</td>
                <td>${reservation.customerEmail}</td>
                <td>${reservation.customerPhone}</td>
                <td>${reservation.movieTitle}</td>
                <td>${reservation.seat}</td>
                <td>${Utils.formatDate(reservation.purchaseDate)}</td>
                <td>
                    <button class="btn danger-btn cancel-reservation-btn" data-reservation-id="${reservation.id}">Cancel</button>
                </td>
            </tr>
        `).join('');

        // Add cancel handlers
        tbody.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const reservationId = btn.dataset.reservationId;
                this.confirmCancelReservation(reservationId);
            });
        });
    },

    async cancelReservation(reservationId) {
        const reservations = await DataManager.getReservations();
        const index = reservations.findIndex(r => r.id === reservationId);
        
        if (index !== -1) {
            reservations.splice(index, 1);
            await DataManager.saveReservations(reservations);
            await this.renderDashboard();
            Utils.showToast('Reservation cancelled successfully', 'success');
        }
    },

    confirmCancelReservation(reservationId) {
        AppState.confirmCallback = () => this.cancelReservation(reservationId);
        document.getElementById('confirmMessage').textContent = 'Are you sure you want to cancel this reservation?';
        Utils.showModal('confirmModal');
    },

    async renderAdminMovies() {
        const movies = await DataManager.getMovies();
        const grid = document.getElementById('adminMoviesGrid');

        if (movies.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No movies available</p>';
            return;
        }

        grid.innerHTML = movies.map(movie => `
            <div class="admin-movie-card">
                <img src="${movie.poster}" alt="${movie.title}" class="admin-movie-poster" onerror="this.src='https://via.placeholder.com/250x300?text=No+Poster'">
                <div class="admin-movie-info">
                    <h4>${movie.title}</h4>
                    <p>${movie.genre} • ${movie.duration} • ${movie.ageRating}</p>
                    <p>${Utils.formatTime(movie.showtime)} • ${Utils.formatCurrency(movie.price)}</p>
                    <div class="admin-movie-actions">
                        <button class="btn secondary-btn edit-movie-btn" data-movie-id="${movie.id}">Edit</button>
                        <button class="btn danger-btn delete-movie-btn" data-movie-id="${movie.id}">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add edit handlers
        grid.querySelectorAll('.edit-movie-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const movieId = btn.dataset.movieId;
                this.openMovieModal(movieId);
            });
        });

        // Add delete handlers
        grid.querySelectorAll('.delete-movie-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const movieId = btn.dataset.movieId;
                this.confirmDeleteMovie(movieId);
            });
        });
    },

    openMovieModal(movieId = null) {
        const modal = document.getElementById('adminModal');
        const form = document.getElementById('movieForm');
        const title = document.getElementById('modalTitle');

        form.reset();

        if (movieId) {
            const movie = DataManager.getMovies().find(m => m.id === movieId);
            if (movie) {
                title.textContent = 'Edit Movie';
                document.getElementById('movieId').value = movie.id;
                document.getElementById('moviePoster').value = movie.poster;
                document.getElementById('movieTitle').value = movie.title;
                document.getElementById('movieDescription').value = movie.description;
                document.getElementById('movieDuration').value = movie.duration;
                document.getElementById('movieGenre').value = movie.genre;
                document.getElementById('movieAgeRating').value = movie.ageRating;
                document.getElementById('movieShowtime').value = movie.showtime;
                document.getElementById('moviePrice').value = movie.price;
            }
        } else {
            title.textContent = 'Add Movie';
            document.getElementById('movieId').value = '';
        }

        Utils.showModal('adminModal');
    },

    async saveMovie(formData) {
        const movies = await DataManager.getMovies();
        const movieId = formData.get('movieId');

        const movieData = {
            poster: formData.get('moviePoster'),
            title: formData.get('movieTitle'),
            description: formData.get('movieDescription'),
            duration: formData.get('movieDuration'),
            genre: formData.get('movieGenre'),
            ageRating: formData.get('movieAgeRating'),
            showtime: formData.get('movieShowtime'),
            price: parseFloat(formData.get('moviePrice'))
        };

        if (movieId) {
            // Edit existing movie
            const index = movies.findIndex(m => m.id === movieId);
            if (index !== -1) {
                movies[index] = { ...movies[index], ...movieData };
            }
        } else {
            // Add new movie
            movieData.id = Utils.generateId();
            movies.push(movieData);
        }

        await DataManager.saveMovies(movies);
        Utils.hideModal('adminModal');
        await this.renderDashboard();
        await MovieManager.renderMovies();
        Utils.showToast(movieId ? 'Movie updated successfully' : 'Movie added successfully', 'success');
    },

    confirmDeleteMovie(movieId) {
        AppState.confirmCallback = () => this.deleteMovie(movieId);
        document.getElementById('confirmMessage').textContent = 'Are you sure you want to delete this movie?';
        Utils.showModal('confirmModal');
    },

    async deleteMovie(movieId) {
        const movies = await DataManager.getMovies();
        const index = movies.findIndex(m => m.id === movieId);
        
        if (index !== -1) {
            movies.splice(index, 1);
            await DataManager.saveMovies(movies);
            await this.renderDashboard();
            await MovieManager.renderMovies();
            Utils.showToast('Movie deleted successfully', 'success');
        }
    },

    async renderCustomers() {
        const customers = await DataManager.getCustomers();
        const tbody = document.querySelector('#customersTable tbody');

        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No customers yet</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${customer.totalReservations}</td>
                <td>${customer.reservationHistory.join(', ')}</td>
            </tr>
        `).join('');
    },

    async exportReservationsToCSV() {
        const reservations = await DataManager.getReservations();
        
        if (reservations.length === 0) {
            Utils.showToast('No reservations to export', 'error');
            return;
        }

        const headers = ['Reservation ID', 'Customer Name', 'Email', 'Phone', 'Movie', 'Seat', 'Purchase Date', 'Price'];
        const rows = reservations.map(r => [
            r.id,
            r.customerName,
            r.customerEmail,
            r.customerPhone,
            r.movieTitle,
            r.seat,
            Utils.formatDate(r.purchaseDate),
            r.price
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `reservations_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Utils.showToast('Reservations exported successfully', 'success');
    }
};

// ==================== EVENT LISTENERS ====================

function initializeEventListeners() {
    // Navigation
    document.getElementById('homeBtn').addEventListener('click', async () => {
        await MovieManager.renderMovies();
        Utils.showSection('homeSection');
    });

    document.getElementById('adminBtn').addEventListener('click', async () => {
        if (AppState.adminLoggedIn) {
            await AdminManager.renderDashboard();
            Utils.showSection('adminDashboardSection');
        } else {
            Utils.showSection('adminLoginSection');
        }
    });

    // Back buttons
    document.getElementById('backBtn').addEventListener('click', () => {
        Utils.showSection('homeSection');
    });

    document.getElementById('backToMovieBtn').addEventListener('click', () => {
        MovieManager.showMovieDetail(AppState.selectedMovie);
    });

    document.getElementById('backToSeatsBtn').addEventListener('click', () => {
        Utils.showSection('seatSection');
    });

    // Seat selection
    document.getElementById('proceedToCheckoutBtn').addEventListener('click', () => {
        CheckoutManager.renderCheckout();
    });

    // Checkout form
    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value
        };

        await CheckoutManager.processReservation(customerData);
    });

    // Confirmation buttons
    document.getElementById('printTicketBtn').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('newReservationBtn').addEventListener('click', async () => {
        CheckoutManager.reset();
        await MovieManager.renderMovies();
        Utils.showSection('homeSection');
    });

    // Admin login
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const errorElement = document.getElementById('loginError');

        if (AdminManager.login(username, password)) {
            errorElement.textContent = '';
            document.getElementById('adminLoginForm').reset();
            await AdminManager.renderDashboard();
            Utils.showSection('adminDashboardSection');
            Utils.showToast('Login successful', 'success');
        } else {
            errorElement.textContent = 'Invalid username or password.';
        }
    });

    document.getElementById('cancelAdminLoginBtn').addEventListener('click', () => {
        document.getElementById('adminLoginForm').reset();
        document.getElementById('loginError').textContent = '';
        Utils.showSection('homeSection');
    });

    // Admin logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        AdminManager.logout();
    });

    // Dashboard tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}Tab`).classList.add('active');
        });
    });

    // Add movie button
    document.getElementById('addMovieBtn').addEventListener('click', () => {
        AdminManager.openMovieModal();
    });

    // Movie form
    document.getElementById('movieForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await AdminManager.saveMovie(formData);
    });

    document.getElementById('cancelMovieBtn').addEventListener('click', () => {
        Utils.hideModal('adminModal');
    });

    // Modal close buttons
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        Utils.hideModal('adminModal');
    });

    document.getElementById('closeConfirmModalBtn').addEventListener('click', () => {
        Utils.hideModal('confirmModal');
    });

    document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
        Utils.hideModal('confirmModal');
    });

    document.getElementById('confirmActionBtn').addEventListener('click', () => {
        if (AppState.confirmCallback) {
            AppState.confirmCallback();
            AppState.confirmCallback = null;
        }
        Utils.hideModal('confirmModal');
    });

    // Export reservations
    document.getElementById('exportReservationsBtn').addEventListener('click', async () => {
        await AdminManager.exportReservationsToCSV();
    });

    // Search and filter
    document.getElementById('searchInput').addEventListener('input', async (e) => {
        const searchTerm = e.target.value;
        const genre = document.getElementById('genreFilter').value;
        await MovieManager.filterMovies(searchTerm, genre);
    });

    document.getElementById('genreFilter').addEventListener('change', async (e) => {
        const genre = e.target.value;
        const searchTerm = document.getElementById('searchInput').value;
        await MovieManager.filterMovies(searchTerm, genre);
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Reset admin session timeout on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            if (AppState.adminLoggedIn) {
                AdminManager.startSessionTimeout();
            }
        });
    });
}

// ==================== INITIALIZATION ====================

async function initializeApp() {
    // Initialize data
    await DataManager.initializeData();

    // Check admin session
    AdminManager.checkSession();

    // Render initial movies
    await MovieManager.renderMovies();

    // Initialize event listeners
    initializeEventListeners();
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
