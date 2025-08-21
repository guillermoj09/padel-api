import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactSchema } from './entities/contact.schema';
import { ContactsRepository } from '../../domain/repositories/contacts.repository';

@Injectable()
export class ContactsRepositoryTypeorm implements ContactsRepository {
  constructor(
    @InjectRepository(ContactSchema)
    private readonly repo: Repository<ContactSchema>,
  ) {}

  findByWaPhone(waPhone: string) {
    return this.repo.findOne({ where: { waPhone } });
  }

  async findOrCreateByWaPhone(
    waPhone: string,
    displayName: string | null = null,
    tz = 'America/Santiago',
  ) {
    // Upsert idempotente por unique(wa_phone)
    try {
      const res = await this.repo
        .createQueryBuilder()
        .insert()
        .into(ContactSchema)
        .values({ waPhone, displayName, tz })
        .onConflict(
          `("wa_phone") DO UPDATE SET display_name = EXCLUDED.display_name`,
        )
        .returning('*')
        .execute();
      return res.generatedMaps[0] as any;
    } catch {
      const found = await this.findByWaPhone(waPhone);
      if (found) return found as any;
      throw new Error('CONTACT_UPSERT_FAILED');
    }
  }
}
