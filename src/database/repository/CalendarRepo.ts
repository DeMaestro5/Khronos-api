import CalendarEvent, { CalendarEventModel } from '../model/calendar';
import { Types } from 'mongoose';

async function exists(id: Types.ObjectId): Promise<boolean> {
  const event = await CalendarEventModel.exists({ _id: id });
  return event !== null && event !== undefined;
}

async function findById(id: Types.ObjectId): Promise<CalendarEvent | null> {
  return CalendarEventModel.findOne({ _id: id })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .populate('createdBy', 'name email')
    .populate('attendees', 'name email')
    .lean()
    .exec();
}

async function findByUserId(userId: Types.ObjectId): Promise<CalendarEvent[]> {
  return CalendarEventModel.find({ userId })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .populate('createdBy', 'name email')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByDateRange(
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> {
  return CalendarEventModel.find({
    userId,
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate },
      },
      {
        endDate: { $gte: startDate, $lte: endDate },
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate },
      },
    ],
  })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .populate('createdBy', 'name email')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByYear(
  userId: Types.ObjectId,
  year: number,
): Promise<CalendarEvent[]> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  return CalendarEventModel.find({
    userId,
    $or: [
      {
        startDate: { $gte: startDate, $lt: endDate },
      },
      {
        endDate: { $gte: startDate, $lt: endDate },
      },
    ],
  })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByMonth(
  userId: Types.ObjectId,
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  return CalendarEventModel.find({
    userId,
    $or: [
      {
        startDate: { $gte: startDate, $lt: endDate },
      },
      {
        endDate: { $gte: startDate, $lt: endDate },
      },
    ],
  })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByDay(
  userId: Types.ObjectId,
  year: number,
  month: number,
  day: number,
): Promise<CalendarEvent[]> {
  const startDate = new Date(year, month, day);
  const endDate = new Date(year, month, day + 1);

  return CalendarEventModel.find({
    userId,
    $or: [
      {
        startDate: { $gte: startDate, $lt: endDate },
      },
      {
        endDate: { $gte: startDate, $lt: endDate },
      },
      {
        allDay: true,
        startDate: { $lte: startDate },
        endDate: { $gte: startDate },
      },
    ],
  })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByStatus(
  userId: Types.ObjectId,
  status: CalendarEvent['status'],
): Promise<CalendarEvent[]> {
  return CalendarEventModel.find({ userId, status })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByEventType(
  userId: Types.ObjectId,
  eventType: CalendarEvent['eventType'],
): Promise<CalendarEvent[]> {
  return CalendarEventModel.find({ userId, eventType })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findByContentId(
  contentId: Types.ObjectId,
): Promise<CalendarEvent[]> {
  return CalendarEventModel.find({ contentId })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findRecurringEvents(
  userId: Types.ObjectId,
  parentEventId?: Types.ObjectId,
): Promise<CalendarEvent[]> {
  const query: any = {
    userId,
    'recurrence.frequency': { $exists: true },
  };

  if (parentEventId) {
    query.parentEventId = parentEventId;
  }

  return CalendarEventModel.find(query)
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .lean()
    .exec();
}

async function findUpcoming(
  userId: Types.ObjectId,
  limit: number = 10,
): Promise<CalendarEvent[]> {
  const now = new Date();

  return CalendarEventModel.find({
    userId,
    startDate: { $gte: now },
    status: { $in: ['scheduled', 'published'] },
  })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: 1 })
    .limit(limit)
    .lean()
    .exec();
}

async function findOverdue(userId: Types.ObjectId): Promise<CalendarEvent[]> {
  const now = new Date();

  return CalendarEventModel.find({
    userId,
    endDate: { $lt: now },
    status: { $in: ['scheduled'] },
  })
    .populate('userId', 'name email')
    .populate('contentId', 'title type platform')
    .sort({ startDate: -1 })
    .lean()
    .exec();
}

async function create(event: CalendarEvent): Promise<CalendarEvent> {
  const now = new Date();
  event.createdAt = event.updatedAt = now;
  event.createdBy = event.userId;

  const createdEvent = await CalendarEventModel.create(event);
  return createdEvent.toObject();
}

async function update(event: CalendarEvent): Promise<CalendarEvent> {
  event.updatedAt = new Date();
  await CalendarEventModel.updateOne({ _id: event._id }, { $set: { ...event } })
    .lean()
    .exec();
  return event;
}

async function updateStatus(
  id: Types.ObjectId,
  status: CalendarEvent['status'],
): Promise<void> {
  await CalendarEventModel.updateOne(
    { _id: id },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
  )
    .lean()
    .exec();
}

async function updateAnalytics(
  id: Types.ObjectId,
  analytics: CalendarEvent['analytics'],
): Promise<void> {
  await CalendarEventModel.updateOne(
    { _id: id },
    { $set: { analytics, updatedAt: new Date() } },
  )
    .lean()
    .exec();
}

async function bulkUpdate(
  updates: Array<{ id: Types.ObjectId; updates: Partial<CalendarEvent> }>,
): Promise<void> {
  const bulkOps = updates.map(({ id, updates }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { ...updates, updatedAt: new Date() } },
    },
  }));

  await CalendarEventModel.bulkWrite(bulkOps);
}

async function remove(id: Types.ObjectId): Promise<void> {
  await CalendarEventModel.deleteOne({ _id: id }).lean().exec();
}

async function removeByContentId(contentId: Types.ObjectId): Promise<void> {
  await CalendarEventModel.deleteMany({ contentId }).lean().exec();
}

async function getCalendarStats(userId: Types.ObjectId): Promise<{
  totalEvents: number;
  publishedEvents: number;
  scheduledEvents: number;
  overdue: number;
  thisWeek: number;
  thisMonth: number;
}> {
  const now = new Date();
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay(),
  );
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalEvents,
    publishedEvents,
    scheduledEvents,
    overdue,
    thisWeek,
    thisMonth,
  ] = await Promise.all([
    CalendarEventModel.countDocuments({ userId }),
    CalendarEventModel.countDocuments({ userId, status: 'published' }),
    CalendarEventModel.countDocuments({ userId, status: 'scheduled' }),
    CalendarEventModel.countDocuments({
      userId,
      endDate: { $lt: now },
      status: 'scheduled',
    }),
    CalendarEventModel.countDocuments({
      userId,
      startDate: { $gte: startOfWeek, $lt: endOfWeek },
    }),
    CalendarEventModel.countDocuments({
      userId,
      startDate: { $gte: startOfMonth, $lt: endOfMonth },
    }),
  ]);

  return {
    totalEvents,
    publishedEvents,
    scheduledEvents,
    overdue,
    thisWeek,
    thisMonth,
  };
}

export default {
  exists,
  findById,
  findByUserId,
  findByDateRange,
  findByYear,
  findByMonth,
  findByDay,
  findByStatus,
  findByEventType,
  findByContentId,
  findRecurringEvents,
  findUpcoming,
  findOverdue,
  create,
  update,
  updateStatus,
  updateAnalytics,
  bulkUpdate,
  remove,
  removeByContentId,
  getCalendarStats,
};
