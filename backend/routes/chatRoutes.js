const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAllChats,
  getChat,
  createChat,
  sendMessage,
  deleteChat,
  toggleStar,
  updateTitle
} = require('../controllers/chatController');

// All chat routes require authentication
router.use(protect);

router.get('/all', getAllChats);
router.post('/new', createChat);
router.get('/:id', getChat);
router.post('/:id/message', sendMessage);
router.delete('/:id', deleteChat);
router.put('/:id/star', toggleStar);
router.put('/:id/title', updateTitle);

module.exports = router;