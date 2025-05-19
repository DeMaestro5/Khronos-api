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

export default router;
