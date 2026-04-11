jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));

const findOneMock = jest.fn();

jest.mock('@tdarts/core', () => ({
  ...jest.requireActual('@tdarts/core'),
  TournamentModel: {
    findOne: (...args: unknown[]) => findOneMock(...args),
  },
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      isValidObjectId: jest.fn().mockReturnValue(false),
    },
    isValidObjectId: jest.fn().mockReturnValue(false),
  };
});

import { TournamentService } from '@tdarts/services';

function buildNullQuery() {
  const query: any = {
    populate: jest.fn(() => query),
    then: (resolve: (value: null) => unknown) => resolve(null),
  };
  return query;
}

describe('TournamentService.getTournament guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOneMock.mockImplementation(() => buildNullQuery());
  });

  it('does not attempt _id fallback for invalid object id', async () => {
    await expect(TournamentService.getTournament('user')).rejects.toThrow('Tournament not found');

    expect(findOneMock).toHaveBeenCalledTimes(1);
    expect(findOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tournamentId: 'user',
      })
    );
  });
});
