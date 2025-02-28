import { CardsEnum } from "src/enums/cards.enum";
import { Category } from "src/modules/categories/entities/category.entity";
import { Orderdetail } from "src/modules/orderdetails/entities/orderdetail.entity";
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Product {
@PrimaryGeneratedColumn("uuid")
id: string
@Column()
name:string
@Column()
price:number
@Column({default:"http://www.exampleImg.com"})
img_url?:string
@Column()
details:string
@Column()
stock:number
@Column({type:"enum",enum:CardsEnum})
card?: CardsEnum
@ManyToMany(()=>Category,(category)=>category.products)
categories:Category[]
@ManyToMany(()=>Orderdetail,(orderDet)=>orderDet.products)
orderDetail:Orderdetail[]

}
