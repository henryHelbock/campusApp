export type LostFoundType = 'lost' | 'found';

export type LostFoundStatus = 'active' | 'claimed' | 'resolved';

export interface LostFoundItem {
  id: number;
  type: LostFoundType;
  title: string;
  description: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  imageUrls: string[];
  status: LostFoundStatus;
  reporterId: number;
  createdAt: string;
}

export interface CreateLostFoundRequest {
  type: LostFoundType;
  title: string;
  description: string;
  category: string;
  latitude?: number;
  longitude?: number;
}
