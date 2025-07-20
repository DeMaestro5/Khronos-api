import express from 'express';
import apikey from '../auth/apikey';
import permission from '../helpers/permission';
import { Permission } from '../database/model/ApiKey';
import signup from './access/signup';
import login from './access/login';
import logout from './access/logout';
import token from './access/token';
import credential from './access/credential';
import googleAuth from './access/google-auth';
import profile from './profile';
import forgotPassword from './access/forgot-password';
import resetPassword from './access/reset-password';
import content from './content';
import llm from './llm';
import calendar from './calendar';
import chat from './chat';
import analytics from './analytics';
import notifications from './notifications';
import trend from './trend';
import settings from './settings';
import cache from './cache';

const router = express.Router();

// Public routes (no API key required)
router.use('/api/v1/signup', signup);
router.use('/api/v1/login', login);
router.use('/api/v1/auth/google', googleAuth);
router.use('/api/v1/forgot-password', forgotPassword);
router.use('/api/v1/reset-password', resetPassword);
router.use('/api/v1/token', token);

// Protected routes (API key required)
router.use(apikey);
router.use(permission(Permission.GENERAL));

router.use('/api/v1/logout', logout);
router.use('/api/v1/credential', credential);
router.use('/api/v1/profile', profile);
router.use('/api/v1/content', content);
router.use('/api/v1/llm', llm);
router.use('/api/v1/calendar', calendar);
router.use('/api/v1/chat', chat);
router.use('/api/v1/analytics', analytics);
router.use('/api/v1/notifications', notifications);
router.use('/api/v1/trends', trend);
router.use('/api/v1/settings', settings);
router.use('/api/v1/cache', cache);

export default router;
