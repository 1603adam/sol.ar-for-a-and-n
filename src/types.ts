export interface DateMemory {
  id: string;
  title: string;
  date: string;
  location: string;
  photos: string[];
  story: string;
  secretNote?: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface CoupleInfo {
  partner1: string;
  partner2: string;
  startDate: string;
}
