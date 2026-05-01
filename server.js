import express from 'express';
import BookingService from './services/BookingService.js';

const app = express();
const ADMIN_PASSWORD = "admin123";

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Password Authentication Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Invalid Password" });
    }
};

// Apply authentication only to admin routes
app.use('/api/admin', authenticate);

// --- PUBLIC ROUTES ---

// Get list of rooms for the floor plan
app.get('/api/rooms', async (req, res) => {
    try { res.json(await BookingService.getRooms()); } catch (e) { res.status(500).json({ error: e.message }); }
});

// V2.0 Calendar View Data
app.get('/api/bookings', async (req, res) => {
    try {
        const { roomId } = req.query;
        if (!roomId) return res.status(400).json({ error: "Room ID is required" });
        // Use the Service instead of raw SQL to keep it consistent
        const bookings = await BookingService.getByRoom(roomId);
        res.json(bookings);
    } catch (e) {
        res.status(500).json([]);
    }
});

// Create Reservation with Overlap Check
app.post('/api/reserve', async (req, res) => {
    try {
        const { roomId, user, start, end } = req.body;
        
        // Use the logic from your service to check and save
        const result = await BookingService.reserve(roomId, user, start, end);
        
        if (result.success) {
            res.json({ success: true, id: result.id });
        } else {
            res.json({ success: false, message: result.message || "Slot already booked" });
        }
    } catch (e) { 
        res.status(400).json({ success: false, message: e.message }); 
    }
});

// --- ADMIN ROUTES (Requires Authorization Header) ---

// Get all bookings for admin table
app.get('/api/admin/bookings', async (req, res) => {
    try {
        res.json(await BookingService.getAll());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a booking
app.delete('/api/admin/bookings/:id', async (req, res) => {
    try {
        await BookingService.delete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Room Management
app.post('/api/admin/rooms', async (req, res) => {
    try {
        const { name, capacity } = req.body;
        const result = await BookingService.addRoom(name, capacity);
        res.status(201).json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/rooms/:id', async (req, res) => {
    try {
        const { name, capacity } = req.body;
        await BookingService.updateRoom(req.params.id, name, capacity);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/rooms/:id', async (req, res) => {
    try {
        await BookingService.deleteRoom(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 V2.0 Server is live on port ${PORT}`);
});