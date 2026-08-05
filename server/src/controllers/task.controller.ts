import { Request, Response, NextFunction } from 'express';
import { createTaskService } from '../services/task.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { param } from '../utils/param';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['icebox', 'backlog', 'ongoing', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.string().optional(),
  assigneeId: z.string().optional(),
});

const updateSchema = createSchema.extend({
  cardId: z.string().optional(),
}).partial();

const attachSchema = z.object({
  type: z.enum(['pull_request', 'commit', 'issue']),
  number: z.number().optional(),
  sha: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
});

export const createTaskController = (io?: SocketServer) => {
  const taskService = createTaskService(io);

  return {
    async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const tasks = await taskService.getTasks(param(req.params.boardId), param(req.params.cardId), req.user!.userId);
        sendSuccess(res, tasks);
      } catch (err) { next(err); }
    },

    async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const task = await taskService.getTaskById(param(req.params.boardId), param(req.params.cardId), param(req.params.taskId), req.user!.userId);
        sendSuccess(res, task);
      } catch (err) { next(err); }
    },

    async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = createSchema.parse(req.body);
        const task = await taskService.createTask(param(req.params.boardId), param(req.params.cardId), req.user!.userId, data);
        sendCreated(res, task);
      } catch (err) { next(err); }
    },

    async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = updateSchema.parse(req.body);
        const task = await taskService.updateTask(param(req.params.boardId), param(req.params.cardId), param(req.params.taskId), req.user!.userId, data);
        sendSuccess(res, task);
      } catch (err) { next(err); }
    },

    async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        await taskService.deleteTask(param(req.params.boardId), param(req.params.cardId), param(req.params.taskId), req.user!.userId);
        sendNoContent(res);
      } catch (err) { next(err); }
    },

    async attachGitHub(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = attachSchema.parse(req.body);
        const task = await taskService.attachGitHub(param(req.params.boardId), param(req.params.cardId), param(req.params.taskId), req.user!.userId, data);
        sendCreated(res, task);
      } catch (err) { next(err); }
    },

    async removeAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const task = await taskService.removeGitHubAttachment(param(req.params.boardId), param(req.params.cardId), param(req.params.taskId), param(req.params.attachmentId), req.user!.userId);
        sendSuccess(res, task);
      } catch (err) { next(err); }
    },
  };
};
