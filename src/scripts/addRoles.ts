import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoleModel, RoleCode } from '../database/model/Role';

// Load environment variables
dotenv.config();

// Use the same connection logic as addApiKey
import '../database/index';

async function addRoles() {
  try {
    const roles = Object.values(RoleCode).map((code) => ({
      code,
      status: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Check for existing roles to avoid duplicates
    for (const role of roles) {
      const exists = await RoleModel.findOne({ code: role.code });
      if (!exists) {
        await RoleModel.create(role);
        console.log(`Role '${role.code}' added.`);
      } else {
        console.log(`Role '${role.code}' already exists.`);
      }
    }
    console.log('Role seeding complete.');
  } catch (error) {
    console.error('Error seeding roles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

addRoles();
