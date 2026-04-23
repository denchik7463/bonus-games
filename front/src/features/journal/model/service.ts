import type { TestUser } from "@/lib/domain/types";
import { getJournal } from "@/src/features/journal/api/getJournal";
import { getJournalEntry } from "@/src/features/journal/api/getJournalEntry";
import { getJournalEvents, getJournalEventsByRoom } from "@/src/features/journal/api/getJournalEvents";
import { getMyJournal, getMyJournalEntry } from "@/src/features/journal/api/getMyJournal";
import { getMyJournalEvents } from "@/src/features/journal/api/getMyJournalEvents";
import { getMyWinStreak } from "@/src/features/journal/api/getMyWinStreak";
import { journalEntryToRound, journalEventsToAuditTrail } from "@/src/features/journal/model/mappers";
import type { JournalFilterParams } from "@/src/features/journal/model/types";

export const journalService = {
  async getJournal(params: JournalFilterParams = {}) {
    const entries = await getJournal(params);
    return entries.map((entry) => journalEntryToRound(entry));
  },

  async getJournalEntry(id: string) {
    const entry = await getJournalEntry(id);
    return journalEntryToRound(entry);
  },

  async getJournalEvents(id: string) {
    return getJournalEvents(id);
  },

  async getJournalEventsByRoom(roomId: string) {
    return getJournalEventsByRoom(roomId);
  },

  async getMyJournal(user: TestUser) {
    const entries = await getMyJournal();
    return entries.map((entry) => journalEntryToRound(entry, user));
  },

  async getMyJournalEntry(id: string, user: TestUser) {
    const entry = await getMyJournalEntry(id);
    return journalEntryToRound(entry, user);
  },

  async getRoundForUser(id: string, user: TestUser) {
    try {
      return await this.getMyJournalEntry(id, user);
    } catch {
      return this.getJournalEntry(id);
    }
  },

  async getMyJournalEvents(id: string) {
    const events = await getMyJournalEvents(id);
    return journalEventsToAuditTrail(events);
  },

  async getMyWinStreak() {
    return getMyWinStreak();
  }
};
