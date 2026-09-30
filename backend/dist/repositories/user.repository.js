import { prisma } from '../config/database.js';
export class UserRepository {
    async findByEmail(email) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
    }
    async findById(id) {
        return prisma.user.findUnique({
            where: { id }
        });
    }
    async create(data) {
        return prisma.user.create({
            data: {
                ...data,
                email: data.email.toLowerCase()
            }
        });
    }
    async update(id, data) {
        return prisma.user.update({
            where: { id },
            data
        });
    }
    async markEmailVerified(id) {
        return prisma.user.update({
            where: { id },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date()
            }
        });
    }
}
export const userRepository = new UserRepository();
