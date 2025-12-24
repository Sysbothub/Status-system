const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['staff', 'admin'], default: 'staff' }
});

const statusSchema = new mongoose.Schema({
    serviceName: { type: String, required: true, unique: true }, 
    state: { type: String, default: 'Offline' },
    queueState: { type: String, default: 'N/A' },
    note: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Status = mongoose.model('Status', statusSchema);

module.exports = { User, Status };
