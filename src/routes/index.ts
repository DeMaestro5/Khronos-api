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
import platforms from './platforms';

const router = express.Router();

// Public routes (no API key required)
router.use('/signup', signup);
router.use('/login', login);
router.use('/auth/google', googleAuth);
router.use('/forgot-password', forgotPassword);
router.use('/reset-password', resetPassword);
router.use('/token', token);

// Protected routes (API key required)
router.use(apikey);
router.use(permission(Permission.GENERAL));

router.use('/logout', logout);
router.use('/credential', credential);
router.use('/profile', profile);
router.use('/content', content);
router.use('/llm', llm);
router.use('/calendar', calendar);
router.use('/chat', chat);
router.use('/analytics', analytics);
router.use('/notifications', notifications);
router.use('/trends', trend);
router.use('/settings', settings);
router.use('/cache', cache);
router.use('/platforms', platforms);

export default router;
