import {
  getFeedbackReadReceipt,
  getLastNonSystemMessage,
  isMessageFromTicketUser,
} from '@/lib/feedback-read-status';

describe('feedback-read-status', () => {
  it('getLastNonSystemMessage skips messages without sender', () => {
    const messages = [
      { content: 'sys', sender: undefined },
      { content: 'hi', sender: 'u1' },
    ];
    expect(getLastNonSystemMessage(messages)?.content).toBe('hi');
  });

  it('isMessageFromTicketUser compares ticket owner id', () => {
    expect(isMessageFromTicketUser({ sender: { _id: 'abc' } }, { _id: 'abc' })).toBe(true);
    expect(isMessageFromTicketUser({ sender: { _id: 'abc' } }, { _id: 'other' })).toBe(false);
  });

  it('getFeedbackReadReceipt uses isReadByAdmin when last message is from user', () => {
    const messages = [{ content: 'from user', sender: 'user1' }];
    expect(getFeedbackReadReceipt(messages, 'user1', false, true)).toEqual({
      kind: 'user_message_pending_admin',
      seenByOther: true,
    });
    expect(getFeedbackReadReceipt(messages, 'user1', false, false)).toEqual({
      kind: 'user_message_pending_admin',
      seenByOther: false,
    });
  });

  it('getFeedbackReadReceipt uses isReadByUser when last message is from support', () => {
    const messages = [{ content: 'from admin', sender: 'admin1' }];
    expect(getFeedbackReadReceipt(messages, 'user1', true, true)).toEqual({
      kind: 'admin_message_pending_user',
      seenByOther: true,
    });
    expect(getFeedbackReadReceipt(messages, 'user1', false, true)).toEqual({
      kind: 'admin_message_pending_user',
      seenByOther: false,
    });
  });
});
