import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderTimelineEventType } from '../enums/order-timeline-event-type.enum';
import { Order } from './order.entity';

@Entity()
export class OrderTimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'varchar' })
  type: OrderTimelineEventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  createdByUser?: User | null;
}
