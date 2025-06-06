import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { BadRequestError, NotFoundError } from '../../core/ApiError';
import { SuccessResponse } from '../../core/ApiResponse';
import CalendarRepo from '../../database/repository/CalendarRepo';
import { Types } from 'mongoose';
import validator from '../../helpers/validator';
import schema from './schema';
import authentication from '../../auth/authentication';
import { CalendarService } from '../../services/calendar.service';

const router = Router();
const calendarService = new CalendarService();

router.use(authentication);

// GET /api/calendar - Get calendar entries for current user
router.get(
  '/',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const events = await CalendarRepo.findByUserId(req.user._id);
    const stats = await CalendarRepo.getCalendarStats(req.user._id);

    new SuccessResponse('Calendar entries retrieved successfully', {
      events,
      stats,
    }).send(res);
  }),
);

// GET /api/calendar/:year/:month - Get calendar entries for specific month
router.get(
  '/:year/:month',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      throw new BadRequestError('Invalid year or month parameter');
    }

    const events = await CalendarRepo.findByMonth(
      req.user._id,
      yearNum,
      monthNum,
    );

    new SuccessResponse('Monthly calendar entries retrieved successfully', {
      events,
      year: yearNum,
      month: monthNum,
    }).send(res);
  }),
);

// GET /api/calendar/:year/:month/:day - Get calendar entries for specific day
router.get(
  '/:year/:month/:day',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { year, month, day } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (
      isNaN(yearNum) ||
      isNaN(monthNum) ||
      isNaN(dayNum) ||
      monthNum < 0 ||
      monthNum > 11 ||
      dayNum < 1 ||
      dayNum > 31
    ) {
      throw new BadRequestError('Invalid year, month, or day parameter');
    }

    const events = await CalendarRepo.findByDay(
      req.user._id,
      yearNum,
      monthNum,
      dayNum,
    );

    new SuccessResponse('Daily calendar entries retrieved successfully', {
      events,
      date: {
        year: yearNum,
        month: monthNum,
        day: dayNum,
      },
    }).send(res);
  }),
);

// POST /api/calendar/event - Create calendar event
router.post(
  '/event',
  validator(schema.createEvent),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const eventData = {
      ...req.body,
      userId: req.user._id,
      createdBy: req.user._id,
    };

    // Handle content association
    if (req.body.contentId) {
      eventData.contentId = new Types.ObjectId(req.body.contentId);
    }

    // Handle attendees
    if (req.body.attendees && req.body.attendees.length > 0) {
      eventData.attendees = req.body.attendees.map(
        (id: string) => new Types.ObjectId(id),
      );
    }

    const event = await CalendarRepo.create(eventData);

    new SuccessResponse('Calendar event created successfully', event).send(res);
  }),
);

// GET /api/calendar/event/:id - Get specific calendar event
router.get(
  '/event/:id',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const event = await CalendarRepo.findById(
      new Types.ObjectId(req.params.id),
    );

    if (!event) {
      throw new NotFoundError('Calendar event not found');
    }

    // Check authorization
    if (event.userId._id.toString() !== req.user._id.toString()) {
      throw new BadRequestError('Not authorized to view this event');
    }

    new SuccessResponse('Calendar event retrieved successfully', event).send(
      res,
    );
  }),
);

// PUT /api/calendar/event/:id - Update calendar event
router.put(
  '/event/:id',
  validator(schema.updateEvent),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const event = await CalendarRepo.findById(
      new Types.ObjectId(req.params.id),
    );

    if (!event) {
      throw new NotFoundError('Calendar event not found');
    }

    // Check authorization
    if (event.userId._id.toString() !== req.user._id.toString()) {
      throw new BadRequestError('Not authorized to update this event');
    }

    // Prepare update data
    const updateData = { ...event, ...req.body };

    // Handle content association
    if (req.body.contentId) {
      updateData.contentId = new Types.ObjectId(req.body.contentId);
    }

    // Handle attendees
    if (req.body.attendees) {
      updateData.attendees = req.body.attendees.map(
        (id: string) => new Types.ObjectId(id),
      );
    }

    const updatedEvent = await CalendarRepo.update(updateData);

    new SuccessResponse(
      'Calendar event updated successfully',
      updatedEvent,
    ).send(res);
  }),
);

