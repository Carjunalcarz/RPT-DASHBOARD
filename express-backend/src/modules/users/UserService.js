class UserService {
  constructor({ supabasePrisma, supabaseClient, logger }) {
    this.prisma = supabasePrisma;
    this.supabase = supabaseClient;
    this.logger = logger;
  }

  async getAllUsers() {
    if (!this.supabase) {
      this.logger.error('Supabase client not initialized.');
      throw new Error('Supabase client not initialized.');
    }

    const { data, error } = await this.supabase.auth.admin.listUsers();
    if (error) {
      this.logger.error('Supabase listUsers error:', error);
      throw new Error('Failed to fetch users from Supabase Auth: ' + error.message);
    }

    const users = data.users || [];
    let publicProfiles = [];

    try {
      publicProfiles = await this.prisma.user.findMany({
        select: {
          id: true,
          role: true,
          municipalityCode: true,
          fullName: true,
          contactNo: true
        }
      });
    } catch (dbError) {
      this.logger.warn('Failed to fetch public profiles:', dbError.message);
    }

    const profileMap = new Map(publicProfiles.map(p => [p.id, p]));

    return users.map(user => {
      const profile = profileMap.get(user.id) || {};
      return {
        id: user.id,
        email: user.email,
        role: profile.role || 'user',
        municipalityCode: profile.municipalityCode || null,
        fullName: profile.fullName || null,
        contactNo: profile.contactNo || null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at
      };
    });
  }

  async updateUser(id, updateData) {
    try {
      const updatedUser = await this.prisma.user.upsert({
        where: { id },
        update: updateData,
        create: {
          id,
          email: 'unknown@example.com', // Fallback
          ...updateData,
          role: updateData.role || 'user',
        },
        select: {
          id: true,
          role: true,
          municipalityCode: true,
          fullName: true,
          contactNo: true
        }
      });
      return updatedUser;
    } catch (error) {
      this.logger.error('Upsert failed:', error);
      throw error;
    }
  }
}

module.exports = UserService;
