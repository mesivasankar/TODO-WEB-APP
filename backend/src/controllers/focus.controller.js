import { startSession, stopSession, getActiveSession } from '../services/focus.service.js';

export async function startFocus(req, res, next) {
  try {
    const userId = req.user.id;
    const { taskId } = req.body; 
    const session = await startSession(userId, taskId);
    return res.status(201).json({ session });
  } catch (err) { next(err); }
}

export async function stopFocus(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await stopSession(userId);
    
    // If no session was running, just return null/message
    if (!result) return res.json({ message: 'No active session found.' });
    
    return res.json(result);
  } catch (err) { next(err); }
}

export async function getFocusStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const session = await getActiveSession(userId);
    return res.json({ 
        active: !!session, 
        session 
    });
  } catch (err) { next(err); }
}