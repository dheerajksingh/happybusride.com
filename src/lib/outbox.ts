import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type OutboxEventInput = {
  aggregate:   string;
  aggregateId: string;
  type:        string;
  payload:     Prisma.InputJsonValue;
};

/**
 * Record a domain event in the transactional outbox.
 *
 * MUST be called with a transaction client (the `tx` from
 * `prisma.$transaction(async (tx) => …)`) so the event commits atomically
 * with the data change. The event then exists if and only if the write
 * committed — no events on rollback, none lost on crash. A relay
 * (see `outbox-relay.ts`) publishes PENDING events afterwards.
 */
export function recordEvent(tx: Tx, e: OutboxEventInput) {
  return tx.outboxEvent.create({
    data: {
      aggregate:   e.aggregate,
      aggregateId: e.aggregateId,
      type:        e.type,
      payload:     e.payload,
    },
  });
}
