import type { Nullable } from '#shared/domain/nullable.js';
import type { User } from '#modules/users/domain/user.js';

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<Nullable<User>>;
  findAll(): Promise<User[]>;
  countUsers(): Promise<number>;
}
