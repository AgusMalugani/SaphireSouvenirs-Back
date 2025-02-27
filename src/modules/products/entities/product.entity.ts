import { CardsEnum } from "src/enums/cards.enum";
import { Category } from "src/modules/categories/entities/category.entity";
import { Orderdetail } from "src/modules/orderdetails/entities/orderdetail.entity";
import { Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Product {
@PrimaryGeneratedColumn("uuid")
id: string
name:string
price:number
img_url:string
details:string
stock:number
card: CardsEnum
@ManyToMany(()=>Category,(category)=>category.products)
categories:Category[]
@ManyToMany(()=>Orderdetail,(orderDet)=>orderDet.products)
orderDetail:Orderdetail[]

}
