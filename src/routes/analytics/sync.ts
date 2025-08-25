import { Router } from 'express';
import authentication from '../../auth/authentication';
import { ProtectedRequest } from '../../types/app-request';
import { AnalyticsSyncService } from '../../services/analytics-sync.service';
import { SuccessResponse } from '../../core/ApiResponse';

const router = Router({ mergeParams: true });

router.use(authentication);

router.post('/user', async (req: ProtectedRequest, res) => {
  const service = new AnalyticsSyncService();
  const result = await service.syncUser(req.user._id);
  new SuccessResponse('analytics_sync_user_complete', result).send(res);
});

export default router;
