import { Order } from "src/modules/orders/entities/order.entity";
import { Product } from "src/modules/products/entities/product.entity";
import { Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Orderdetail {
@PrimaryGeneratedColumn("uuid")
id:string
theme:string
nameClient:string
nameForCard:string
quantity: number
subTotal:number
numCel:string
num2Cel?:string
@ManyToMany(()=>Product,(prod)=>prod.orderDetail)
products:Product[]
@ManyToOne(()=>Order,(order)=>order.orderDetails)
order:Order

}
