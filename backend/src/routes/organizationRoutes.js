const express = require('express');
const router = express.Router();
const {
  registerOrganization,
  loginOrganization,
  getOrganizations,
  updateOrganizationStatus
} = require('../controllers/organizationController');

// Client routes
router.post('/register', registerOrganization);
router.post('/login', loginOrganization);

// Admin dashboard routes (Protected inside client controller directly)
router.get('/admin/organizations', getOrganizations);
router.post('/admin/organizations/:id/status', updateOrganizationStatus);

module.exports = router;
