import type { User } from '#modules/users/domain/user.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

export class ListUsers {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<User[]> {
    return this.userRepository.findAll();
  }
}
