import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteRepository } from './SQLiteRepository';
import { toPaise } from './money';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  }
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock the sqlite plugin
const mockRun = vi.fn().mockResolvedValue({ changes: { changes: 1 } });
const mockQuery = vi.fn().mockResolvedValue({ values: [] });
const mockExecute = vi.fn().mockResolvedValue({});
const mockInitWebStore = vi.fn().mockResolvedValue({});
const mockSaveToStore = vi.fn().mockResolvedValue({});

vi.mock('@capacitor-community/sqlite', () => {
  return {
    CapacitorSQLite: {},
    SQLiteConnection: class {
      initWebStore = mockInitWebStore;
      createConnection = vi.fn().mockResolvedValue({
        open: vi.fn(),
        execute: mockExecute,
        query: mockQuery,
        run: mockRun
      });
      saveToStore = mockSaveToStore;
    }
  };
});

describe('SQLiteRepository Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = {
      ...global.window,
      customElements: {
        get: vi.fn().mockReturnValue(true) // pretend jeep-sqlite is registered
      },
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      }
    } as any;
    global.document = {
      createElement: vi.fn().mockReturnValue({}),
      body: { appendChild: vi.fn() }
    } as any;
  });

  it('migrates from localStorage to SQLite correctly', async () => {
    const legacyState = {
      expenses: [{
        id: 'exp_1',
        amount: 250.50,
        person: 'Test Person',
        category: 'Food',
        description: 'Test Desc',
        source: 'account',
        createdAt: '2023-10-01T10:00:00Z',
        origin: 'manual'
      }],
      credits: [],
      categories: ['Food', 'TestCat'],
      monthlyBudget: 15000,
      budgetHistory: [],
      settings: { detectionEnabled: true }
    };

    (global.window.localStorage.getItem as any).mockReturnValue(JSON.stringify(legacyState));
    
    // query is called to check if categories table is empty
    mockQuery.mockResolvedValueOnce({ values: [{ count: 0 }] });

    const repo = new SQLiteRepository();
    await repo.init();

    // Check if paise conversion happened during migration
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO expenses'),
      expect.arrayContaining(['exp_1', 25050, 'Test Person', 'Food', 'Test Desc', 'account', '2023-10-01T10:00:00Z', 'manual', null])
    );

    // Check monthly budget migration
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO monthly_budget'),
      expect.arrayContaining([1500000]) // 15000 * 100
    );

    // Check category migration
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO categories'),
      expect.arrayContaining(['TestCat'])
    );
  });
});

describe('SQLiteRepository CRUD Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ values: [{ count: 1 }] }); // Not a fresh install
  });

  it('converts to paise when adding expense', async () => {
    const repo = new SQLiteRepository();
    await repo.init(); // Mock db connection is set up
    
    await repo.addExpense({
      id: 'exp_add',
      amount: 19.99,
      person: 'Amazon',
      category: 'Shopping',
      description: 'Book',
      source: 'account',
      createdAt: '2023-10-01T10:00:00Z',
      origin: 'manual'
    });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO expenses'),
      expect.arrayContaining([1999]) // 19.99 * 100
    );
  });

  it('throws on failed database write', async () => {
    mockRun.mockResolvedValueOnce({ changes: { changes: 0 } }); // Simulate no rows affected
    
    const repo = new SQLiteRepository();
    await repo.init();
    
    await expect(repo.addExpense({
      id: 'exp_fail',
      amount: 10,
      person: 'Test',
      category: 'Test',
      description: 'Test',
      source: 'cash',
      createdAt: '2023-10-01',
      origin: 'manual'
    })).rejects.toThrow("Failed to add expense");
  });
});
