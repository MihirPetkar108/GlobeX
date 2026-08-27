const express = require('express');
const authMiddleware = require('../utilities/authMiddleware');
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing
} = require('../controllers/listingController');

const router = express.Router();

router.get('/', getListings);
router.get('/:id', getListingById);
router.post('/', authMiddleware, createListing);
router.patch('/:id', authMiddleware, updateListing);
router.delete('/:id', authMiddleware, deleteListing);

module.exports = router;