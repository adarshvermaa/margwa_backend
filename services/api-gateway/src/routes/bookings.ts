import { Router } from 'express';

const router = Router();

// Placeholder bookings routes
router.post('/request', (req, res) => {
    res.json({ message: 'Request booking - to be implemented' });
});

router.get('/client/:clientId', (req, res) => {
    res.json({ message: 'Get client bookings - to be implemented' });
});

export default router;
