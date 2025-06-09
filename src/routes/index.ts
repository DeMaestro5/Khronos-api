import express from 'express';
import apikey from '../auth/apikey';
import permission from '../helpers/permission';
import { Permission } from '../database/model/ApiKey';
import signup from './access/signup';
import login from './access/login';
import logout from './access/logout';
import token from './access/token';
import credential from './access/credential';
import profile from './profile';
import forgotPassword from './access/forgot-password';
import resetPassword from './access/reset-password';
import content from './content';
import llm from './llm';
import calendar from './calendar';
import chat from './chat';
import analytics from './analytics';

const router = express.Router();

/*---------------------------------------------------------*/
router.use(apikey);
/*---------------------------------------------------------*/
/*---------------------------------------------------------*/
router.use(permission(Permission.GENERAL));
/*---------------------------------------------------------*/
router.use('/api/v1/signup', signup);
router.use('/api/v1/login', login);
router.use('/api/v1/logout', logout);
router.use('/api/v1/token', token);
router.use('/api/v1/credential', credential);
router.use('/api/v1/profile', profile);
router.use('/api/v1/forgot-password', forgotPassword);
router.use('/api/v1/reset-password', resetPassword);
router.use('/api/v1/content', content);
router.use('/api/v1/llm', llm);
router.use('/api/v1/calendar', calendar);
router.use('/api/v1/chat', chat);
router.use('/api/v1/analytics', analytics);

export default router;
