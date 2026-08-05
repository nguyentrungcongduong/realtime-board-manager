import { Router } from 'express';
import { cardController } from '../controllers/card.controller';
import { authMiddleware } from '../middleware/auth.middleware';

// mergeParams allows access to :boardId from parent router
const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', cardController.getCards);
router.post('/', cardController.createCard);
router.get('/:cardId', cardController.getCardById);
router.put('/:cardId', cardController.updateCard);
router.delete('/:cardId', cardController.deleteCard);

export default router;
