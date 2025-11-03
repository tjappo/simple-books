import { Injectable } from '@nestjs/common';
import { UserRepository, CompanyRepository } from '../repositories';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    private companyRepository: CompanyRepository,
  ) {}

  async findOrCreate(auth0Id: string, email: string, name?: string, picture?: string) {
    return this.userRepository.findOrCreate(auth0Id, email, name, picture);
  }

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findByAuth0Id(auth0Id: string) {
    return this.userRepository.findByAuth0Id(auth0Id);
  }

  async updateUser(id: string, data: {
    name?: string;
    email?: string;
    picture?: string;
  }) {
    return this.userRepository.update(id, data);
  }

  async getCompany(userId: string) {
    return this.companyRepository.findByUserId(userId);
  }

  async createOrUpdateCompany(userId: string, companyData: {
    name: string;
    kvk: string;
    btw: string;
    iban: string;
    address: string;
  }) {
    return this.companyRepository.upsert(
      { userId },
      {
        user: { connect: { id: userId } },
        ...companyData,
      },
      companyData,
    );
  }
}
