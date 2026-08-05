import { Router } from 'express';
import { createTaskController } from '../controllers/task.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { Server as SocketServer } from 'socket.io';

export const createTaskRouter = (io?: SocketServer) => {
  const router = Router({ mergeParams: true });
  const taskController = createTaskController(io);

  router.use(authMiddleware);

  router.get('/', taskController.getTasks);
  router.post('/', taskController.createTask);
  router.get('/:taskId', taskController.getTaskById);
  router.put('/:taskId', taskController.updateTask);
  router.delete('/:taskId', taskController.deleteTask);

  // GitHub attachment endpoints
  router.post('/:taskId/github-attach', taskController.attachGitHub);
  router.delete('/:taskId/github-attachments/:attachmentId', taskController.removeAttachment);

  return router;
};
