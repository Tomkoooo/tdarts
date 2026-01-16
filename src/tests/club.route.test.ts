import { GET as getClub, POST as updateClub } from '@/app/api/clubs/route';
import { POST as addMember } from '@/app/api/clubs/[clubId]/addMember/route';
import { POST as removeMember } from '@/app/api/clubs/[clubId]/removeMember/route';
import { POST as addModerator } from '@/app/api/clubs/[clubId]/addModerator/route';
import { POST as removeModerator } from '@/app/api/clubs/[clubId]/removeModerator/route';
import { POST as addTournamentPlayer } from '@/app/api/clubs/[clubId]/addTournamentPlayer/route';
import { POST as removeTournamentPlayer } from '@/app/api/clubs/[clubId]/removeTournamentPlayer/route';
import { POST as deactivateClub } from '@/app/api/clubs/[clubId]/deactivate/route';
import { GET as getUserRole } from '@/app/api/clubs/user/role/route';
import { GET as searchUsers } from '@/app/api/clubs/search/route';
import { ClubService } from '@/database/services/club.service';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { AuthorizationError } from '@/middleware/errorHandle';

import { AuthorizationService } from '@/database/services/authorization.service';

jest.mock('@/database/services/club.service');
jest.mock('@/database/services/authorization.service');

