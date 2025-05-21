import Content, { ContentModel } from '../model/content';
import { Types } from 'mongoose';

async function exists(id: Types.ObjectId): Promise<boolean> {
  const content = await ContentModel.exists({ _id: id });
  return content !== null && content !== undefined;
}

async function findById(id: Types.ObjectId): Promise<Content | null> {
  return ContentModel.findOne({ _id: id })
    .populate('userId', 'name email')
    .lean()
    .exec();
}

async function findByUserId(userId: Types.ObjectId): Promise<Content[]> {
  return ContentModel.find({ userId })
    .populate('userId', 'name email')
    .lean()
    .exec();
}

async function findByType(type: Content['type']): Promise<Content[]> {
  return ContentModel.find({ type })
    .populate('userId', 'name email')
    .lean()
    .exec();
}

async function findByStatus(status: Content['status']): Promise<Content[]> {
  return ContentModel.find({ status })
    .populate('userId', 'name email')
    .lean()
    .exec();
}

async function findByPlatform(platform: string): Promise<Content[]> {
  return ContentModel.find({ platform: platform })
    .populate('userId', 'name email')
    .lean()
    .exec();
}

async function findByTags(tags: string[]): Promise<Content[]> {
  return ContentModel.find({ tags: { $in: tags } })
    .populate('userId', 'name email')
    .lean()
    .exec();
}

async function findAll(): Promise<Content[]> {
  return ContentModel.find().populate('userId', 'name email').lean().exec();
}

async function create(content: Content): Promise<Content> {
  const now = new Date();
  content.createdAt = content.updatedAt = now;
  const createdContent = await ContentModel.create(content);
  return createdContent.toObject();
}

async function update(content: Content): Promise<Content> {
  content.updatedAt = new Date();
  await ContentModel.updateOne({ _id: content._id }, { $set: { ...content } })
    .lean()
    .exec();
  return content;
}

async function updateStatus(
  id: Types.ObjectId,
  status: Content['status'],
): Promise<void> {
  await ContentModel.updateOne(
    { _id: id },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...(status === 'published' && { 'metadata.publishedDate': new Date() }),
      },
    },
  )
    .lean()
    .exec();
}

async function updateEngagement(
  id: Types.ObjectId,
  engagement: Content['engagement'],
): Promise<void> {
  await ContentModel.updateOne(
    { _id: id },
    { $set: { engagement, updatedAt: new Date() } },
  )
    .lean()
    .exec();
}

async function remove(id: Types.ObjectId): Promise<void> {
  await ContentModel.deleteOne({ _id: id }).lean().exec();
}

export default {
  exists,
  findById,
  findByUserId,
  findByType,
  findByStatus,
  findByPlatform,
  findByTags,
  findAll,
  create,
  update,
  updateStatus,
  updateEngagement,
  remove,
};
