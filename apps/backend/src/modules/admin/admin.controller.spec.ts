import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminController } from './admin.controller.js';
import type { AdminService } from './admin.service.js';
import type { AdminStatsService } from './admin-stats.service.js';
import type { ReviewsService } from '../reviews/reviews.service.js';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: {
    listUsers: ReturnType<typeof vi.fn>;
    setUserBlocked: ReturnType<typeof vi.fn>;
    listPendingMasters: ReturnType<typeof vi.fn>;
    setMasterVerified: ReturnType<typeof vi.fn>;
    listOrders: ReturnType<typeof vi.fn>;
  };
  let statsService: {
    getDashboard: ReturnType<typeof vi.fn>;
  };
  let reviewsService: {
    listForAdmin: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    adminService = {
      listUsers: vi.fn(),
      setUserBlocked: vi.fn(),
      listPendingMasters: vi.fn(),
      setMasterVerified: vi.fn(),
      listOrders: vi.fn(),
    };
    statsService = {
      getDashboard: vi.fn(),
    };
    reviewsService = {
      listForAdmin: vi.fn(),
      remove: vi.fn(),
    };

    controller = new AdminController(
      adminService as unknown as AdminService,
      statsService as unknown as AdminStatsService,
      reviewsService as unknown as ReviewsService,
    );
  });

  describe('listReviews', () => {
    it('reviewsService.listForAdmin ni chaqiradi va natijani qaytaradi', async () => {
      const mockResult = {
        items: [
          {
            id: 'rv-1',
            masterId: 'm-1',
            masterName: 'Ali Valiyev',
            masterPhone: '+998901112233',
            userId: 'u-1',
            userName: 'Sardor',
            userPhone: '+998909998877',
            rating: 5,
            comment: 'Ajoyib usta',
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      reviewsService.listForAdmin.mockResolvedValueOnce(mockResult);

      const query = { masterId: 'm-1', rating: 5, page: 1, limit: 20 };
      const result = await controller.listReviews(query);

      expect(reviewsService.listForAdmin).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('removeReview', () => {
    it('reviewsService.remove ni chaqiradi va natijani qaytaradi', async () => {
      reviewsService.remove.mockResolvedValueOnce({ id: 'rv-1', masterId: 'm-1' });

      const result = await controller.removeReview('rv-1');

      expect(reviewsService.remove).toHaveBeenCalledWith('rv-1');
      expect(result).toEqual({ id: 'rv-1', masterId: 'm-1' });
    });
  });
});
