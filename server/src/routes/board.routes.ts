import { Router } from 'express';
import { boardController } from '../controllers/board.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public preview route
router.get('/:boardId/preview', boardController.getPreview);

// Protected routes
router.use(authMiddleware);

router.get('/', boardController.getBoards);
router.post('/', boardController.createBoard);
router.get('/:boardId', boardController.getBoardById);
router.post('/:boardId/join', boardController.joinBoard);
router.put('/:boardId', boardController.updateBoard);
router.delete('/:boardId', boardController.deleteBoard);

export default router;
