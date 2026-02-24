const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Untitled',
    maxlength: 100
  },
  messages: [messageSchema],
  isStarred: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

chatSchema.index({ user: 1, createdAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;