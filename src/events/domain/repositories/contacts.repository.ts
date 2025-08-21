import { Contact } from '../entities/contact';

export interface ContactsRepository {
  findByWaPhone(waPhone: string): Promise<Contact | null>;
  findOrCreateByWaPhone(
    waPhone: string,
    displayName?: string | null,
    tz?: string,
  ): Promise<Contact>;
}
