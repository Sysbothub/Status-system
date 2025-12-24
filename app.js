require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, Status } = require('./models');

const app = express();

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('map4491', 10);
            await User.create({ username: 'admin', password: hashedPassword, role: 'admin' });
            console.log('Root admin created: admin / map4491');
        }
    }).catch(err => console.error('DB Error:', err));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'poke-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Middlewares
const isAuth = (req, res, next) => req.session.user ? next() : res.redirect('/login');
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('Admin Access Required. <a href="/login">Login as Admin</a>');
};

// --- ROUTES ---

// 1. Public Page
app.get('/', async (req, res) => {
    try {
        const statuses = await Status.find();
        const defaults = {
            miraidon: { state: 'Offline', queueState: 'N/A', note: '' },
            mable: { state: 'Offline', queueState: 'N/A', note: '' },
            dm_support: { state: 'Offline', note: '' }
        };
        const statusObj = statuses.reduce((acc, s) => ({ ...acc, [s.serviceName]: s }), defaults);
        res.render('index', { status: statusObj });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
});

// 2. Login Page
app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { id: user._id, username: user.username, role: user.role };
        // Redirect based on role
        if (user.role === 'admin') return res.redirect('/admin');
        res.redirect('/staff');
    } else {
        res.send('Login Failed. <input type="button" value="Back" onclick="history.back()">');
    }
});

// 3. Staff Page
app.get('/staff', isAuth, async (req, res) => {
    const statuses = await Status.find();
    const statusObj = statuses.reduce((acc, s) => ({ ...acc, [s.serviceName]: s }), {});
    res.render('staff', { status: statusObj, user: req.session.user });
});

app.post('/staff/update', isAuth, async (req, res) => {
    const { service, state, queueState, note } = req.body;
    const updateData = { state, note, updatedAt: Date.now() };
    if (queueState) updateData.queueState = queueState;
    await Status.findOneAndUpdate({ serviceName: service }, updateData, { upsert: true });
    res.redirect('/staff');
});

// 4. ADMIN PAGE (Account Management)
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.render('admin', { users });
    } catch (err) {
        res.status(500).send("Error loading admin page");
    }
});

app.post('/admin/create', isAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await User.create({ username, password: hashedPassword, role });
        res.redirect('/admin');
    } catch (e) {
        res.send("Error: User might already exist.");
    }
});

app.post('/admin/delete', isAdmin, async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (user && user.username !== 'admin') {
        await User.findByIdAndDelete(req.body.userId);
    }
    res.redirect('/admin');
});

// 5. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
