     const mongoose = require('mongoose');

     const leadSchema = new mongoose.Schema({
       name: { type: String, required: true },
       email: { type: String, required: true },
       phone: { type: String, required: true },
       status: { type: String, default: 'new', enum: ['new', 'processing', 'converted', 'lost'] },
       notes: { type: String, default: '' },
       createdAt: { type: Date, default: Date.now }
     });

     module.exports = mongoose.model('Lead', leadSchema);
     