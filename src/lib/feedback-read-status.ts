export type FeedbackMessageLike = {
  sender?: unknown;
  content?: string;
  createdAt?: Date | string;
  isInternal?: boolean;
};

export function getSenderIdString(sender: unknown): string | null {
  if (sender == null || sender === '') return null;
  if (typeof sender === 'string') return sender;
  if (typeof sender === 'object' && sender !== null && '_id' in sender) {
    const id = (sender as { _id?: unknown })._id;
    return id != null ? String(id) : null;
  }
  return null;
}

export function getLastNonSystemMessage<T extends FeedbackMessageLike>(
  messages: T[] | undefined | null
): T | null {
  if (!messages?.length) return null;
  const withSender = messages.filter((m) => getSenderIdString(m.sender) != null);
  if (withSender.length === 0) return null;
  return withSender[withSender.length - 1]!;
}

export function isMessageFromTicketUser(
  message: FeedbackMessageLike,
  ticketUserId: unknown
): boolean {
  const sid = getSenderIdString(message.sender);
  const uid =
    ticketUserId != null && typeof ticketUserId === 'object' && ticketUserId !== null && '_id' in ticketUserId
      ? String((ticketUserId as { _id: unknown })._id)
      : ticketUserId != null
        ? String(ticketUserId)
        : '';
  return Boolean(sid && uid && sid === uid);
}

/** Whose turn to "see" the latest thread state from the other party's perspective. */
export type FeedbackReadReceiptKind = 'user_message_pending_admin' | 'admin_message_pending_user';

export type FeedbackReadReceipt = {
  kind: FeedbackReadReceiptKind;
  /** Other party has seen the latest relevant message. */
  seenByOther: boolean;
};

/**
 * Derives read-receipt UI state from the last non-system message.
 * - Last from ticket user → "has support seen it?" → `isReadByAdmin`
 * - Last from support → "has user seen it?" → `isReadByUser`
 */
export function getFeedbackReadReceipt(
  messages: FeedbackMessageLike[] | undefined | null,
  ticketUserId: unknown,
  isReadByUser: boolean,
  isReadByAdmin: boolean
): FeedbackReadReceipt | null {
  const last = getLastNonSystemMessage(messages);
  if (!last) return null;
  if (isMessageFromTicketUser(last, ticketUserId)) {
    return { kind: 'user_message_pending_admin', seenByOther: Boolean(isReadByAdmin) };
  }
  return { kind: 'admin_message_pending_user', seenByOther: Boolean(isReadByUser) };
}
