import { Router } from 'express';
import authentication from '../../auth/authentication';
import youtubeAuth from './youtube-auth';

const router = Router();

router.use(authentication);

router.use('/youtube', youtubeAuth);

export default router;
