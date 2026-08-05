import { Router } from 'express';
import { boardController } from '../controllers/board.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All board routes require authentication
router.use(authMiddleware);

router.get('/', boardController.getBoards);
router.post('/', boardController.createBoard);
router.get('/:boardId', boardController.getBoardById);
router.put('/:boardId', boardController.updateBoard);
router.delete('/:boardId', boardController.deleteBoard);

export default router;
