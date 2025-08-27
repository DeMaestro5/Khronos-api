import { Router } from 'express';
import authentication from '../../auth/authentication';
import youtubeAuth from './youtube-auth';
import instagram from './instagram';
import tiktok from './tiktok';
import facebook from './facebook';
import linkedin from './linkedin';
import twitter from './twitter';

const router = Router();

router.use(authentication);

router.use('/youtube', youtubeAuth);
router.use('/instagram', instagram);
router.use('/tiktok', tiktok);
router.use('/linkedin', linkedin);
router.use('/facebook', facebook);
router.use('/twitter', twitter);

export default router;