describe('Club Routes', () => {
  beforeAll(async () => {
    await connectToDatabase();
  }, 20000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await ClubModel.deleteMany({});
  });

  describe('GET /api/clubs', () => {
    it('should get club details', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        description: 'A test club',
        location: 'Test City',
        members: [{ _id: new Types.ObjectId().toString(), name: 'Test User', username: 'test_user' }],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.getClub as jest.Mock).mockResolvedValue(mockClub);

      const url = `http://localhost:3000/api/clubs?clubId=${mockClub._id}`;
      const request = new NextRequest(url, {
        method: 'GET',
      });

      const response = await getClub(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing clubId', async () => {
      const request = new NextRequest('http://localhost:3000/api/clubs', {
        method: 'GET',
      });

      const response = await getClub(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'clubId is required' });
    }, 20000);

    it('should return 500 if club not found', async () => {
      (ClubService.getClub as jest.Mock).mockRejectedValue(new Error('Club not found'));

      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs?clubId=${clubId}`, {
        method: 'GET',
      });

      const response = await getClub(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toMatchObject({ error: 'Internal server error' });
    }, 20000);
  });

  describe('POST /api/clubs', () => {
    it('should update club details', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'UpdatedClub',
        description: 'Updated description',
        location: 'Updated City',
        members: [],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.updateClub as jest.Mock).mockResolvedValue(mockClub);

      const request = new NextRequest('http://localhost:3000/api/clubs', {
        method: 'POST',
        body: JSON.stringify({
          userId: mockClub.admin[0],
          updates: {
            _id: mockClub._id,
            name: 'UpdatedClub',
            description: 'Updated description',
            location: 'Updated City',
          },
        }),
      });

      const response = await updateClub(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 500 for missing admin roles for updates or club not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/clubs', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await updateClub(request);
      const json = await response.json();
      console.log(response)

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'userId and updates are required' });
    }, 20000);

    it('should return 403 if update fails due to missing permission', async () => {
      (ClubService.updateClub as jest.Mock).mockRejectedValue(new AuthorizationError('Only admins can update club details'));

      const request = new NextRequest('http://localhost:3000/api/clubs', {
        method: 'POST',
        body: JSON.stringify({
          userId: new Types.ObjectId().toString(),
          updates: { _id: new Types.ObjectId().toString(), name: 'UpdatedClub' },
        }),
      });

      const response = await updateClub(request);
      const json = await response.json();
      console.log(response)

      expect(response.status).toBe(403);
      expect(json).toMatchObject({ error: 'Only admins can update club details' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/addMember', () => {
    it('should add a member', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [new Types.ObjectId().toString()],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.addMember as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/addMember`, {
        method: 'POST',
        body: JSON.stringify({
          userId: new Types.ObjectId().toString(),
        }),
      });

      const response = await addMember(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing userId', async () => {
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(new Types.ObjectId().toString());
      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/${clubId}/addMember`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await addMember(request, { params: Promise.resolve({ clubId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'userId is required' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/removeMember', () => {
    it('should remove a member', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.removeMember as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/removeMember`, {
        method: 'POST',
        body: JSON.stringify({
          userId: new Types.ObjectId().toString(),
        }),
      });

      const response = await removeMember(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing userId', async () => {
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(new Types.ObjectId().toString());
      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/${clubId}/removeMember`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await removeMember(request, { params: Promise.resolve({ clubId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'userId is required' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/addModerator', () => {
    it('should add a moderator', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [new Types.ObjectId().toString()],
        admin: [new Types.ObjectId().toString()],
        moderators: [new Types.ObjectId().toString()],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.addModerator as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/addModerator`, {
        method: 'POST',
        body: JSON.stringify({
          userId: new Types.ObjectId().toString(),
        }),
      });

      const response = await addModerator(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing userId', async () => {
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(new Types.ObjectId().toString());
      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/${clubId}/addModerator`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await addModerator(request, { params: Promise.resolve({ clubId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'userId is required' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/removeModerator', () => {
    it('should remove a moderator', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [new Types.ObjectId().toString()],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.removeModerator as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/removeModerator`, {
        method: 'POST',
        body: JSON.stringify({
          userId: new Types.ObjectId().toString(),
        }),
      });

      const response = await removeModerator(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing userId', async () => {
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(new Types.ObjectId().toString());
      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/${clubId}/removeModerator`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await removeModerator(request, { params: Promise.resolve({ clubId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'userId is required' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/addTournamentPlayer', () => {
    it('should add a tournament player', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [{ _id: new Types.ObjectId().toString(), name: 'Guest Player' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.addTournamentPlayer as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/addTournamentPlayer`, {
        method: 'POST',
        body: JSON.stringify({
          playerName: 'Guest Player',
        }),
      });

      const response = await addTournamentPlayer(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing playerName', async () => {
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(new Types.ObjectId().toString());
      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/${clubId}/addTournamentPlayer`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await addTournamentPlayer(request, { params: Promise.resolve({ clubId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'playerName is required' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/removeTournamentPlayer', () => {
    it('should remove a tournament player', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      (ClubService.removeTournamentPlayer as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/removeTournamentPlayer`, {
        method: 'POST',
        body: JSON.stringify({
          playerName: 'Guest Player',
        }),
      });

      const response = await removeTournamentPlayer(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

    it('should return 400 for missing playerName', async () => {
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(new Types.ObjectId().toString());
      const clubId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/${clubId}/removeTournamentPlayer`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await removeTournamentPlayer(request, { params: Promise.resolve({ clubId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'playerName is required' });
    }, 20000);
  });

  describe('POST /api/clubs/[clubId]/deactivate', () => {
    it('should deactivate a club', async () => {
      const mockClub = {
        _id: new Types.ObjectId().toString(),
        name: 'TestClub',
        members: [],
        admin: [new Types.ObjectId().toString()],
        moderators: [],
        tournamentPlayers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: false,
      };
      (ClubService.deactivateClub as jest.Mock).mockResolvedValue(mockClub);
      (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockClub.admin[0]);
      
      const request = new NextRequest(`http://localhost:3000/api/clubs/${mockClub._id}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await deactivateClub(request, { params: Promise.resolve({ clubId: mockClub._id }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject(mockClub);
    }, 20000);

  });

  describe('GET /api/clubs/user/role', () => {
    it('should get user role in club', async () => {
      (ClubService.getUserRoleInClub as jest.Mock).mockResolvedValue('admin');

      const clubId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const request = new NextRequest(`http://localhost:3000/api/clubs/user/role?clubId=${clubId}&userId=${userId}`, {
        method: 'GET',
      });

      const response = await getUserRole(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({ role: 'admin' });
    }, 20000);

    it('should return 400 for missing clubId or userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/clubs/user/role', {
        method: 'GET',
      });

      const response = await getUserRole(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'clubId and userId are required' });
    }, 20000);
  });

  describe('GET /api/clubs/search', () => {
    it('should search users', async () => {
      const mockUsers = [
        { _id: new Types.ObjectId().toString(), name: 'User One', username: 'user_one' },
        { _id: new Types.ObjectId().toString(), name: 'User Two', username: 'user_two' },
      ];
      (ClubService.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/clubs/search?query=user', {
        method: 'GET',
      });

      const response = await searchUsers(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({ players: mockUsers });
    }, 20000);

    it('should return 400 for missing query', async () => {
      const request = new NextRequest('http://localhost:3000/api/clubs/search', {
        method: 'GET',
      });

      const response = await searchUsers(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'query is required' });
    }, 20000);
  });
});