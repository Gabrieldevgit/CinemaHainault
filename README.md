# Le Cinéma Hainault - Cinema Ticket Reservation Website

A modern, responsive cinema ticket reservation web application with a comprehensive admin panel.

## Features

### Customer Features
- **Movie Browsing**: View all currently showing movies with posters, descriptions, and details
- **Movie Search & Filter**: Search movies by title/description and filter by genre
- **Seat Selection**: Interactive seat selection with the specified layout
  - Row 1: 4A, 3A, 2A, 1A
  - Row 2: 1B
  - Row 3: 1C
- **Real-time Seat Status**: Green (available), Yellow (selected), Red (reserved), Gray (disabled)
- **Customer Information Form**: Collect name, email, and phone number
- **Confirmation & QR Code**: Receive confirmation with QR code for ticket
- **Printable Tickets**: Option to print reservation tickets

### Admin Panel Features
- **Secure Login**: Admin authentication with specified credentials
- **Dashboard Statistics**:
  - Total reservations
  - Available/occupied seats
  - Movies currently showing
  - Total revenue
  - Seat occupancy percentage
- **Reservation Management**:
  - View all reservations with customer details
  - Cancel reservations (seats become available)
  - Export reservations to CSV
- **Movie Management**:
  - Add new movies
  - Edit existing movies
  - Delete movies
- **Customer Database**:
  - View all customers
  - See reservation history
  - Track total reservations per customer
- **Session Timeout**: Automatic logout after 30 minutes of inactivity

## Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with animations, glassmorphism, and responsive design
- **JavaScript (Vanilla)**: No frameworks required
- **Supabase**: PostgreSQL database and backend services (free, no billing required)
- **LocalStorage**: Fallback data persistence if Supabase is unavailable

## Getting Started

### Installation
1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. The application is ready to use immediately

### File Structure
```
Le Cinéma Hainault/
├── index.html              # Main HTML structure
├── styles.css              # All styling and animations
├── app.js                  # Application logic
├── SUPABASE_SETUP.md       # Comprehensive Supabase setup guide
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages deployment workflow
└── README.md               # Documentation
```

## Admin Credentials

To access the admin panel:
- **Username**: `Moi et pas toi`
- **Password**: `pataterie hulloise`

## Usage Guide

### For Customers
1. Browse movies on the home page
2. Use search bar or genre filter to find specific movies
3. Click on a movie to view details
4. Click "Select Seats" to choose your seats
5. Click on available (green) seats to select them
6. Click "Proceed to Checkout" when ready
7. Fill in your contact information
8. Confirm your reservation
9. Receive confirmation with QR code

### For Administrators
1. Click "Admin" button in navigation
2. Enter credentials to login
3. Navigate through dashboard tabs:
   - **Overview**: View statistics and metrics
   - **Reservations**: Manage all reservations
   - **Movies**: Add, edit, or delete movies
   - **Customers**: View customer database
4. Use "Logout" when finished

## Color Palette

- **Background**: `#0D0D0D`
- **Cards**: `#1A1A1A`
- **Primary**: `#E50914` (Netflix red)
- **Accent**: `#FFD54F` (Gold)
- **Success**: `#4CAF50` (Green)
- **Danger**: `#F44336` (Red)

## Data Persistence

The application uses **Supabase** (PostgreSQL database) for data storage with automatic fallback to LocalStorage:
- Movies
- Reservations
- Customer information
- Admin session

**With Supabase**: Data syncs across all devices and browsers in real-time
**Without Supabase**: Falls back to LocalStorage (data is device-specific)

### Setting Up Supabase

For cross-device data synchronization, follow the comprehensive setup guide in **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**.

**Quick Start:**
1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your API credentials (Project URL and anon key)
4. Update `app.js` with your credentials:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
5. Run the SQL commands from SUPABASE_SETUP.md to create tables

**Without Supabase setup**, the website works perfectly on a single device using LocalStorage.

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires modern browser with LocalStorage support.

## Features Implemented

### Core Requirements ✅
- Movie listing and selection
- Seat selection with specified layout
- Customer information collection
- Ticket purchase and confirmation
- Admin panel with authentication
- Dashboard statistics
- Reservation management
- Movie management (CRUD)
- Customer database
- LocalStorage persistence

### Bonus Features ✅
- Movie search functionality
- Genre filtering
- QR code generation for tickets
- Printable tickets
- CSV export for reservations
- Revenue statistics
- Seat legend
- Seat occupancy percentage
- Mobile-responsive design
- Confirmation modals
- Session timeout with auto-logout
- Smooth animations
- Glassmorphism effects
- Dark cinema theme

## Customization

### Adding Default Movies
Edit the `DEFAULT_MOVIES` array in `app.js` to change initial movies.

### Changing Seat Layout
Modify the `SEAT_LAYOUT` array in `app.js` to change the seating arrangement.

### Adjusting Prices
Change the `SEAT_PRICE` constant or individual movie prices in the data.

### Color Scheme
Modify CSS variables in `styles.css` under `:root` to change the color palette.

## Deployment

### GitHub Pages (Recommended)

This project uses GitHub Pages for free static hosting with automatic deployment via GitHub Actions.

#### Prerequisites
- GitHub account
- Repository: https://github.com/Gabrieldevgit/CinemaHainault

#### Automatic Deployment
The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages when you push to the `main` branch.

#### Manual Deployment
1. Push your changes to the `main` branch
2. Go to the Actions tab in your GitHub repository
3. The "Deploy to GitHub Pages" workflow will run automatically
4. Your site will be available at: `https://gabrieldevgit.github.io/CinemaHainault/`

#### Enabling GitHub Pages (First Time Setup)
1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will handle the rest

**Note:** GitHub Pages hosts the static files. The database is Supabase.

## Security Notes

- This is a client-side only application
- No backend server required
- Admin credentials are stored in JavaScript (not suitable for production without backend)
- For production use, implement proper backend authentication and database
- Supabase anon key is exposed in the frontend (acceptable for Supabase, but restrict in Supabase dashboard)
- Current RLS policies allow public access - implement authentication for production

## License

This project is provided as-is for educational and demonstration purposes.

## Support

For issues or questions, please refer to the code comments or modify the application as needed.

To deploy: firebase deploy --only hosting:cinematheo-86e22-5e8d0