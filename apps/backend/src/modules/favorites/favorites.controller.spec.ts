import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let service: {
    getFavorites: ReturnType<typeof vi.fn>;
    getFavoriteIds: ReturnType<typeof vi.fn>;
    addFavorite: ReturnType<typeof vi.fn>;
    removeFavorite: ReturnType<typeof vi.fn>;
  };

  const mockUser: AuthenticatedUser = {
    id: 'u-1',
    phone: '+998901234567',
    role: 'CLIENT',
  };

  beforeEach(() => {
    service = {
      getFavorites: vi.fn(),
      getFavoriteIds: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
    };
    controller = new FavoritesController(service as unknown as FavoritesService);
  });

  it('getFavorites chaqirilganda service.getFavorites natijasini qaytaradi', async () => {
    service.getFavorites.mockResolvedValueOnce([{ id: 'm-1' }]);
    const result = await controller.getFavorites(mockUser);
    expect(service.getFavorites).toHaveBeenCalledWith('u-1');
    expect(result).toEqual([{ id: 'm-1' }]);
  });

  it('getFavoriteIds chaqirilganda service.getFavoriteIds natijasini qaytaradi', async () => {
    service.getFavoriteIds.mockResolvedValueOnce(['m-1']);
    const result = await controller.getFavoriteIds(mockUser);
    expect(service.getFavoriteIds).toHaveBeenCalledWith('u-1');
    expect(result).toEqual(['m-1']);
  });

  it('addFavorite chaqirilganda service.addFavorite natijasini qaytaradi', async () => {
    service.addFavorite.mockResolvedValueOnce({ masterId: 'm-1', isFavorite: true });
    const result = await controller.addFavorite(mockUser, 'm-1');
    expect(service.addFavorite).toHaveBeenCalledWith('u-1', 'm-1');
    expect(result).toEqual({ masterId: 'm-1', isFavorite: true });
  });

  it('removeFavorite chaqirilganda service.removeFavorite natijasini qaytaradi', async () => {
    service.removeFavorite.mockResolvedValueOnce({ masterId: 'm-1', isFavorite: false });
    const result = await controller.removeFavorite(mockUser, 'm-1');
    expect(service.removeFavorite).toHaveBeenCalledWith('u-1', 'm-1');
    expect(result).toEqual({ masterId: 'm-1', isFavorite: false });
  });
});
