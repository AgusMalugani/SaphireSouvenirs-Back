import { Order } from "src/modules/orders/entities/order.entity";
import { Product } from "src/modules/products/entities/product.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Orderdetail {
@PrimaryGeneratedColumn("uuid")
id:string
@Column()
quantity: number
@Column()
subTotal:number
@ManyToOne(()=>Product,(prod)=>prod.orderDetails)
product:Product
@ManyToOne(()=>Order,(order)=>order.orderDetails)
order:Order

}
