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
let supabaseClient = null;
let useSupabase = false;
let reservationsChannel = null; // holds the active Realtime subscription for reservations
let moviesChannel = null; // holds the active Realtime subscription for movies

// Supabase credentials (replace with your actual credentials)
const SUPABASE_URL = 'https://nwmghyoijwundrugtwab.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bWdoeW9pand1bmRydWd0d2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTExOTksImV4cCI6MjA5OTAyNzE5OX0.bUSObTntZXKiJOL9VoNk6IlpoL0rqzPyQnvZxPX9Nr4';

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
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                
                // Test connection by trying to read movies
                const { data, error } = await supabaseClient.from('movies').select('*').limit(1);
                
                if (error) throw error;
                
                useSupabase = true;
                Storage.set(STORAGE_KEYS.USE_SUPABASE, true);
                console.log('Supabase connected successfully');
                Utils.showToast('Connected to Supabase', 'success');
                this.subscribeToRealtime();
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

    // Listens for reservation inserts/deletes from ANY connected browser
    // (including this one) and pushes the change into the seat map and
    // admin dashboard live, without anyone needing to refresh.
    subscribeToRealtime() {
        if (!useSupabase || !supabaseClient || reservationsChannel) return;

        reservationsChannel = supabaseClient
            .channel('public:reservations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
                const row = (payload.new && Object.keys(payload.new).length) ? payload.new : payload.old;
                const reservation = this.fromDbReservation(row);
                SeatManager.handleRealtimeReservationChange(reservation);
                AdminManager.refreshIfOpen();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log('Realtime: listening for reservation changes');
            });

        // Also subscribe to movies changes for admin actions
        if (!moviesChannel) {
            moviesChannel = supabaseClient
                .channel('public:movies')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, async (payload) => {
                    console.log('Realtime: movie change detected', payload.eventType);
                    // Refresh movies display
                    await MovieManager.renderMovies();
                    // Refresh admin dashboard if open
                    if (AppState.adminLoggedIn) {
                        await AdminManager.renderDashboard();
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') console.log('Realtime: listening for movie changes');
                });
        }
    },

    // ---- field mapping helpers -------------------------------------------
    // Supabase/Postgres columns are snake_case; the rest of the app works in
    // camelCase. Without this translation, reservation.movieId etc. would
    // silently come back undefined the moment real credentials are used.
    toDbMovie(movie) {
        return {
            id: movie.id, poster: movie.poster, title: movie.title, description: movie.description,
            duration: movie.duration, genre: movie.genre, age_rating: movie.ageRating,
            showtime: movie.showtime, price: movie.price
        };
    },
    fromDbMovie(row) {
        return {
            id: row.id, poster: row.poster, title: row.title, description: row.description,
            duration: row.duration, genre: row.genre, ageRating: row.age_rating,
            showtime: row.showtime, price: row.price
        };
    },
    toDbReservation(r) {
        return {
            id: r.id, movie_id: r.movieId, movie_title: r.movieTitle, seat: r.seat,
            customer_name: r.customerName, customer_email: r.customerEmail, customer_phone: r.customerPhone,
            purchase_date: r.purchaseDate, price: r.price
        };
    },
    fromDbReservation(row) {
        if (!row) return null;
        return {
            id: row.id, movieId: row.movie_id, movieTitle: row.movie_title, seat: row.seat,
            customerName: row.customer_name, customerEmail: row.customer_email, customerPhone: row.customer_phone,
            purchaseDate: row.purchase_date, price: row.price
        };
    },
    toDbCustomer(c) {
        return {
            id: c.id, name: c.name, email: c.email, phone: c.phone,
            reservation_history: c.reservationHistory, total_reservations: c.totalReservations
        };
    },
    fromDbCustomer(row) {
        return {
            id: row.id, name: row.name, email: row.email, phone: row.phone,
            reservationHistory: row.reservation_history || [], totalReservations: row.total_reservations || 0
        };
    },

    async getMovies() {
        if (useSupabase && supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('movies').select('*');
                if (error) throw error;
                return data && data.length > 0 ? data.map(this.fromDbMovie) : DEFAULT_MOVIES;
            } catch (error) {
                console.warn('Supabase read failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.get(STORAGE_KEYS.MOVIES, DEFAULT_MOVIES);
            }
        }
        return Storage.get(STORAGE_KEYS.MOVIES, DEFAULT_MOVIES);
    },

    async saveMovies(movies) {
        if (useSupabase && supabaseClient) {
            try {
                // Get existing movies from Supabase
                const { data: existingMovies, error: fetchError } = await supabaseClient.from('movies').select('id');
                if (fetchError) throw fetchError;

                const existingIds = new Set(existingMovies?.map(m => m.id) || []);
                const newIds = new Set(movies.map(m => m.id));

                // Delete movies that are no longer in the list
                const toDelete = [...existingIds].filter(id => !newIds.has(id));
                if (toDelete.length > 0) {
                    const { error: deleteError } = await supabaseClient.from('movies').delete().in('id', toDelete);
                    if (deleteError) throw deleteError;
                }

                // Upsert all movies (insert or update)
                for (const movie of movies) {
                    const { error: upsertError } = await supabaseClient.from('movies').upsert(this.toDbMovie(movie));
                    if (upsertError) throw upsertError;
                }

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
        if (useSupabase && supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('reservations').select('*');
                if (error) throw error;
                return (data || []).map(this.fromDbReservation);
            } catch (error) {
                console.warn('Supabase read failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.get(STORAGE_KEYS.RESERVATIONS, []);
            }
        }
        return Storage.get(STORAGE_KEYS.RESERVATIONS, []);
    },

    // Inserts exactly ONE reservation (one seat). This is what makes the
    // database's UNIQUE(movie_id, seat) constraint meaningful: two people
    // booking the same seat at the same instant now race on a single-row
    // INSERT, and the loser gets a clean, catchable error (Postgres code
    // 23505) instead of a full-table rewrite silently clobbering the other
    // person's seat.
    async addReservation(reservation) {
        if (useSupabase && supabaseClient) {
            const { error } = await supabaseClient.from('reservations').insert(this.toDbReservation(reservation));
            if (error) throw error;
            return true;
        }
        // LocalStorage has no unique constraint, so enforce it here too.
        const reservations = Storage.get(STORAGE_KEYS.RESERVATIONS, []);
        const clash = reservations.some(r => r.movieId === reservation.movieId && r.seat === reservation.seat);
        if (clash) {
            const err = new Error('That seat is already reserved.');
            err.code = '23505';
            throw err;
        }
        reservations.push(reservation);
        Storage.set(STORAGE_KEYS.RESERVATIONS, reservations);
        return true;
    },

    async cancelReservationById(id) {
        if (useSupabase && supabaseClient) {
            const { error } = await supabaseClient.from('reservations').delete().eq('id', id);
            if (error) throw error;
            return true;
        }
        const reservations = Storage.get(STORAGE_KEYS.RESERVATIONS, []);
        Storage.set(STORAGE_KEYS.RESERVATIONS, reservations.filter(r => r.id !== id));
        return true;
    },

    async getCustomers() {
        if (useSupabase && supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('customers').select('*');
                if (error) throw error;
                return (data || []).map(this.fromDbCustomer);
            } catch (error) {
                console.warn('Supabase read failed, using LocalStorage:', error);
                useSupabase = false;
                return Storage.get(STORAGE_KEYS.CUSTOMERS, []);
            }
        }
        return Storage.get(STORAGE_KEYS.CUSTOMERS, []);
    },

    async saveCustomers(customers) {
        if (useSupabase && supabaseClient) {
            try {
                // Get existing customers from Supabase
                const { data: existingCustomers, error: fetchError } = await supabaseClient.from('customers').select('id');
                if (fetchError) throw fetchError;

                const existingIds = new Set(existingCustomers?.map(c => c.id) || []);
                const newIds = new Set(customers.map(c => c.id));

                // Delete customers that are no longer in the list
                const toDelete = [...existingIds].filter(id => !newIds.has(id));
                if (toDelete.length > 0) {
                    const { error: deleteError } = await supabaseClient.from('customers').delete().in('id', toDelete);
                    if (deleteError) throw deleteError;
                }

                // Upsert all customers (insert or update)
                for (const customer of customers) {
                    const { error: upsertError } = await supabaseClient.from('customers').upsert(this.toDbCustomer(customer));
                    if (upsertError) throw upsertError;
                }

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
            await this.saveMovies(DEFAULT_MOVIES);
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
                        <span class="meta-item">${movie.genre}</span>
                        <span class="meta-item">${movie.duration}</span>
                        <span class="meta-item">${movie.ageRating}</span>
                        <span class="meta-item">${Utils.formatTime(movie.showtime)}</span>
                        <span class="meta-item">${Utils.formatCurrency(movie.price)}</span>
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
            this.attachSeatClickHandler(seat);
        });

        AppState.selectedSeats = [];
        this.updateSelectedSeatsDisplay();
    },

    attachSeatClickHandler(seatElement) {
        seatElement.addEventListener('click', () => this.toggleSeat(seatElement));
    },

    // Called whenever a reservation is inserted or deleted anywhere (via
    // Supabase Realtime) while this visitor has a movie's seat map open.
    // Re-derives every seat's true status from the database and preserves
    // whatever the visitor already had selected locally — unless someone
    // else just grabbed one of those same seats first, in which case we
    // bump it and tell them.
    handleRealtimeReservationChange(reservation) {
        if (!reservation || !AppState.selectedMovie || reservation.movieId !== AppState.selectedMovie.id) return;
        const seatSection = document.getElementById('seatSection');
        if (!seatSection || !seatSection.classList.contains('active')) return;
        this.refreshSeatsPreservingSelection(AppState.selectedMovie);
    },

    async refreshSeatsPreservingSelection(movie) {
        const layout = document.getElementById('seatingLayout');
        if (!layout) return;

        const reservedSeats = await Utils.getReservedSeats(movie.id);
        const lostSeats = AppState.selectedSeats.filter(s => reservedSeats.includes(s));
        AppState.selectedSeats = AppState.selectedSeats.filter(s => !reservedSeats.includes(s));

        layout.innerHTML = SEAT_LAYOUT.map(row => `
            <div class="seating-row">
                ${row.map(seat => {
                    const isReserved = reservedSeats.includes(seat);
                    const isSelected = AppState.selectedSeats.includes(seat);
                    const status = isReserved ? 'reserved' : (isSelected ? 'selected' : 'available');
                    return `<div class="seat ${status}" data-seat="${seat}">${seat}</div>`;
                }).join('')}
            </div>
        `).join('');

        layout.querySelectorAll('.seat.available, .seat.selected').forEach(seat => {
            this.attachSeatClickHandler(seat);
        });

        this.updateSelectedSeatsDisplay();

        if (lostSeats.length > 0) {
            const label = lostSeats.length > 1 ? 'Seats' : 'Seat';
            Utils.showToast(`${label} ${lostSeats.join(', ')} just got taken by someone else — please choose again`, 'error');
        }
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
        const purchaseDate = new Date().toISOString();
        const pricePerSeat = AppState.selectedMovie?.price || SEAT_PRICE;
        const groupId = Utils.generateId();
        const seatsToBook = [...AppState.selectedSeats];
        const createdReservations = [];

        // One row per seat — this is what lets the database's
        // UNIQUE(movie_id, seat) constraint actually catch two people
        // grabbing the same seat at the same instant, instead of a single
        // comma-joined "seat" string that silently didn't match anything
        // on the seat map.
        try {
            for (const seat of seatsToBook) {
                const reservation = {
                    id: Utils.generateId(),
                    groupId,
                    movieId: AppState.selectedMovie.id,
                    movieTitle: AppState.selectedMovie.title,
                    seat,
                    customerName: customerData.fullName,
                    customerEmail: customerData.email,
                    customerPhone: customerData.phone,
                    purchaseDate,
                    price: pricePerSeat
                };
                await DataManager.addReservation(reservation);
                createdReservations.push(reservation);
            }
        } catch (error) {
            // Roll back whatever DID succeed in this same checkout, so a
            // customer is never charged for some seats but not others just
            // because one seat in their group got taken a moment earlier.
            for (const r of createdReservations) {
                try { await DataManager.cancelReservationById(r.id); } catch (_) { /* best effort */ }
            }
            if (error.code === '23505') {
                Utils.showToast('One of your seats was just taken by someone else. Please choose again.', 'error');
            } else {
                console.error('Reservation failed:', error);
                Utils.showToast('Could not complete your reservation. Please try again.', 'error');
            }
            await SeatManager.renderSeats(AppState.selectedMovie);
            Utils.showSection('seatSection');
            return;
        }

        // Update customer data
        await this.updateCustomerData(customerData, createdReservations);

        AppState.currentReservation = {
            id: groupId,
            movieTitle: AppState.selectedMovie.title,
            seats: seatsToBook,
            purchaseDate,
            price: pricePerSeat * seatsToBook.length
        };
        this.showConfirmation(AppState.currentReservation);
    },

    async updateCustomerData(customerData, reservations) {
        const customers = await DataManager.getCustomers();
        const existingCustomer = customers.find(c => c.email === customerData.email);
        const newIds = reservations.map(r => r.id);

        if (existingCustomer) {
            existingCustomer.phone = customerData.phone;
            existingCustomer.reservationHistory.push(...newIds);
            existingCustomer.totalReservations += newIds.length;
        } else {
            customers.push({
                id: Utils.generateId(),
                name: customerData.fullName,
                email: customerData.email,
                phone: customerData.phone,
                reservationHistory: newIds,
                totalReservations: newIds.length
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
            <p><strong>Seats:</strong> ${reservation.seats.join(', ')}</p>
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
        try {
            await DataManager.cancelReservationById(reservationId);
            await this.renderDashboard();
            Utils.showToast('Reservation cancelled successfully', 'success');
        } catch (error) {
            console.error('Cancel failed:', error);
            Utils.showToast('Could not cancel reservation. Please try again.', 'error');
        }
    },

    // Called from the Realtime subscription when a reservation changes
    // anywhere. Only re-renders if the admin is actually looking at the
    // dashboard right now, so a background tab isn't doing pointless work.
    refreshIfOpen() {
        const section = document.getElementById('adminDashboardSection');
        if (section && section.classList.contains('active') && AppState.adminLoggedIn) {
            this.renderDashboard();
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

    async openMovieModal(movieId = null) {
        const modal = document.getElementById('adminModal');
        const form = document.getElementById('movieForm');
        const title = document.getElementById('modalTitle');

        form.reset();

        if (movieId) {
            const movies = await DataManager.getMovies();
            const movie = movies.find(m => m.id === movieId);
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
    try {
        // Initialize data
        await DataManager.initializeData();

        // Check admin session
        AdminManager.checkSession();

        // Render initial movies
        await MovieManager.renderMovies();

        // Initialize event listeners
        initializeEventListeners();
    } catch (error) {
        // Surface the failure instead of leaving a silent blank page.
        // Open the browser console (F12) to see the full error and stack trace.
        console.error('Le Cinéma Hainault failed to start:', error);
        const grid = document.getElementById('moviesGrid');
        if (grid) {
            grid.innerHTML = `<div class="loading" style="color:#F44336;">
                Something went wrong while loading the site. Open the browser console (F12) for details, then refresh the page.
            </div>`;
        }
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Catch any error that isn't already caught above (e.g. thrown outside
// initializeApp, or from an event handler) so nothing fails completely silently.
window.addEventListener('error', (e) => {
    console.error('Unhandled error in Le Cinéma Hainault:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection in Le Cinéma Hainault:', e.reason);
});