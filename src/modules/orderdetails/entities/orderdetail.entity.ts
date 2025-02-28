import { Order } from "src/modules/orders/entities/order.entity";
import { Product } from "src/modules/products/entities/product.entity";
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Orderdetail {
@PrimaryGeneratedColumn("uuid")
id:string
@Column()
theme:string
@Column()
nameClient:string
@Column()
nameForCard:string
@Column()
quantity: number
@Column()
subTotal:number
@Column()
numCel:string
@Column()
num2Cel?:string
@ManyToMany(()=>Product,(prod)=>prod.orderDetail)
products:Product[]
@ManyToOne(()=>Order,(order)=>order.orderDetails)
order:Order

}