// DELETE /api/calendar/event/:id - Delete calendar event
router.delete(
  '/event/:id',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const event = await CalendarRepo.findById(
      new Types.ObjectId(req.params.id),
    );

    if (!event) {
      throw new NotFoundError('Calendar event not found');
    }

    // Check authorization
    if (event.userId._id.toString() !== req.user._id.toString()) {
      throw new BadRequestError('Not authorized to delete this event');
    }

    await CalendarRepo.remove(new Types.ObjectId(req.params.id));

    new SuccessResponse('Calendar event deleted successfully', null).send(res);
  }),
);

// POST /api/calendar/bulk-update - Update multiple calendar events (for drag-drop)
router.post(
  '/bulk-update',
  validator(schema.bulkUpdate),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { updates } = req.body;

    // Verify all events belong to the user
    const eventIds = updates.map(
      (update: any) => new Types.ObjectId(update.id),
    );
    const events = await Promise.all(
      eventIds.map((id: Types.ObjectId) => CalendarRepo.findById(id)),
    );

    // Check authorization for all events
    for (const event of events) {
      if (!event) {
        throw new NotFoundError('One or more calendar events not found');
      }
      if (event.userId._id.toString() !== req.user._id.toString()) {
        throw new BadRequestError(
          'Not authorized to update one or more events',
        );
      }
    }

    // Prepare bulk update operations
    const bulkUpdates = updates.map((update: any) => ({
      id: new Types.ObjectId(update.id),
      updates: {
        ...update,
        updatedAt: new Date(),
      },
    }));

    await CalendarRepo.bulkUpdate(bulkUpdates);

    new SuccessResponse('Calendar events updated successfully', {
      updatedCount: updates.length,
    }).send(res);
  }),
);

// GET /api/calendar/optimal-times - Get AI suggested optimal posting times
router.get(
  '/optimal-times',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const {
      contentType,
      platform,
      timezone = 'UTC',
      startDate,
      endDate,
      targetAudience,
      excludeWeekends = false,
      minHour = 6,
      maxHour = 22,
    } = req.query;

    // Parse and validate parameters
    const request: any = {
      contentType: contentType as string,
      platform: platform
        ? Array.isArray(platform)
          ? platform
          : [platform]
        : undefined,
      timezone: timezone as string,
      targetAudience: targetAudience as string,
      excludeWeekends: excludeWeekends === 'true',
      minHour: parseInt(minHour as string),
      maxHour: parseInt(maxHour as string),
    };

    if (startDate && endDate) {
      request.dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    }

    const optimalTimes = await calendarService.findOptimalPostingTimes(
      req.user._id,
      request,
    );

    new SuccessResponse(
      'Optimal posting times retrieved successfully',
      optimalTimes,
    ).send(res);
  }),
);

// Additional helper endpoints

// GET /api/calendar/upcoming - Get upcoming events
router.get(
  '/upcoming',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const events = await CalendarRepo.findUpcoming(req.user._id, limit);

    new SuccessResponse('Upcoming events retrieved successfully', events).send(
      res,
    );
  }),
);

// GET /api/calendar/overdue - Get overdue events
router.get(
  '/overdue',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const events = await CalendarRepo.findOverdue(req.user._id);

    new SuccessResponse('Overdue events retrieved successfully', events).send(
      res,
    );
  }),
);

// GET /api/calendar/stats - Get calendar statistics
router.get(
  '/stats',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const stats = await CalendarRepo.getCalendarStats(req.user._id);

    new SuccessResponse(
      'Calendar statistics retrieved successfully',
      stats,
    ).send(res);
  }),
);

// GET /api/calendar/search - Search calendar events
router.get(
  '/search',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { query, eventType, status, platform, startDate, endDate } =
      req.query;

    let events = await CalendarRepo.findByUserId(req.user._id);

    // Apply filters
    if (query) {
      const searchTerm = (query as string).toLowerCase();
      events = events.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm) ||
          (event.description &&
            event.description.toLowerCase().includes(searchTerm)),
      );
    }

    if (eventType) {
      events = events.filter((event) => event.eventType === eventType);
    }

    if (status) {
      events = events.filter((event) => event.status === status);
    }

    if (platform) {
      events = events.filter(
        (event) =>
          event.platform && event.platform.includes(platform as string),
      );
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      events = events.filter(
        (event) => event.startDate >= start && event.endDate <= end,
      );
    }

    new SuccessResponse('Search results retrieved successfully', {
      events,
      total: events.length,
    }).send(res);
  }),
);

export default router;
