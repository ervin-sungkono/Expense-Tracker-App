export type PublicShareStatus = {
  spaceId: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  revokedAt: string | null;
};

export type PublicShareSpace = {
  id: string;
  name: string;
};

export type PublicShareCategory = {
  id: string;
  name: string;
  type: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
};

export type PublicShareTransaction = {
  id: string;
  date: string | null;
  amount: number;
  type: string | null;
  categoryId: string | null;
};

export type PublicShareBudget = {
  id: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  categoryId: string | null;
  repeat: unknown;
};

export type PublicSpaceSnapshot = {
  space: PublicShareSpace;
  categories: PublicShareCategory[];
  transactions: PublicShareTransaction[];
  budgets: PublicShareBudget[];
};
