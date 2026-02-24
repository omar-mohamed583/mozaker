const Chat = require('../models/chat');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Call Groq from backend — API key never exposed to frontend
async function callGroq(messages) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Groq API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// @desc    Get all chats for current user
// @route   GET /api/chat/all
// @access  Private
exports.getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id })
      .select('title isStarred createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      chats: chats.map(c => ({
        id: c._id,
        title: c.title,
        isStarred: c.isStarred,
        timestamp: c.updatedAt
      }))
    });
  } catch (error) {
    console.error('getAllChats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching chats' });
  }
};

// @desc    Get single chat with all messages
// @route   GET /api/chat/:id
// @access  Private
exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        isStarred: chat.isStarred,
        timestamp: chat.updatedAt,
        messages: chat.messages.map(m => ({
          role: m.role,
          text: m.content,
          createdAt: m.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('getChat error:', error);
    res.status(500).json({ success: false, message: 'Error fetching chat' });
  }
};

// @desc    Create a new chat
// @route   POST /api/chat/new
// @access  Private
exports.createChat = async (req, res) => {
  try {
    const { firstMessage } = req.body;

    if (!firstMessage) {
      return res.status(400).json({ success: false, message: 'First message is required' });
    }

    const chat = await Chat.create({
      user: req.user.id,
      title: firstMessage.slice(0, 60) || 'Untitled',
      messages: []
    });

    res.status(201).json({
      success: true,
      chatId: chat._id,
      title: chat.title
    });
  } catch (error) {
    console.error('createChat error:', error);
    res.status(500).json({ success: false, message: 'Error creating chat' });
  }
};

// @desc    Send message — backend calls Groq and saves both messages
// @route   POST /api/chat/:id/message
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Build full conversation history for context
    const groqMessages = chat.messages.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.content
    }));
    groqMessages.push({ role: 'user', content });

    // Call Groq — key is safe in process.env
    const botResponse = await callGroq(groqMessages);

    // Save both user message and bot response to DB
    chat.messages.push({ role: 'user', content });
    chat.messages.push({ role: 'bot', content: botResponse });
    await chat.save();

    res.json({
      success: true,
      response: botResponse
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error sending message' });
  }
};

// @desc    Delete a chat
// @route   DELETE /api/chat/:id
// @access  Private
exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    res.json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    console.error('deleteChat error:', error);
    res.status(500).json({ success: false, message: 'Error deleting chat' });
  }
};

// @desc    Toggle star on a chat
// @route   PUT /api/chat/:id/star
// @access  Private
exports.toggleStar = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    chat.isStarred = !chat.isStarred;
    await chat.save();

    res.json({ success: true, isStarred: chat.isStarred });
  } catch (error) {
    console.error('toggleStar error:', error);
    res.status(500).json({ success: false, message: 'Error updating chat' });
  }
};

// @desc    Update chat title
// @route   PUT /api/chat/:id/title
// @access  Private
exports.updateTitle = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    res.json({ success: true, title: chat.title });
  } catch (error) {
    console.error('updateTitle error:', error);
    res.status(500).json({ success: false, message: 'Error updating title' });
  }
};