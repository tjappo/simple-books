import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRepository } from '../repositories';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private customerRepository: CustomerRepository) {}

    async create(userId: string, dto: CreateCustomerDto) {
        return this.customerRepository.create({
            user: { connect: { id: userId } },
            type: dto.type,
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            kvk: dto.kvk,
            btw: dto.btw,
        });
    }

    async findAll(userId: string) {
        return this.customerRepository.findMany({ userId });
    }

    async findOne(userId: string, id: string) {
        const customer = await this.customerRepository.findByIdAndUserId(id, userId);
        if (!customer) {
            throw new NotFoundException('Customer not found');
        }
        return customer;
    }

    async update(userId: string, id: string, dto: UpdateCustomerDto) {
        await this.findOne(userId, id); // Ensure customer exists and belongs to user
        return this.customerRepository.update(
            { id },
            {
                type: dto.type,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                kvk: dto.kvk,
                btw: dto.btw,
            },
        );
    }

    async remove(userId: string, id: string) {
        await this.findOne(userId, id); // Ensure customer exists and belongs to user
        return this.customerRepository.delete({ id });
    }
}
